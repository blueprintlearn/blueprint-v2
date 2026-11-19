"use server"

import { revalidatePath } from "next/cache"

import { resolveAll, type AnswerContext } from "@/lib/blueprint/answers"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { findingsGate } from "@/lib/blueprint/findings"
import { storedGrowthFromRow } from "@/lib/blueprint/growth"
import {
  GROWTH_PLAN_CONFIRM_MESSAGE,
  GROWTH_PLAN_NEEDS_APPROVAL,
  GROWTH_PLAN_STALE,
  composeProposedPlan,
  parseGrowthPlanDecisions,
} from "@/lib/blueprint/growth-plan"
import { applyOwnerDecisions, emptyDecisions } from "@/lib/blueprint/growth-plan-engine"
import {
  insertApprovedPlan,
  loadGrowthPlanRows,
  syncApprovedPlansToFingerprint,
  upsertDraftPlan,
} from "@/lib/blueprint/growth-plan-store"
import {
  getCurrentBlueprintAnswers,
  getCurrentCompanyGoals,
  getCurrentGrowthPlanning,
  getCurrentTeamToday,
} from "@/lib/blueprint/queries"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveGrowthPlanState = { error: string | null; savedAt: number | null }

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

async function loadPlanContext() {
  const [goals, teamToday, answers, planning] = await Promise.all([
    getCurrentCompanyGoals(),
    getCurrentTeamToday(),
    getCurrentBlueprintAnswers(),
    getCurrentGrowthPlanning(),
  ])
  const context: AnswerContext = { goals, teamToday, answers }
  return {
    context,
    resolved: resolveAll(context),
    storedPlanning: storedGrowthFromRow(planning),
  }
}

export async function syncGrowthPlanValidity(companyId: string): Promise<void> {
  const { context, resolved, storedPlanning } = await loadPlanContext()
  const composed = composeProposedPlan(context, resolved, storedPlanning)
  if (!composed) return
  const supabase = await createClient()
  await syncApprovedPlansToFingerprint(supabase, companyId, composed.fingerprint)
}

async function currentProposal() {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { ok: false as const, error: auth.error }
  const { context, resolved, storedPlanning } = await loadPlanContext()
  const gate = findingsGate(context)
  if (gate === "needs_approval") return { ok: false as const, error: GROWTH_PLAN_NEEDS_APPROVAL }
  if (gate === "stale") return { ok: false as const, error: GROWTH_PLAN_STALE }
  const composed = composeProposedPlan(context, resolved, storedPlanning)
  if (!composed) return { ok: false as const, error: GROWTH_PLAN_NEEDS_APPROVAL }
  return { ok: true as const, membership: auth.membership, composed }
}

function parseDecisionsFromForm(formData: FormData) {
  return parseGrowthPlanDecisions({
    stance: formData.get("stance"),
    hiringTarget: formData.get("hiringTarget"),
    hireProfile: formData.get("hireProfile"),
    recruitingKind: formData.get("recruitingKind"),
    note: formData.get("note"),
  })
}

export async function saveGrowthPlanDraft(
  _prev: SaveGrowthPlanState,
  formData: FormData,
): Promise<SaveGrowthPlanState> {
  const ready = await currentProposal()
  if (!ready.ok) return { error: ready.error, savedAt: null }
  const parsed = parseDecisionsFromForm(formData)
  if (!parsed.ok) return { error: parsed.error, savedAt: null }

  const supabase = await createClient()
  await syncApprovedPlansToFingerprint(supabase, ready.membership.companyId, ready.composed.fingerprint)
  const effective = applyOwnerDecisions(ready.composed.proposed, parsed.value, ready.composed.analysisWarnings)
  const saved = await upsertDraftPlan(supabase, ready.membership.companyId, {
    fingerprint: ready.composed.fingerprint,
    recommended: ready.composed.proposed,
    decisions: parsed.value,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("growth plan draft", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/growth-plan")
  return { error: null, savedAt: Date.now() }
}

export async function approveGrowthPlan(
  _prev: SaveGrowthPlanState,
  formData: FormData,
): Promise<SaveGrowthPlanState> {
  const ready = await currentProposal()
  if (!ready.ok) return { error: ready.error, savedAt: null }
  if (formData.get("confirmApproval") !== "1") {
    return { error: GROWTH_PLAN_CONFIRM_MESSAGE, savedAt: null }
  }
  const parsed = parseDecisionsFromForm(formData)
  if (!parsed.ok) return { error: parsed.error, savedAt: null }

  const supabase = await createClient()
  await syncApprovedPlansToFingerprint(supabase, ready.membership.companyId, ready.composed.fingerprint)
  const effective = applyOwnerDecisions(ready.composed.proposed, parsed.value, ready.composed.analysisWarnings)
  const saved = await insertApprovedPlan(supabase, ready.membership.companyId, {
    fingerprint: ready.composed.fingerprint,
    recommended: ready.composed.proposed,
    decisions: parsed.value,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("growth plan approve", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function startGrowthPlanRevision(
  _prev: SaveGrowthPlanState,
  formData: FormData,
): Promise<SaveGrowthPlanState> {
  const ready = await currentProposal()
  if (!ready.ok) return { error: ready.error, savedAt: null }

  const supabase = await createClient()
  const rows = await loadGrowthPlanRows(supabase, ready.membership.companyId)
  const approved = rows.find((row) => row.status === "approved")
  const decisions =
    approved && approved.sourceFingerprint === ready.composed.fingerprint ? approved.decisions : emptyDecisions()
  const parsed = parseGrowthPlanDecisions({
    stance: formData.get("stance") ?? decisions.stance,
    hiringTarget: formData.get("hiringTarget") ?? decisions.hiringTarget,
    hireProfile: formData.get("hireProfile") ?? decisions.hireProfile,
    recruitingKind: formData.get("recruitingKind") ?? decisions.recruitingKind,
    note: formData.get("note") ?? decisions.note,
  })
  const nextDecisions = parsed.ok ? parsed.value : decisions
  const effective = applyOwnerDecisions(ready.composed.proposed, nextDecisions, ready.composed.analysisWarnings)
  const saved = await upsertDraftPlan(supabase, ready.membership.companyId, {
    fingerprint: ready.composed.fingerprint,
    recommended: ready.composed.proposed,
    decisions: nextDecisions,
    warnings: effective.warnings,
  })
  if (saved.error) {
    console.error("growth plan revise", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/growth-plan")
  return { error: null, savedAt: Date.now() }
}
