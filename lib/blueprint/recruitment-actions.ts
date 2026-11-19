"use server"

import { revalidatePath } from "next/cache"

import { resolveAll, type AnswerContext } from "@/lib/blueprint/answers"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import {
  RECRUIT_CONFIRM_MESSAGE,
  composeProposedStrategy,
  currentGrowthForRecruitment,
  parseRecruitDecisions,
  parseRecruitInputs,
} from "@/lib/blueprint/recruitment"
import { applyRecruitDecisions, emptyRecruitDecisions } from "@/lib/blueprint/recruitment-engine"
import {
  insertApprovedStrategy,
  loadRecruitmentRows,
  syncApprovedStrategiesToFingerprint,
  upsertDraftStrategy,
} from "@/lib/blueprint/recruitment-store"
import {
  getCurrentBlueprintAnswers,
  getCurrentCompanyGoals,
  getCurrentGrowthPlanning,
  getCurrentGrowthPlans,
  getCurrentTeamToday,
} from "@/lib/blueprint/queries"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveRecruitState = { error: string | null; savedAt: number | null }

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

async function loadRecruitContext(companyId: string) {
  const [goals, teamToday, answers, planning, planRows] = await Promise.all([
    getCurrentCompanyGoals(),
    getCurrentTeamToday(),
    getCurrentBlueprintAnswers(),
    getCurrentGrowthPlanning(),
    getCurrentGrowthPlans(),
  ])
  const context: AnswerContext = { goals, teamToday, answers }
  const resolved = resolveAll(context)
  const { growth } = currentGrowthForRecruitment(companyId, context, resolved, planning, planRows)
  return { context, resolved, growth }
}

async function currentProposal(formData: FormData) {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { ok: false as const, error: auth.error }
  const parsed = parseRecruitInputs(formData)
  if (!parsed.ok) return { ok: false as const, error: parsed.error }
  const { context, resolved, growth } = await loadRecruitContext(auth.membership.companyId)
  const composed = composeProposedStrategy(context, resolved, growth, parsed.value)
  return { ok: true as const, membership: auth.membership, composed, inputs: parsed.value }
}

export async function saveRecruitmentInputs(
  _prev: SaveRecruitState,
  formData: FormData,
): Promise<SaveRecruitState> {
  const ready = await currentProposal(formData)
  if (!ready.ok) return { error: ready.error, savedAt: null }
  const decisions = emptyRecruitDecisions()
  const effective = applyRecruitDecisions(ready.composed.proposed, decisions, ready.composed.analysisWarnings)
  const supabase = await createClient()
  await syncApprovedStrategiesToFingerprint(supabase, ready.membership.companyId, ready.composed.fingerprint)
  const saved = await upsertDraftStrategy(supabase, ready.membership.companyId, {
    fingerprint: ready.composed.fingerprint,
    inputs: ready.inputs,
    recommended: ready.composed.proposed,
    decisions,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("recruitment inputs", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruit")
  return { error: null, savedAt: Date.now() }
}

export async function saveRecruitmentDraft(
  _prev: SaveRecruitState,
  formData: FormData,
): Promise<SaveRecruitState> {
  const parsedDecisions = parseRecruitDecisions(formData)
  if (!parsedDecisions.ok) return { error: parsedDecisions.error, savedAt: null }
  const ready = await currentProposal(formData)
  if (!ready.ok) return { error: ready.error, savedAt: null }
  const effective = applyRecruitDecisions(
    ready.composed.proposed,
    parsedDecisions.value,
    ready.composed.analysisWarnings,
  )
  const supabase = await createClient()
  await syncApprovedStrategiesToFingerprint(supabase, ready.membership.companyId, ready.composed.fingerprint)
  const saved = await upsertDraftStrategy(supabase, ready.membership.companyId, {
    fingerprint: ready.composed.fingerprint,
    inputs: ready.inputs,
    recommended: ready.composed.proposed,
    decisions: parsedDecisions.value,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("recruitment draft", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruit")
  return { error: null, savedAt: Date.now() }
}

export async function approveRecruitmentStrategy(
  _prev: SaveRecruitState,
  formData: FormData,
): Promise<SaveRecruitState> {
  if (formData.get("confirmApproval") !== "1") {
    return { error: RECRUIT_CONFIRM_MESSAGE, savedAt: null }
  }
  const parsedDecisions = parseRecruitDecisions(formData)
  if (!parsedDecisions.ok) return { error: parsedDecisions.error, savedAt: null }
  const ready = await currentProposal(formData)
  if (!ready.ok) return { error: ready.error, savedAt: null }
  const effective = applyRecruitDecisions(
    ready.composed.proposed,
    parsedDecisions.value,
    ready.composed.analysisWarnings,
  )
  const supabase = await createClient()
  await syncApprovedStrategiesToFingerprint(supabase, ready.membership.companyId, ready.composed.fingerprint)
  const saved = await insertApprovedStrategy(supabase, ready.membership.companyId, {
    fingerprint: ready.composed.fingerprint,
    inputs: ready.inputs,
    recommended: ready.composed.proposed,
    decisions: parsedDecisions.value,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("recruitment approve", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function startRecruitmentRevision(
  prev: SaveRecruitState,
  formData: FormData,
): Promise<SaveRecruitState> {
  void prev
  void formData
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const { context, resolved, growth } = await loadRecruitContext(auth.membership.companyId)
  const supabase = await createClient()
  const rows = await loadRecruitmentRows(supabase, auth.membership.companyId)
  const approved = rows.find((row) => row.status === "approved") ?? rows.find((row) => row.status === "needs_review")
  if (!approved) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const composed = composeProposedStrategy(context, resolved, growth, approved.inputs)
  const decisions =
    approved.sourceFingerprint === composed.fingerprint ? approved.decisions : emptyRecruitDecisions()
  const effective = applyRecruitDecisions(composed.proposed, decisions, composed.analysisWarnings)
  const saved = await upsertDraftStrategy(supabase, auth.membership.companyId, {
    fingerprint: composed.fingerprint,
    inputs: approved.inputs,
    recommended: composed.proposed,
    decisions,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("recruitment revise", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruit")
  return { error: null, savedAt: Date.now() }
}

export async function syncRecruitmentValidity(companyId: string): Promise<void> {
  const { context, resolved, growth } = await loadRecruitContext(companyId)
  const supabase = await createClient()
  const rows = await loadRecruitmentRows(supabase, companyId)
  const source = rows.find((row) => row.status === "approved") ?? rows.find((row) => row.status === "draft")
  if (!source) return
  const composed = composeProposedStrategy(context, resolved, growth, source.inputs)
  await syncApprovedStrategiesToFingerprint(supabase, companyId, composed.fingerprint)
}
