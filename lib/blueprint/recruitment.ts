import { createHash } from "node:crypto"

import { type AnswerContext, type ResolvedAnswer } from "@/lib/blueprint/answers"
import { parseWholeCount, storedGrowthFromRow } from "@/lib/blueprint/growth"
import { composeProposedPlan, storedPlanFromRow } from "@/lib/blueprint/growth-plan"
import {
  applyRecruitDecisions,
  composeRecruitStrategy,
  emptyRecruitDecisions,
  emptyRecruitInputs,
  NOTE_MAX,
  RECRUIT_CHANNELS,
  RECRUIT_EMPLOYMENT,
  RECRUIT_PROFILES,
  RECRUIT_REASONS,
  RECRUIT_ROW_STATUSES,
  RECRUIT_STANCES,
  RECRUIT_TRAINING,
  RECRUIT_URGENCIES,
  type BudgetInput,
  type CompensationInput,
  type EffectiveRecruitStrategy,
  type RecruitChannelId,
  type RecruitDecisions,
  type RecruitEmployment,
  type RecruitInputs,
  type RecruitProfile,
  type RecruitReason,
  type RecruitRowStatus,
  type RecruitStance,
  type RecruitStrategyContent,
  type RecruitTraining,
  type RecruitUrgency,
  type RecruitWarning,
  type Stage1RecruitFacts,
} from "@/lib/blueprint/recruitment-engine"
import {
  currentApprovedPlanForRecruitment,
  recruitmentHandoffFromApproved,
  type RecruitmentHandoff,
} from "@/lib/blueprint/recruitment-handoff"
import {
  AVAILABILITY_CODES,
  TRAVEL_CODES,
  codedListFromUnknown,
  coreValuesFromUnknown,
  parseBeginner,
  parseHiringWeight,
  parseTravel,
  qualitiesFromUnknown,
  skillRatingsFromUnknown,
  type AvailabilityCode,
  parseArrangement,
  type TravelCode,
} from "@/lib/blueprint/ideal-dj"

export const RECRUIT_PAGE_TITLE = "Recruiting"
export const RECRUIT_OPENING =
  "Decide who to recruit, how many people you need, and how to attract them. An approved growth plan is optional. Approving a strategy does not publish a job, send a message, or create an applicant."
export const RECRUIT_COUNT_MESSAGE = "Enter a whole number of people from 1 to 9,999."
export const RECRUIT_REASON_MESSAGE = "Choose why you are recruiting."
export const RECRUIT_STANCE_MESSAGE = "Choose accept or modify."
export const RECRUIT_CONFIRM_MESSAGE = "Confirm that you have reviewed this strategy before approving it."
export const RECRUIT_NO_ADS =
  "Approving this strategy stores your decisions for Stage 3.2. It does not publish a job ad, launch advertising, or contact anyone."
export const RECRUIT_NEEDS_REVIEW =
  "Information used to build this strategy changed after you approved it. The version you approved is unchanged. Review the updated strategy and approve it again before Blueprint treats it as current."
export const RECRUIT_APPROVED =
  "This recruiting strategy is approved. It is read-only until you choose to revise it. Job ads are not created from this page."
export const RECRUIT_STALE_GROWTH =
  "Your growth plan is no longer current, so it is not used as a recruiting recommendation."
export const RECRUIT_GROWTH_NONE =
  "You can recruit without completing a growth plan. Enter the hiring need below."
export const RECRUIT_GROWTH_OFFER =
  "A current approved growth plan has hiring recommendations you can use here. You can also enter different numbers."

export const RECRUIT_REASON_OPTIONS: { value: RecruitReason; label: string }[] = [
  { value: "growth", label: "Growth: we need additional DJs" },
  { value: "replacement", label: "Replacement: someone left or is leaving" },
  { value: "capacity", label: "Capacity or reliability: we need better coverage" },
]

export const RECRUIT_PROFILE_OPTIONS: { value: RecruitProfile; label: string }[] = [
  { value: "beginner", label: "Beginner DJs you can train" },
  { value: "experienced", label: "Experienced DJs who can lead sooner" },
  { value: "either", label: "Beginner or experienced" },
]

