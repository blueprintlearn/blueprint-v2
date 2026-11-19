import { createHash } from "node:crypto"

import { type AnswerContext, type ResolvedAnswer } from "@/lib/blueprint/answers"
import { findingsGate, type FindingsGate } from "@/lib/blueprint/findings"
import {
  buildGrowthPlanning,
  overlayStaffingInputs,
  parseGrowthKind,
  parseWholeCount,
  type GrowthOwnerResponse,
  type GrowthPlanningInputs,
  type StoredGrowthPlanning,
} from "@/lib/blueprint/growth"
import { GROWTH_KIND_LABELS, GROWTH_RECOMMENDATION_KINDS } from "@/lib/blueprint/growth-engine"
import {
  applyOwnerDecisions,
  composeRecommendedGrowthPlan,
  emptyDecisions,
  GROWTH_PLAN_ROW_STATUSES,
  GROWTH_PLAN_STANCES,
  HIRE_PROFILES,
  type EffectiveGrowthPlan,
  type GrowthPlanContent,
  type GrowthPlanDecisions,
  type GrowthPlanRowStatus,
  type GrowthPlanStance,
  type GrowthPlanWarning,
  type HireProfile,
} from "@/lib/blueprint/growth-plan-engine"
import { snapshotFingerprint } from "@/lib/blueprint/review"
import { staffingInputsFromOnboarding } from "@/lib/blueprint/staffing"
import { analyzeStaffing } from "@/lib/blueprint/staffing-engine"

export const GROWTH_PLAN_PAGE_TITLE = "Growth plan"
export const GROWTH_PLAN_OPENING =
  "This is a personalized growth plan from the Blueprint you approved, your planning answers, and the recommended next step. You can change it. Approving it does not start recruiting and does not change saved goals."
export const GROWTH_PLAN_NEEDS_APPROVAL =
  "A growth plan uses the version you approve, plus planning answers. Approve your Blueprint first."
export const GROWTH_PLAN_STALE =
  "You changed an earlier answer, so this is no longer the approved Blueprint. Approve it again before this plan can be current. An older approved growth plan is kept for reference and is not used as the recruiting plan."
export const GROWTH_PLAN_REVIEW_CTA = "Review your Blueprint"
export const GROWTH_PLAN_NEEDS_REVIEW =
  "Planning information changed after you approved this plan. The version you approved is unchanged. Review the updated plan and approve it again before Blueprint treats it as current."
export const GROWTH_PLAN_APPROVED =
  "This growth plan is approved. It is read-only until you choose to revise it. Recruiting is not started from this page."
export const GROWTH_PLAN_COUNT_MESSAGE = "Enter a whole number of DJs from 0 to 9,999."
export const GROWTH_PLAN_STANCE_MESSAGE = "Choose accept, modify, or reject."
export const GROWTH_PLAN_MODIFY_MESSAGE = "Choose a hiring target and a recruiting preference."
export const GROWTH_PLAN_PROFILE_MESSAGE = "Choose beginner, experienced, or not specified."
export const GROWTH_PLAN_CONFIRM_MESSAGE = "Confirm that you have reviewed this plan before approving it."
export const GROWTH_PLAN_NOTE_MAX = 400
export const GROWTH_PLAN_NO_RECRUITING =
  "Approving this plan stores your decisions for a future recruiting system. It does not publish a job, send a message, or create an applicant."

export const HIRE_PROFILE_OPTIONS: { value: HireProfile; label: string }[] = [
  { value: "beginner", label: "Beginner DJs you can train" },
  { value: "experienced", label: "Experienced DJs who can lead sooner" },
  { value: "unspecified", label: "Not specified yet" },
]

export const GROWTH_PLAN_STANCE_OPTIONS: { value: GrowthPlanStance; label: string }[] = [
  { value: "accept", label: "Accept these recommendations" },
  { value: "modify", label: "Modify hiring or recruiting" },
  { value: "reject", label: "Reject these recommendations" },
]

export type StoredGrowthPlan = {
  id: string
  version: number
  status: GrowthPlanRowStatus
  sourceFingerprint: string
  recommended: GrowthPlanContent
  decisions: GrowthPlanDecisions
  warnings: GrowthPlanWarning[]
  approvedBy: string | null
  approvedAt: string | null
}

