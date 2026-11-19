"use server"

import { revalidatePath } from "next/cache"

import { loadApplicantProfile } from "@/lib/blueprint/applicant-store"
import {
  parseDecisionForm,
  parseEvaluationForm,
  parseEvaluationTemplateForm,
  parseFollowUpForm,
  type SaveReviewState,
} from "@/lib/blueprint/candidate-review"
import {
  insertOwnerDecision,
  loadHumanEvaluation,
  resolveEvaluationCategories,
  saveApplicantFollowUp,
  saveEvaluationTemplate,
  saveHumanEvaluation,
} from "@/lib/blueprint/candidate-review-store"
import { nextHiringOutcomeCode, parseHiringOutcomeFields } from "@/lib/blueprint/hiring-workflow"
import { insertHiringOutcome, loadHiringOutcomes } from "@/lib/blueprint/hiring-workflow-store"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

async function requireGuidedOwnerMembership() {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { ok: false as const, error: OWNER_ONLY_MESSAGE }
  }
  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  return { ok: true as const, membership }
}

async function requireOwnerUser() {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return auth
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || typeof userId !== "string" || !userId) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  return { ok: true as const, membership: auth.membership, supabase, userId }
}

function revalidateApplicant(applicationId: string) {
  revalidatePath("/blueprint/applicants")
  revalidatePath(`/blueprint/applicants/${applicationId}`)
}

export async function saveEvaluationCategories(
  _prev: SaveReviewState,
  formData: FormData,
): Promise<SaveReviewState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const parsed = parseEvaluationTemplateForm(formData)
  if (!parsed.ok) return { error: parsed.error, savedAt: null }
  const supabase = await createClient()
  const saved = await saveEvaluationTemplate(supabase, auth.membership.companyId, parsed.template)
  if (saved.error) {
    console.error("evaluation template", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/applicants")
  revalidatePath("/blueprint/recruiting/scorecard")
  return { error: null, savedAt: Date.now() }
}

export async function saveApplicantEvaluation(
  _prev: SaveReviewState,
  formData: FormData,
): Promise<SaveReviewState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  if (!applicationId) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const existing = await loadHumanEvaluation(auth.supabase, auth.membership.companyId, applicationId)
  const categories =
    existing?.categories ??
    (await resolveEvaluationCategories(auth.supabase, auth.membership.companyId, profile.slug))
  const parsed = parseEvaluationForm(formData, categories)
  if (!parsed.ok) return { error: parsed.error, savedAt: null }
  const saved = await saveHumanEvaluation(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    categories,
    ratings: parsed.ratings,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("applicant evaluation", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function recordApplicantDecision(
  _prev: SaveReviewState,
  formData: FormData,
): Promise<SaveReviewState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseDecisionForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await insertOwnerDecision(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    decision: parsed.decision,
    reason: parsed.reason,
    fromStage: profile.stage,
    createdBy: auth.userId,
  })
  if (saved.error) {
    console.error("applicant decision", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  const outcomes = await loadHiringOutcomes(auth.supabase, auth.membership.companyId, applicationId)
  const latestOutcome = outcomes.at(-1)?.outcome ?? null
  const outcomeCode = nextHiringOutcomeCode(parsed.decision, latestOutcome)
  if (outcomeCode) {
    const outcomeFields =
      parsed.decision === "hired"
        ? parseHiringOutcomeFields(formData, profile.roleTitle)
        : {
            ok: true as const,
            intendedRole: outcomes.at(-1)?.intendedRole ?? profile.roleTitle,
            plannedStartDate: outcomes.at(-1)?.plannedStartDate ?? null,
            engagementModel: outcomes.at(-1)?.engagementModel ?? ("not_specified" as const),
            notes: parsed.reason,
          }
    if (!outcomeFields.ok) return { error: outcomeFields.error, savedAt: null }
    const outcome = await insertHiringOutcome(auth.supabase, {
      companyId: auth.membership.companyId,
      applicationId,
      applicantId: profile.applicantId,
      decisionId: saved.decisionId,
      outcome: outcomeCode,
      intendedRole: outcomeFields.intendedRole,
      plannedStartDate: outcomeFields.plannedStartDate,
      engagementModel: outcomeFields.engagementModel,
      notes: outcomeFields.notes,
      createdBy: auth.userId,
    })
    if (outcome.error) {
      console.error("hiring outcome", outcome.error)
      return { error: SAVE_FAILED_MESSAGE, savedAt: null }
    }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function saveApplicantFollowUpAction(
  _prev: SaveReviewState,
  formData: FormData,
): Promise<SaveReviewState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseFollowUpForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await saveApplicantFollowUp(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    action: parsed.action,
    dueOn: parsed.dueOn,
    status: parsed.status,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("applicant follow-up", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}