export const RECRUIT_URGENCY_OPTIONS: { value: RecruitUrgency; label: string }[] = [
  { value: "immediate", label: "As soon as possible" },
  { value: "soon", label: "In the next 1–3 months" },
  { value: "flexible", label: "Flexible timing" },
]

export const RECRUIT_EMPLOYMENT_OPTIONS: { value: RecruitEmployment; label: string }[] = [
  { value: "w2", label: "W-2 employees" },
  { value: "1099", label: "1099 contractors" },
  { value: "either", label: "W-2 or 1099, depending on the person" },
  { value: "unsure", label: "Not sure yet" },
]

export const RECRUIT_TRAINING_OPTIONS: { value: RecruitTraining; label: string }[] = [
  { value: "yes", label: "We can train new DJs" },
  { value: "limited", label: "Training time or people are limited" },
  { value: "no", label: "We cannot train in the next 12 months" },
  { value: "unsure", label: "Not sure yet" },
]

export const RECRUIT_BUDGET_OPTIONS: { value: BudgetInput["kind"]; label: string }[] = [
  { value: "none", label: "No advertising budget" },
  { value: "limited", label: "Keep spend limited" },
  { value: "set", label: "I have an amount in mind" },
  { value: "unsure", label: "Not sure yet" },
]

export const RECRUIT_COMPENSATION_OPTIONS: { value: CompensationInput["kind"]; label: string }[] = [
  { value: "not_provided", label: "Not sure yet" },
  { value: "hourly", label: "Hourly" },
  { value: "per_event", label: "Per event" },
  { value: "salary", label: "Annual salary" },
  { value: "range", label: "A range" },
]

export const RECRUIT_STANCE_OPTIONS: { value: RecruitStance; label: string }[] = [
  { value: "accept", label: "Accept this strategy" },
  { value: "modify", label: "Modify hiring or channels" },
]

export const RECRUIT_CHANNEL_OPTIONS: { value: RecruitChannelId; label: string }[] = [
  { value: "referrals", label: "Referrals from people you already know" },
  { value: "company_page", label: "A company recruiting page" },
  { value: "indeed", label: "Indeed" },
  { value: "social", label: "Social media" },
]

export type StoredRecruitStrategy = {
  id: string
  version: number
  status: RecruitRowStatus
  sourceFingerprint: string
  inputs: RecruitInputs
  recommended: RecruitStrategyContent
  decisions: RecruitDecisions
  warnings: RecruitWarning[]
  approvedBy: string | null
  approvedAt: string | null
}

export type RecruitView = {
  fingerprint: string
  growth: RecruitmentHandoff | null
  growthAvailable: boolean
  growthStale: boolean
  inputs: RecruitInputs
  proposed: RecruitStrategyContent | null
  effective: EffectiveRecruitStrategy | null
  decisions: RecruitDecisions
  draft: StoredRecruitStrategy | null
  currentApproved: StoredRecruitStrategy | null
  previousApproved: StoredRecruitStrategy | null
  planStatus: "none" | "draft" | "approved" | "needs_review"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function inList<T extends string>(raw: unknown, allowed: readonly T[]): T | null {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : null
}

export function stage1RecruitFacts(resolved: readonly ResolvedAnswer[]): Stage1RecruitFacts {
  const valueOf = (key: string) => resolved.find((row) => row.key === key)
  const answered = (key: string) => {
    const row = valueOf(key)
    return row && (row.state === "answered" || row.state === "estimated") ? row.value : null
  }
  const beginner = parseBeginner(answered("I6"))
  const hiringWeight = parseHiringWeight(answered("I7"))
  const travel = parseTravel(answered("I9"))
  const arrangement = parseArrangement(answered("I10"))
  return {
    priorities: qualitiesFromUnknown(answered("I3")),
    values: coreValuesFromUnknown(answered("I4")),
    skills: skillRatingsFromUnknown(answered("I5")),
    beginner: beginner.ok ? beginner.value : null,
    hiringWeight: hiringWeight.ok ? hiringWeight.value : null,
    availability: codedListFromUnknown(answered("I8"), AVAILABILITY_CODES),
    travel: travel.ok ? travel.value : null,
    arrangement: arrangement.ok ? arrangement.value : null,
  }
}

export function recruitmentSourceFingerprint(input: {
  facts: Stage1RecruitFacts
  growth: { id: string; version: number; fingerprint: string } | null
  inputs: RecruitInputs
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        facts: input.facts,
        growth: input.growth,
        inputs: input.inputs,
      }),
    )
    .digest("hex")
}