export type GrowthPlanView = {
  gate: FindingsGate
  fingerprint: string | null
  proposed: GrowthPlanContent | null
  effective: EffectiveGrowthPlan | null
  decisions: GrowthPlanDecisions
  draft: StoredGrowthPlan | null
  currentApproved: StoredGrowthPlan | null
  previousApproved: StoredGrowthPlan | null
  planStatus: "none" | "draft" | "approved" | "needs_review"
}

export function growthPlanSourceFingerprint(
  stage1Fingerprint: string,
  inputs: GrowthPlanningInputs,
  response: GrowthOwnerResponse | null,
): string {
  const payload = JSON.stringify({
    stage1: stage1Fingerprint,
    inputs: {
      typicalLeadCapacity: inputs.typicalLeadCapacity,
      targetAnnualBookings: inputs.targetAnnualBookings,
      expectedBookingsWithoutExpansion: inputs.expectedBookingsWithoutExpansion,
      closingRatePercent: inputs.closingRatePercent,
      trainingAvailability: inputs.trainingAvailability,
    },
    response: response
      ? { status: response.status, selectedKind: response.selectedKind, note: response.note }
      : null,
  })
  return createHash("sha256").update(payload).digest("hex")
}

export function parseHireProfile(raw: unknown): HireProfile | null {
  return typeof raw === "string" && (HIRE_PROFILES as readonly string[]).includes(raw) ? (raw as HireProfile) : null
}

export function parseGrowthPlanStance(raw: unknown): GrowthPlanStance | null {
  return typeof raw === "string" && (GROWTH_PLAN_STANCES as readonly string[]).includes(raw)
    ? (raw as GrowthPlanStance)
    : null
}

export function parseGrowthPlanRowStatus(raw: unknown): GrowthPlanRowStatus | null {
  return typeof raw === "string" && (GROWTH_PLAN_ROW_STATUSES as readonly string[]).includes(raw)
    ? (raw as GrowthPlanRowStatus)
    : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function decisionsFromUnknown(raw: unknown): GrowthPlanDecisions {
  const record = asRecord(raw)
  if (!record) return emptyDecisions()
  const stance = parseGrowthPlanStance(record.stance) ?? "accept"
  const hiring = parseWholeCount(record.hiringTarget)
  const note =
    typeof record.note === "string" && record.note.trim()
      ? record.note.trim().slice(0, GROWTH_PLAN_NOTE_MAX)
      : null
  return {
    stance,
    hiringTarget: hiring.ok ? hiring.value : null,
    hireProfile: parseHireProfile(record.hireProfile),
    recruitingKind: parseGrowthKind(record.recruitingKind),
    note,
  }
}

function countFromUnknown(raw: unknown): GrowthPlanContent["hiring"]["recommendedTarget"] {
  const record = asRecord(raw)
  if (!record) {
    return { status: "unavailable", value: null, explanation: "Not available.", missing: [] }
  }
  const status = record.status === "calculated" || record.status === "estimated" ? record.status : "unavailable"
  const parsed = typeof record.value === "number" && Number.isInteger(record.value) && record.value >= 0 ? record.value : null
  const missing = Array.isArray(record.missing) ? record.missing.filter((item): item is string => typeof item === "string") : []
  return {
    status,
    value: parsed,
    explanation: typeof record.explanation === "string" ? record.explanation : "",
    missing,
  }
}

export function recommendedFromUnknown(raw: unknown): GrowthPlanContent | null {
  const record = asRecord(raw)
  if (!record) return null
  const summary = asRecord(record.summary)
  const hiring = asRecord(record.hiring)
  const recruiting = asRecord(record.recruiting)
  const training = asRecord(record.training)
  const obstacle = asRecord(summary?.primaryObstacle)
  if (!summary || !hiring || !recruiting || !training || !obstacle) return null
  const kind = parseGrowthKind(obstacle.kind)
  const nextSteps = Array.isArray(record.nextSteps)
    ? record.nextSteps
        .map((step) => {
          const row = asRecord(step)
          if (!row || typeof row.text !== "string") return null
          return {
            text: row.text,
            source: row.source === "owner" ? ("owner" as const) : ("recommendation" as const),
          }
        })
        .filter((step): step is GrowthPlanContent["nextSteps"][number] => step !== null)
    : []
  return {
    summary: {
      staffing: typeof summary.staffing === "string" ? summary.staffing : "",
      demand: typeof summary.demand === "string" ? summary.demand : "",
      training: typeof summary.training === "string" ? summary.training : "",
      primaryObstacle: {
        kind,
        label: typeof obstacle.label === "string" ? obstacle.label : kind ? GROWTH_KIND_LABELS[kind] : "Not available yet",
        explanation: typeof obstacle.explanation === "string" ? obstacle.explanation : "",
        status: obstacle.status === "calculated" || obstacle.status === "estimated" ? obstacle.status : "unavailable",
      },
    },
    hiring: {
      recommendedTarget: countFromUnknown(hiring.recommendedTarget),
      recommendedProfile: parseHireProfile(hiring.recommendedProfile),
      explanation: typeof hiring.explanation === "string" ? hiring.explanation : "",
    },
    recruiting: {
      kind: parseGrowthKind(recruiting.kind),
      approach: typeof recruiting.approach === "string" ? recruiting.approach : "",
      notes: Array.isArray(recruiting.notes)
        ? recruiting.notes.filter((item): item is string => typeof item === "string")
        : [],
    },
    training: {
      canSupportBeginners:
        training.canSupportBeginners === true ? true : training.canSupportBeginners === false ? false : null,
      limitations: typeof training.limitations === "string" ? training.limitations : "",
      preparation: typeof training.preparation === "string" ? training.preparation : "",
    },
    nextSteps,
  }
}

export function warningsFromUnknown(raw: unknown): GrowthPlanWarning[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const record = asRecord(item)
      if (!record || typeof record.title !== "string" || typeof record.explanation !== "string") return null
      return { title: record.title, explanation: record.explanation }
    })
    .filter((item): item is GrowthPlanWarning => item !== null)
}

