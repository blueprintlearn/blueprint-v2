import { type AnswerContext, type ResolvedAnswer } from "@/lib/blueprint/answers"
import { JOIN_CODES } from "@/lib/blueprint/development"
import { findingsGate, type FindingsGate } from "@/lib/blueprint/findings"
import { G3_CODES } from "@/lib/blueprint/questions"
import { OWNER_GOAL_CODES } from "@/lib/blueprint/goals"
import { BEGINNER_CODES, HIRING_WEIGHT_CODES } from "@/lib/blueprint/ideal-dj"
import { FINANCIAL_PRIORITY_CODES } from "@/lib/blueprint/numbers"
import {
  analyzeStaffing,
  emptyNumeric,
  type InputKind,
  type LeadDjCapacity,
  type NumericInput,
  type StaffingEngineInput,
} from "@/lib/blueprint/staffing-engine"
import { staffingInputsFromOnboarding } from "@/lib/blueprint/staffing"
import { T7_CODES, type T7Code } from "@/lib/blueprint/team-today"
import {
  GROWTH_KIND_LABELS,
  GROWTH_RECOMMENDATION_KINDS,
  OWNER_RESPONSE_STATUSES,
  TRAINING_AVAILABILITY_CODES,
  analyzeGrowth,
  emptyChoice,
  type ChoiceInput,
  type GrowthEngineResult,
  type GrowthRecommendationKind,
  type OwnerResponseStatus,
  type TrainingAvailability,
} from "@/lib/blueprint/growth-engine"

export const GROWTH_PAGE_TITLE = "Growth planning"
export const GROWTH_OPENING =
  "These follow-up answers stay separate from the Blueprint you approved. Blueprint uses them with that snapshot to explain the biggest obstacle to growth. This is not a final plan, and nothing here changes your saved goals."
export const GROWTH_NEEDS_APPROVAL =
  "Growth planning uses the version you approve, plus follow-up questions. Approve your Blueprint first."
export const GROWTH_STALE =
  "You changed an earlier answer, so this is no longer the approved version. Approve your Blueprint again before planning growth. Follow-up answers are not used until approval holds."
export const GROWTH_REVIEW_CTA = "Review your Blueprint"
export const GROWTH_NOT_A_PLAN =
  "Accepting, modifying, or rejecting a recommendation does not create a final growth plan. That comes later, and recruiting is not started from this page."
export const GROWTH_COUNT_MESSAGE = "Enter a whole number from 0 to 9,999."
export const GROWTH_RATE_MESSAGE = "Enter a closing rate greater than 0 and at most 100. Decimals are allowed."
export const GROWTH_TRAINING_MESSAGE = "Choose whether you can train new DJs in the next 12 months."
export const GROWTH_RESPONSE_MESSAGE = "Choose accept, modify, or reject."
export const GROWTH_MODIFY_KIND_MESSAGE = "Choose the next step you want instead."
export const GROWTH_NOTE_MAX = 400

export const TRAINING_AVAILABILITY_OPTIONS: { value: TrainingAvailability; label: string }[] = [
  { value: "yes", label: "Yes, we can train new DJs" },
  { value: "limited", label: "Limited training time or people" },
  { value: "no", label: "Not in the next 12 months" },
]

export const OWNER_RESPONSE_OPTIONS: { value: OwnerResponseStatus; label: string }[] = [
  { value: "accepted", label: "Accept this recommendation" },
  { value: "modified", label: "Modify it" },
  { value: "rejected", label: "Reject it" },
]

export const GROWTH_KIND_OPTIONS = GROWTH_RECOMMENDATION_KINDS.map((value) => ({
  value,
  label: GROWTH_KIND_LABELS[value],
}))

export type PlanningFieldState = "answered" | "estimated" | "skipped" | "missing"

export type PlanningNumericField = {
  value: number | null
  state: PlanningFieldState
}

export type PlanningChoiceField<T> = {
  value: T | null
  state: PlanningFieldState
}

export type GrowthPlanningInputs = {
  typicalLeadCapacity: PlanningNumericField
  targetAnnualBookings: PlanningNumericField
  expectedBookingsWithoutExpansion: PlanningNumericField
  closingRatePercent: PlanningNumericField
  trainingAvailability: PlanningChoiceField<TrainingAvailability>
}

export type GrowthOwnerResponse = {
  status: OwnerResponseStatus
  selectedKind: GrowthRecommendationKind | null
  note: string | null
}

export type StoredGrowthPlanning = {
  inputs: GrowthPlanningInputs
  response: GrowthOwnerResponse | null
}

export type GrowthPlanningView = {
  gate: FindingsGate
  analysis: GrowthEngineResult | null
  inputs: GrowthPlanningInputs
  response: GrowthOwnerResponse | null
}

export function emptyPlanningInputs(): GrowthPlanningInputs {
  return {
    typicalLeadCapacity: { value: null, state: "missing" },
    targetAnnualBookings: { value: null, state: "missing" },
    expectedBookingsWithoutExpansion: { value: null, state: "missing" },
    closingRatePercent: { value: null, state: "missing" },
    trainingAvailability: { value: null, state: "missing" },
  }
}