function parseMoney(raw: unknown): number | null {
  const parsed = parseWholeCount(raw)
  if (!parsed.ok || parsed.value === null || parsed.value < 1 || parsed.value > 999999) return null
  return parsed.value
}

export function compensationFromUnknown(raw: unknown): CompensationInput {
  const record = asRecord(raw)
  if (!record) return { kind: "not_provided" }
  const kind = record.kind
  if (kind === "hourly" || kind === "per_event" || kind === "salary") {
    const amount = parseMoney(record.amount)
    return amount === null ? { kind: "not_provided" } : { kind, amount }
  }
  if (kind === "range") {
    const min = parseMoney(record.min)
    const max = parseMoney(record.max)
    if (min === null || max === null || max < min) return { kind: "not_provided" }
    return { kind: "range", min, max }
  }
  return { kind: "not_provided" }
}

export function budgetFromUnknown(raw: unknown): BudgetInput {
  const record = asRecord(raw)
  const kind = record?.kind ?? raw
  if (kind === "none" || kind === "limited" || kind === "unsure") return { kind }
  if (kind === "set") {
    const amount = parseMoney(record?.amount)
    return amount === null ? { kind: "unsure" } : { kind: "set", amount }
  }
  return { kind: "unsure" }
}

export function inputsFromUnknown(raw: unknown): RecruitInputs {
  const record = asRecord(raw)
  if (!record) return emptyRecruitInputs()
  const availability = codedListFromUnknown(record.availability, AVAILABILITY_CODES)
  const travel = inList(record.travel, TRAVEL_CODES)
  const note =
    typeof record.note === "string" && record.note.trim()
      ? record.note.trim().slice(0, NOTE_MAX)
      : null
  const responsibilities =
    typeof record.responsibilities === "string" && record.responsibilities.trim()
      ? record.responsibilities.trim().slice(0, NOTE_MAX)
      : null
  const hiring = parseWholeCount(record.hiringTarget)
  return {
    reason: inList(record.reason, RECRUIT_REASONS),
    useGrowthPlan: record.useGrowthPlan === true,
    hiringTarget: hiring.ok ? hiring.value : null,
    hireProfile: inList(record.hireProfile, RECRUIT_PROFILES),
    responsibilities,
    availability,
    travel,
    employment: inList(record.employment, RECRUIT_EMPLOYMENT),
    compensation: compensationFromUnknown(record.compensation),
    urgency: inList(record.urgency, RECRUIT_URGENCIES),
    training: inList(record.training, RECRUIT_TRAINING),
    budget: budgetFromUnknown(record.budget),
    note,
  }
}

export function decisionsFromUnknown(raw: unknown): RecruitDecisions {
  const record = asRecord(raw)
  if (!record) return emptyRecruitDecisions()
  const hiring = parseWholeCount(record.hiringTarget)
  const channels = Array.isArray(record.channels)
    ? record.channels.filter((item): item is RecruitChannelId => inList(item, RECRUIT_CHANNELS) !== null)
    : null
  const note =
    typeof record.note === "string" && record.note.trim()
      ? record.note.trim().slice(0, NOTE_MAX)
      : null
  return {
    stance: inList(record.stance, RECRUIT_STANCES) ?? "accept",
    hiringTarget: hiring.ok ? hiring.value : null,
    hireProfile: inList(record.hireProfile, RECRUIT_PROFILES),
    channels: channels && channels.length > 0 ? channels : null,
    note,
  }
}

function itemFromUnknown(raw: unknown): RecruitStrategyContent["profile"]["required"][number] | null {
  const record = asRecord(raw)
  if (!record || typeof record.text !== "string") return null
  return {
    text: record.text,
    source: record.source === "owner" || record.source === "stage1" ? record.source : "recommendation",
    required: record.required === true,
  }
}