export function storedPlanFromRow(row: {
  id: string
  version: number
  status: string
  source_fingerprint: string
  recommended: unknown
  decisions: unknown
  warnings: unknown
  approved_by: string | null
  approved_at: string | null
}): StoredGrowthPlan | null {
  const status = parseGrowthPlanRowStatus(row.status)
  const recommended = recommendedFromUnknown(row.recommended)
  if (!status || !recommended) return null
  return {
    id: row.id,
    version: row.version,
    status,
    sourceFingerprint: row.source_fingerprint,
    recommended,
    decisions: decisionsFromUnknown(row.decisions),
    warnings: warningsFromUnknown(row.warnings),
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
  }
}

export function overlaidStaffing(resolved: readonly ResolvedAnswer[], inputs: GrowthPlanningInputs) {
  const onboarding = staffingInputsFromOnboarding(resolved)
  const leads = analyzeStaffing(onboarding).currentStaffing.independentLeadCount.value
  return analyzeStaffing(overlayStaffingInputs(onboarding, inputs, leads))
}

function typicalFrom(inputs: GrowthPlanningInputs): { value: number | null; estimated: boolean } {
  if (inputs.typicalLeadCapacity.state === "answered" || inputs.typicalLeadCapacity.state === "estimated") {
    return {
      value: inputs.typicalLeadCapacity.value,
      estimated: inputs.typicalLeadCapacity.state === "estimated",
    }
  }
  return { value: null, estimated: false }
}

export function composeProposedPlan(
  context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
  storedPlanning: StoredGrowthPlanning | null,
): { fingerprint: string; proposed: GrowthPlanContent; analysisWarnings: GrowthPlanWarning[] } | null {
  const planning = buildGrowthPlanning(context, resolved, storedPlanning)
  if (planning.gate !== "current" || !planning.analysis) return null
  const typical = typicalFrom(planning.inputs)
  const staffing = overlaidStaffing(resolved, planning.inputs)
  return {
    fingerprint: growthPlanSourceFingerprint(snapshotFingerprint(context), planning.inputs, planning.response),
    proposed: composeRecommendedGrowthPlan({
      analysis: planning.analysis,
      capacityGap: staffing.capacityGap,
      typicalLeadCapacity: typical.value,
      typicalEstimated: typical.estimated,
      training: planning.inputs.trainingAvailability.value,
      urgent: resolved.find((row) => row.key === "G3")?.value === "within_6_months",
    }),
    analysisWarnings: planning.analysis.conflicts.map((conflict) => ({
      title: conflict.title,
      explanation: conflict.explanation,
    })),
  }
}