function kindFromPlanning(state: PlanningFieldState): InputKind {
  if (state === "estimated") return "estimated"
  if (state === "answered") return "present"
  if (state === "skipped") return "skipped"
  return "missing"
}

function numericFromPlanning(field: PlanningNumericField): NumericInput {
  if (field.state === "skipped") return emptyNumeric("skipped")
  if (field.state === "missing" || field.value === null) return emptyNumeric("missing")
  return { value: field.value, kind: kindFromPlanning(field.state) }
}

function choiceFromPlanning<T>(field: PlanningChoiceField<T>): ChoiceInput<T> {
  if (field.state === "skipped") return { value: null, kind: "skipped" }
  if (field.state === "missing" || field.value === null) return { value: null, kind: "missing" }
  return { value: field.value, kind: kindFromPlanning(field.state) }
}

function codedChoice<T extends string>(
  row: ResolvedAnswer | undefined,
  allowed: readonly T[],
): ChoiceInput<T> {
  if (!row || row.state === "not_applicable" || row.state === "unanswered") return emptyChoice()
  if (row.state === "skipped") return { value: null, kind: "skipped" }
  if (typeof row.value === "string" && (allowed as readonly string[]).includes(row.value)) {
    return { value: row.value as T, kind: row.state === "estimated" || row.isEstimate ? "estimated" : "present" }
  }
  return { value: null, kind: "invalid" }
}

function rowOf(resolved: readonly ResolvedAnswer[], key: string): ResolvedAnswer | undefined {
  return resolved.find((row) => row.key === key)
}

function countFrom(resolved: readonly ResolvedAnswer[], key: string): NumericInput {
  const row = rowOf(resolved, key)
  if (!row || row.state === "not_applicable") return emptyNumeric("missing")
  if (row.state === "skipped") return emptyNumeric("skipped")
  if (row.state === "unanswered") return emptyNumeric("missing")
  if (
    typeof row.value !== "number" ||
    !Number.isFinite(row.value) ||
    !Number.isInteger(row.value) ||
    row.value < 0
  ) {
    return emptyNumeric("invalid")
  }
  return {
    value: row.value,
    kind: row.state === "estimated" || row.isEstimate ? "estimated" : "present",
  }
}

function hiringReasonFrom(resolved: readonly ResolvedAnswer[]): ChoiceInput<T7Code> {
  const row = rowOf(resolved, "T7")
  if (!row || row.state === "not_applicable" || row.state === "unanswered") return emptyChoice()
  if (row.state === "skipped") return { value: null, kind: "skipped" }
  if (row.value && typeof row.value === "object" && !Array.isArray(row.value)) {
    const code = (row.value as { code?: unknown }).code
    if (typeof code === "string" && (T7_CODES as readonly string[]).includes(code)) {
      return { value: code as T7Code, kind: "present" }
    }
  }
  return { value: null, kind: "invalid" }
}

function capacitiesFromTypical(leadCount: number | null, typical: NumericInput): LeadDjCapacity[] | null {
  if (leadCount === null || leadCount <= 0) return null
  if (typical.kind === "missing" || typical.kind === "skipped" || typical.value === null) return null
  if (typical.kind === "invalid" || !Number.isInteger(typical.value) || typical.value < 0) return null
  const estimated = typical.kind === "estimated" || leadCount > 1
  return Array.from({ length: leadCount }, () => ({ annualEvents: typical.value as number, estimated }))
}

export function overlayStaffingInputs(
  onboarding: StaffingEngineInput,
  planning: GrowthPlanningInputs,
  independentLeadCount: number | null,
): StaffingEngineInput {
  const typical = numericFromPlanning(planning.typicalLeadCapacity)
  return {
    ...onboarding,
    leadDjAnnualCapacities: capacitiesFromTypical(independentLeadCount, typical),
    targetAnnualBookings: numericFromPlanning(planning.targetAnnualBookings),
    expectedAnnualBookingsWithoutExpansion: numericFromPlanning(planning.expectedBookingsWithoutExpansion),
    closingRatePercent: numericFromPlanning(planning.closingRatePercent),
  }
}

export function buildGrowthPlanning(
  context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
  stored: StoredGrowthPlanning | null,
): GrowthPlanningView {
  const gate = findingsGate(context)
  const inputs = stored?.inputs ?? emptyPlanningInputs()
  if (gate !== "current") {
    return { gate, analysis: null, inputs, response: stored?.response ?? null }
  }

  const onboarding = staffingInputsFromOnboarding(resolved)
  const facts = analyzeStaffing(onboarding)
  const leads = facts.currentStaffing.independentLeadCount.value
  const staffing = analyzeStaffing(overlayStaffingInputs(onboarding, inputs, leads))
  const goalRow = rowOf(resolved, "G1")
  const analysis = analyzeGrowth({
    staffing,
    desiredDjCount: countFrom(resolved, "T6"),
    targetAnnualBookings: numericFromPlanning(inputs.targetAnnualBookings),
    hiringReason: hiringReasonFrom(resolved),
    primaryGoal: codedChoice(goalRow, OWNER_GOAL_CODES),
    goalTimeline: codedChoice(rowOf(resolved, "G3"), G3_CODES),
    joinPath: codedChoice(rowOf(resolved, "D1"), JOIN_CODES),
    beginnerPreference: codedChoice(rowOf(resolved, "I6"), BEGINNER_CODES),
    hiringWeight: codedChoice(rowOf(resolved, "I7"), HIRING_WEIGHT_CODES),
    financialPriority: codedChoice(rowOf(resolved, "N8"), FINANCIAL_PRIORITY_CODES),
    trainingAvailability: choiceFromPlanning(inputs.trainingAvailability),
    typicalLeadCapacity: numericFromPlanning(inputs.typicalLeadCapacity),
  })

  return {
    gate,
    analysis,
    inputs,
    response: stored?.response ?? null,
  }
}