export function recommendedFromUnknown(raw: unknown): RecruitStrategyContent | null {
  const record = asRecord(raw)
  if (!record) return null
  const why = asRecord(record.why)
  const hiring = asRecord(record.hiring)
  const profile = asRecord(record.profile)
  const employment = asRecord(record.employment)
  const budget = asRecord(record.budget)
  if (!why || !hiring || !profile || !employment || !budget) return null
  const channels = Array.isArray(record.channels)
    ? record.channels
        .map((item) => {
          const row = asRecord(item)
          const id = inList(row?.id, RECRUIT_CHANNELS)
          if (!row || !id || typeof row.why !== "string") return null
          return {
            id,
            label: typeof row.label === "string" ? row.label : id,
            recommended: row.recommended === true,
            why: row.why,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
    : []
  const nextSteps = Array.isArray(record.nextSteps)
    ? record.nextSteps
        .map((item) => {
          const row = asRecord(item)
          if (!row || typeof row.text !== "string") return null
          return { text: row.text, source: row.source === "owner" ? ("owner" as const) : ("recommendation" as const) }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
    : []
  const values = Array.isArray(profile.values)
    ? profile.values
        .map((item) => {
          const row = asRecord(item)
          if (!row || typeof row.value !== "string" || typeof row.behavior !== "string" || typeof row.interviewQuestion !== "string") {
            return null
          }
          return { value: row.value, behavior: row.behavior, interviewQuestion: row.interviewQuestion }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
    : []
  const hiringTarget = typeof hiring.target === "number" && Number.isInteger(hiring.target) ? hiring.target : null
  return {
    why: {
      reason: inList(why.reason, RECRUIT_REASONS),
      explanation: typeof why.explanation === "string" ? why.explanation : "",
    },
    hiring: {
      target: hiringTarget,
      profile: inList(hiring.profile, RECRUIT_PROFILES),
      status:
        hiring.status === "from_growth_plan" || hiring.status === "owner" || hiring.status === "unavailable"
          ? hiring.status
          : "unavailable",
      explanation: typeof hiring.explanation === "string" ? hiring.explanation : "",
    },
    profile: {
      required: Array.isArray(profile.required)
        ? profile.required.map(itemFromUnknown).filter((row): row is NonNullable<typeof row> => row !== null)
        : [],
      preferred: Array.isArray(profile.preferred)
        ? profile.preferred.map(itemFromUnknown).filter((row): row is NonNullable<typeof row> => row !== null)
        : [],
      values,
    },
    employment: {
      arrangement: inList(employment.arrangement, RECRUIT_EMPLOYMENT),
      compensation: typeof employment.compensation === "string" ? employment.compensation : "",
      explanation: typeof employment.explanation === "string" ? employment.explanation : "",
    },
    channels,
    budget: {
      approach: typeof budget.approach === "string" ? budget.approach : "",
      estimated: budget.estimated === true,
    },
    nextSteps,
  }
}

export function warningsFromUnknown(raw: unknown): RecruitWarning[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const record = asRecord(item)
      if (!record || typeof record.title !== "string" || typeof record.explanation !== "string") return null
      return { title: record.title, explanation: record.explanation }
    })
    .filter((item): item is RecruitWarning => item !== null)
}

export function storedStrategyFromRow(row: {
  id: string
  version: number
  status: string
  source_fingerprint: string
  inputs: unknown
  recommended: unknown
  decisions: unknown
  warnings: unknown
  approved_by: string | null
  approved_at: string | null
}): StoredRecruitStrategy | null {
  const status = inList(row.status, RECRUIT_ROW_STATUSES)
  const recommended = recommendedFromUnknown(row.recommended)
  if (!status || !recommended) return null
  return {
    id: row.id,
    version: row.version,
    status,
    sourceFingerprint: row.source_fingerprint,
    inputs: inputsFromUnknown(row.inputs),
    recommended,
    decisions: decisionsFromUnknown(row.decisions),
    warnings: warningsFromUnknown(row.warnings),
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
  }
}

export function currentGrowthForRecruitment(
  companyId: string,
  context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
  planning: { inputs: unknown; recommendation_response: unknown } | null,
  planRows: {
    id: string
    version: number
    status: string
    source_fingerprint: string
    recommended: unknown
    decisions: unknown
    warnings: unknown
    approved_by: string | null
    approved_at: string | null
  }[],
): { growth: RecruitmentHandoff | null; stale: boolean } {
  const storedPlanning = storedGrowthFromRow(planning)
  const composedPlan = composeProposedPlan(context, resolved, storedPlanning)
  const storedPlans = planRows
    .map((row) => storedPlanFromRow(row))
    .filter((row): row is NonNullable<typeof row> => row !== null)
  const hadPlan = storedPlans.some((row) => row.status === "approved" || row.status === "needs_review")
  if (!composedPlan) return { growth: null, stale: hadPlan }
  const current = currentApprovedPlanForRecruitment(storedPlans, composedPlan.fingerprint)
  const growth = current
    ? recruitmentHandoffFromApproved(companyId, current, composedPlan.fingerprint)
    : null
  return { growth, stale: !growth && hadPlan }
}

export function composeProposedStrategy(
  _context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
  growth: RecruitmentHandoff | null,
  inputs: RecruitInputs,
): { fingerprint: string; proposed: RecruitStrategyContent; analysisWarnings: RecruitWarning[] } {
  const facts = stage1RecruitFacts(resolved)
  const usedGrowth =
    inputs.useGrowthPlan && growth
      ? { id: growth.planId, version: growth.version, fingerprint: `${growth.planId}:${growth.version}:${growth.approvedAt}` }
      : null
  const composed = composeRecruitStrategy({
    facts,
    growth: inputs.useGrowthPlan ? growth : null,
    inputs,
  })
  return {
    fingerprint: recruitmentSourceFingerprint({
      facts,
      growth: usedGrowth,
      inputs,
    }),
    proposed: composed.recommended,
    analysisWarnings: composed.warnings,
  }
}

export function buildRecruitView(
  context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
  growth: RecruitmentHandoff | null,
  rows: StoredRecruitStrategy[],
  options?: { fallbackInputs?: RecruitInputs; growthStale?: boolean },
): RecruitView {
  const draft = rows.find((row) => row.status === "draft") ?? null
  const approved = rows.find((row) => row.status === "approved") ?? null
  const needsReview =
    rows.filter((row) => row.status === "needs_review").sort((left, right) => right.version - left.version)[0] ?? null
  const inputs = draft?.inputs ?? approved?.inputs ?? options?.fallbackInputs ?? emptyRecruitInputs()
  const composed = composeProposedStrategy(context, resolved, growth, inputs)
  const { fingerprint, proposed, analysisWarnings } = composed
  const currentApproved = approved && approved.sourceFingerprint === fingerprint ? approved : null
  const previousApproved = currentApproved ? null : (approved ?? needsReview)
  const matchingDraft = draft && draft.sourceFingerprint === fingerprint ? draft : null
  const recommended = currentApproved?.recommended ?? matchingDraft?.recommended ?? proposed
  const decisions = currentApproved?.decisions ?? matchingDraft?.decisions ?? emptyRecruitDecisions()
  const effective = applyRecruitDecisions(recommended, decisions, currentApproved ? analysisWarnings : analysisWarnings)

  let planStatus: RecruitView["planStatus"] = "none"
  if (currentApproved) planStatus = "approved"
  else if (previousApproved) planStatus = "needs_review"
  else if (draft) planStatus = "draft"

  return {
    fingerprint,
    growth,
    growthAvailable: growth !== null,
    growthStale: options?.growthStale === true,
    inputs,
    proposed: recommended,
    effective,
    decisions,
    draft,
    currentApproved,
    previousApproved,
    planStatus,
  }
}

export function parseRecruitInputs(form: FormData): { ok: true; value: RecruitInputs } | { ok: false; error: string } {
  const reason = inList(form.get("reason"), RECRUIT_REASONS)
  if (!reason) return { ok: false, error: RECRUIT_REASON_MESSAGE }
  const hiring = parseWholeCount(form.get("hiringTarget"))
  if (!hiring.ok) return { ok: false, error: RECRUIT_COUNT_MESSAGE }
  if (hiring.value === 0) return { ok: false, error: RECRUIT_COUNT_MESSAGE }
  const hireProfile = inList(form.get("hireProfile"), RECRUIT_PROFILES)
  const travel = inList(form.get("travel"), TRAVEL_CODES)
  const availability = form
    .getAll("availability")
    .map(String)
    .filter((code): code is AvailabilityCode => (AVAILABILITY_CODES as readonly string[]).includes(code))
  const compensationKind = inList(String(form.get("compensationKind") ?? "not_provided"), [
    "not_provided",
    "hourly",
    "per_event",
    "salary",
    "range",
  ] as const)
  let compensation: CompensationInput = { kind: "not_provided" }
  if (compensationKind === "hourly" || compensationKind === "per_event" || compensationKind === "salary") {
    const amount = parseMoney(form.get("compensationAmount"))
    if (amount === null) return { ok: false, error: "Enter a whole-dollar compensation amount, or choose not sure yet." }
    compensation = { kind: compensationKind, amount }
  } else if (compensationKind === "range") {
    const min = parseMoney(form.get("compensationMin"))
    const max = parseMoney(form.get("compensationMax"))
    if (min === null || max === null || max < min) {
      return { ok: false, error: "Enter a whole-dollar compensation range, low then high." }
    }
    compensation = { kind: "range", min, max }
  }
  const budgetKind = inList(String(form.get("budgetKind") ?? "unsure"), ["none", "limited", "set", "unsure"] as const) ?? "unsure"
  let budget: BudgetInput = { kind: budgetKind === "set" ? "unsure" : budgetKind }
  if (budgetKind === "set") {
    const amount = parseMoney(form.get("budgetAmount"))
    if (amount === null) return { ok: false, error: "Enter a whole-dollar budget, or choose another budget option." }
    budget = { kind: "set", amount }
  }
  const noteRaw = String(form.get("note") ?? "").trim()
  if (noteRaw.length > NOTE_MAX) return { ok: false, error: `Keep notes to ${NOTE_MAX} characters.` }
  const responsibilities = String(form.get("responsibilities") ?? "").trim()
  if (responsibilities.length > NOTE_MAX) return { ok: false, error: `Keep responsibilities to ${NOTE_MAX} characters.` }
  return {
    ok: true,
    value: {
      reason,
      useGrowthPlan: form.get("useGrowthPlan") === "1",
      hiringTarget: hiring.value,
      hireProfile,
      responsibilities: responsibilities.length > 0 ? responsibilities : null,
      availability: availability.length > 0 ? availability : null,
      travel,
      employment: inList(form.get("employment"), RECRUIT_EMPLOYMENT),
      compensation,
      urgency: inList(form.get("urgency"), RECRUIT_URGENCIES),
      training: inList(form.get("training"), RECRUIT_TRAINING),
      budget,
      note: noteRaw.length > 0 ? noteRaw : null,
    },
  }
}

export function parseRecruitDecisions(form: FormData): { ok: true; value: RecruitDecisions } | { ok: false; error: string } {
  const stance = inList(form.get("stance"), RECRUIT_STANCES)
  if (!stance) return { ok: false, error: RECRUIT_STANCE_MESSAGE }
  const noteRaw = String(form.get("decisionNote") ?? "").trim()
  if (noteRaw.length > NOTE_MAX) return { ok: false, error: `Keep notes to ${NOTE_MAX} characters.` }
  if (stance !== "modify") {
    return {
      ok: true,
      value: { stance, hiringTarget: null, hireProfile: null, channels: null, note: noteRaw.length > 0 ? noteRaw : null },
    }
  }
  const hiring = parseWholeCount(form.get("decisionHiringTarget"))
  if (!hiring.ok || hiring.value === null || hiring.value < 1) return { ok: false, error: RECRUIT_COUNT_MESSAGE }
  const hireProfile = inList(form.get("decisionHireProfile"), RECRUIT_PROFILES)
  if (!hireProfile) return { ok: false, error: "Choose beginner, experienced, or either." }
  const channels = form
    .getAll("decisionChannels")
    .map(String)
    .filter((item): item is RecruitChannelId => inList(item, RECRUIT_CHANNELS) !== null)
  return {
    ok: true,
    value: {
      stance,
      hiringTarget: hiring.value,
      hireProfile,
      channels: channels.length > 0 ? channels : null,
      note: noteRaw.length > 0 ? noteRaw : null,
    },
  }
}

export { emptyRecruitDecisions, emptyRecruitInputs, RECRUIT_CHANNELS, RECRUIT_REASONS }
export type { AvailabilityCode, TravelCode }
export type {
  BudgetInput,
  CompensationInput,
  EffectiveRecruitStrategy,
  RecruitDecisions,
  RecruitInputs,
  RecruitStrategyContent,
  RecruitWarning,
}