export function buildGrowthPlanView(
  context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
  storedPlanning: StoredGrowthPlanning | null,
  rows: StoredGrowthPlan[],
): GrowthPlanView {
  const gate = findingsGate(context)
  const draft = rows.find((row) => row.status === "draft") ?? null
  const approved = rows.find((row) => row.status === "approved") ?? null
  const needsReview =
    rows.filter((row) => row.status === "needs_review").sort((left, right) => right.version - left.version)[0] ?? null
  const composed = composeProposedPlan(context, resolved, storedPlanning)

  if (!composed) {
    const previous = needsReview ?? approved ?? null
    return {
      gate,
      fingerprint: null,
      proposed: null,
      effective: null,
      decisions: emptyDecisions(),
      draft,
      currentApproved: null,
      previousApproved: previous,
      planStatus: previous?.status === "needs_review" ? "needs_review" : "none",
    }
  }

  const { fingerprint, proposed, analysisWarnings } = composed
  const currentApproved = approved && approved.sourceFingerprint === fingerprint ? approved : null
  const previousApproved = currentApproved ? null : (approved ?? needsReview)
  const matchingDraft = draft && draft.sourceFingerprint === fingerprint ? draft : null
  const recommended = currentApproved?.recommended ?? matchingDraft?.recommended ?? proposed
  const decisions = currentApproved?.decisions ?? matchingDraft?.decisions ?? emptyDecisions()
  const effective = applyOwnerDecisions(recommended, decisions, analysisWarnings)

  let planStatus: GrowthPlanView["planStatus"] = "none"
  if (currentApproved) planStatus = "approved"
  else if (previousApproved) planStatus = "needs_review"
  else if (draft) planStatus = "draft"

  return {
    gate,
    fingerprint,
    proposed: recommended,
    effective,
    decisions,
    draft,
    currentApproved,
    previousApproved,
    planStatus,
  }
}

export function parseGrowthPlanDecisions(form: {
  stance: unknown
  hiringTarget: unknown
  hireProfile: unknown
  recruitingKind: unknown
  note: unknown
}): { ok: true; value: GrowthPlanDecisions } | { ok: false; error: string } {
  const stance = parseGrowthPlanStance(form.stance)
  if (!stance) return { ok: false, error: GROWTH_PLAN_STANCE_MESSAGE }
  const noteRaw = String(form.note ?? "").trim()
  if (noteRaw.length > GROWTH_PLAN_NOTE_MAX) {
    return { ok: false, error: `Keep notes to ${GROWTH_PLAN_NOTE_MAX} characters.` }
  }
  if (stance !== "modify") {
    return {
      ok: true,
      value: {
        stance,
        hiringTarget: null,
        hireProfile: null,
        recruitingKind: null,
        note: noteRaw.length > 0 ? noteRaw : null,
      },
    }
  }
  const hiring = parseWholeCount(form.hiringTarget)
  if (!hiring.ok) return { ok: false, error: GROWTH_PLAN_COUNT_MESSAGE }
  if (hiring.value === null) return { ok: false, error: GROWTH_PLAN_COUNT_MESSAGE }
  const hireProfile = parseHireProfile(form.hireProfile)
  if (!hireProfile) return { ok: false, error: GROWTH_PLAN_PROFILE_MESSAGE }
  const recruitingKind = parseGrowthKind(form.recruitingKind)
  if (!recruitingKind || !(GROWTH_RECOMMENDATION_KINDS as readonly string[]).includes(recruitingKind)) {
    return { ok: false, error: GROWTH_PLAN_MODIFY_MESSAGE }
  }
  return {
    ok: true,
    value: {
      stance,
      hiringTarget: hiring.value,
      hireProfile,
      recruitingKind,
      note: noteRaw.length > 0 ? noteRaw : null,
    },
  }
}

export { emptyDecisions, findingsGate, GROWTH_KIND_LABELS, GROWTH_RECOMMENDATION_KINDS }
export type { EffectiveGrowthPlan, GrowthPlanContent, GrowthPlanDecisions, GrowthPlanWarning, HireProfile, GrowthPlanStance }