export function parseWholeCount(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  if (raw === null || raw === undefined || String(raw).trim() === "") return { ok: true, value: null }
  const trimmed = String(raw).trim()
  if (!/^\d+$/.test(trimmed)) return { ok: false }
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 9999) return { ok: false }
  return { ok: true, value: parsed }
}

export function parseClosingRate(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  if (raw === null || raw === undefined || String(raw).trim() === "") return { ok: true, value: null }
  const trimmed = String(raw).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { ok: false }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return { ok: false }
  return { ok: true, value: parsed }
}

export function parseTrainingAvailability(raw: unknown): TrainingAvailability | null {
  return typeof raw === "string" && (TRAINING_AVAILABILITY_CODES as readonly string[]).includes(raw)
    ? (raw as TrainingAvailability)
    : null
}

export function parseOwnerResponseStatus(raw: unknown): OwnerResponseStatus | null {
  return typeof raw === "string" && (OWNER_RESPONSE_STATUSES as readonly string[]).includes(raw)
    ? (raw as OwnerResponseStatus)
    : null
}

export function parseGrowthKind(raw: unknown): GrowthRecommendationKind | null {
  return typeof raw === "string" && (GROWTH_RECOMMENDATION_KINDS as readonly string[]).includes(raw)
    ? (raw as GrowthRecommendationKind)
    : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function numericFieldFromUnknown(raw: unknown, whole = false): PlanningNumericField {
  const record = asRecord(raw)
  if (!record) return { value: null, state: "missing" }
  const state = record.state
  if (state === "skipped") return { value: null, state: "skipped" }
  if (state === "missing") return { value: null, state: "missing" }
  if (state !== "answered" && state !== "estimated") return { value: null, state: "missing" }
  const parsed = typeof record.value === "number" ? record.value : Number(record.value)
  if (!Number.isFinite(parsed)) return { value: null, state: "missing" }
  if (whole && (!Number.isInteger(parsed) || parsed < 0 || parsed > 9999)) return { value: null, state: "missing" }
  return { value: parsed, state }
}

function choiceFieldFromUnknown<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): PlanningChoiceField<T> {
  const record = asRecord(raw)
  if (!record) return { value: null, state: "missing" }
  const state = record.state
  if (state === "skipped") return { value: null, state: "skipped" }
  if (state !== "answered" && state !== "estimated") return { value: null, state: "missing" }
  if (typeof record.value === "string" && (allowed as readonly string[]).includes(record.value)) {
    return { value: record.value as T, state }
  }
  return { value: null, state: "missing" }
}

export function planningInputsFromUnknown(raw: unknown): GrowthPlanningInputs {
  const record = asRecord(raw) ?? {}
  return {
    typicalLeadCapacity: numericFieldFromUnknown(record.typicalLeadCapacity, true),
    targetAnnualBookings: numericFieldFromUnknown(record.targetAnnualBookings, true),
    expectedBookingsWithoutExpansion: numericFieldFromUnknown(record.expectedBookingsWithoutExpansion, true),
    closingRatePercent: numericFieldFromUnknown(record.closingRatePercent),
    trainingAvailability: choiceFieldFromUnknown(record.trainingAvailability, TRAINING_AVAILABILITY_CODES),
  }
}

export function ownerResponseFromUnknown(raw: unknown): GrowthOwnerResponse | null {
  const record = asRecord(raw)
  if (!record) return null
  const status = parseOwnerResponseStatus(record.status)
  if (!status) return null
  const note =
    typeof record.note === "string" && record.note.trim()
      ? record.note.trim().slice(0, GROWTH_NOTE_MAX)
      : null
  return {
    status,
    selectedKind: status === "modified" ? parseGrowthKind(record.selectedKind) : null,
    note,
  }
}

export function storedGrowthFromRow(row: {
  inputs: unknown
  recommendation_response: unknown
} | null): StoredGrowthPlanning | null {
  if (!row) return null
  return {
    inputs: planningInputsFromUnknown(row.inputs),
    response: ownerResponseFromUnknown(row.recommendation_response),
  }
}

export { GROWTH_KIND_LABELS, GROWTH_RECOMMENDATION_KINDS }
export type { GrowthRecommendationKind, OwnerResponseStatus, TrainingAvailability }
