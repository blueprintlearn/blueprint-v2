"use server"

import { revalidatePath } from "next/cache"

import { loadApplicantProfile } from "@/lib/blueprint/applicant-store"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import {
  parseAuditionForm,
  parseConversationForm,
  parseCustomHiringActivityForm,
  parseHiringActivityActionForm,
  parseHiringPathForm,
  type SaveHiringState,
} from "@/lib/blueprint/hiring-workflow"
import {
  ensureHiringWorkflow,
  insertCustomHiringActivity,
  saveApplicantAudition,
  saveApplicantConversation,
  updateHiringActivityStatus,
} from "@/lib/blueprint/hiring-workflow-store"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
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

export async function saveApplicantHiringPath(
  _prev: SaveHiringState,
  formData: FormData,
): Promise<SaveHiringState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseHiringPathForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await ensureHiringWorkflow(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    path: parsed.path,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("hiring path", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function updateApplicantHiringActivity(
  _prev: SaveHiringState,
  formData: FormData,
): Promise<SaveHiringState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseHiringActivityActionForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await updateHiringActivityStatus(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    activityId: parsed.activityId,
    activityKey: parsed.activityKey,
    title: parsed.title,
    intent: parsed.intent,
    skipReason: parsed.skipReason,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("hiring activity", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function addCustomHiringActivityAction(
  _prev: SaveHiringState,
  formData: FormData,
): Promise<SaveHiringState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseCustomHiringActivityForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await insertCustomHiringActivity(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    title: parsed.title,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("custom hiring activity", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function saveApplicantConversationAction(
  _prev: SaveHiringState,
  formData: FormData,
): Promise<SaveHiringState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseConversationForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await saveApplicantConversation(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    conversationId: parsed.conversationId,
    conversationType: parsed.conversationType,
    plannedAt: parsed.plannedAt,
    status: parsed.status,
    notes: parsed.notes,
    nextAction: parsed.nextAction,
    personResponsible: parsed.personResponsible,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("applicant conversation", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function saveApplicantAuditionAction(
  _prev: SaveHiringState,
  formData: FormData,
): Promise<SaveHiringState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseAuditionForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await saveApplicantAudition(auth.supabase, {
    companyId: auth.membership.companyId,
    applicationId,
    applicantId: profile.applicantId,
    auditionId: parsed.auditionId,
    title: parsed.title,
    description: parsed.description,
    skills: parsed.skills,
    scheduledAt: parsed.scheduledAt,
    locationOrFormat: parsed.locationOrFormat,
    evaluatorName: parsed.evaluatorName,
    status: parsed.status,
    notes: parsed.notes,
    skillRatings: parsed.skillRatings,
    updatedBy: auth.userId,
  })
  if (saved.error) {
    console.error("applicant audition", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}
