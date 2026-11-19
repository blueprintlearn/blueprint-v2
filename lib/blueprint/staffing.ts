import { type AnswerContext, type ResolvedAnswer } from "@/lib/blueprint/answers"
import { findingsGate, type FindingsGate } from "@/lib/blueprint/findings"
import { moneyAmountFromUnknown } from "@/lib/blueprint/numbers"
import { T2_OPTIONS } from "@/lib/blueprint/team-today"
import {
  analyzeStaffing,
  emptyNumeric,
  type Calculation,
  type InputKind,
  type NumericInput,
  type OwnerDjFrequency,
  type StaffingEngineInput,
  type StaffingEngineResult,
} from "@/lib/blueprint/staffing-engine"

export const STAFFING_PAGE_TITLE = "Staffing & demand"
export const STAFFING_OPENING =
  "These numbers come from the Blueprint you approved. Blueprint explains what they mean and stops when a required input is missing. Nothing here is a hiring decision."
export const STAFFING_NEEDS_APPROVAL =
  "Staffing and demand numbers come from the version you approve, not from guesses."
export const STAFFING_STALE =
  "You changed an earlier answer, so this is no longer the approved version. Approve your Blueprint again to see current staffing and demand numbers. Blueprint will not calculate from the old snapshot."
export const STAFFING_REVIEW_CTA = "Review your Blueprint"
export const STAFFING_NUMBERS_PRIVACY = "These numbers stay private to you."

export const STAFFING_NOT_COLLECTED = [
  {
    title: "Each lead DJ’s available annual event capacity",
    note: "Onboarding asked how many DJs can lead, not how many events each person can take. Blueprint does not assume 20, 30, or 40 events per DJ.",
  },
  {
    title: "A target for annual bookings",
    note: "Onboarding asked current event volume and an optional revenue target. It did not ask how many events you want to book next year. Revenue is not converted into a booking target.",
  },
  {
    title: "Closing rate",
    note: "Onboarding did not ask what share of qualified leads become bookings. Blueprint does not invent a closing percentage.",
  },
  {
    title: "Qualified lead volume",
    note: "Onboarding did not ask how many qualified leads you currently get.",
  },
  {
    title: "Average sale by pricing tier",
    note: "Onboarding asked one typical event price and where you sit in the market, not a price for each package.",
  },
] as const

export type StaffingAnalysisView = {
  gate: FindingsGate
  analysis: StaffingEngineResult | null
  baselineNote: string | null
  averageSaleNote: string | null
}

function kindFromResolved(state: ResolvedAnswer["state"], isEstimate: boolean): InputKind {
  if (state === "estimated" || isEstimate) return "estimated"
  if (state === "answered") return "present"
  if (state === "skipped") return "skipped"
  return "missing"
}

function rowOf(resolved: readonly ResolvedAnswer[], key: string): ResolvedAnswer | undefined {
  return resolved.find((row) => row.key === key)
}

function countFrom(resolved: readonly ResolvedAnswer[], key: string): NumericInput {
  const row = rowOf(resolved, key)
  if (!row || row.state === "not_applicable") return emptyNumeric("missing")
  if (row.state === "skipped") return emptyNumeric("skipped")
  if (row.state === "unanswered") return emptyNumeric("missing")
  if (typeof row.value !== "number" || !Number.isFinite(row.value) || row.value < 0) {
    return emptyNumeric("invalid")
  }
  return { value: row.value, kind: kindFromResolved(row.state, row.isEstimate) }
}

function ownerFrom(resolved: readonly ResolvedAnswer[]): {
  value: OwnerDjFrequency | null
  kind: InputKind
} {
  const row = rowOf(resolved, "T2")
  if (!row || row.state === "not_applicable" || row.state === "unanswered") {
    return { value: null, kind: "missing" }
  }
  if (row.state === "skipped") return { value: null, kind: "skipped" }
  if (row.value === "regularly" || row.value === "sometimes" || row.value === "no") {
    return { value: row.value, kind: kindFromResolved(row.state, row.isEstimate) }
  }
  return { value: null, kind: "invalid" }
}

function averageSalesFrom(resolved: readonly ResolvedAnswer[]): StaffingEngineInput["averageSales"] {
  const row = rowOf(resolved, "N3")
  if (!row || row.state === "skipped" || row.state === "unanswered" || row.state === "not_applicable") {
    return null
  }
  const parsed = moneyAmountFromUnknown(row.value)
  if (!parsed) return null
  return [
    {
      label: "Typical event price",
      amount: parsed.amount,
      estimated: row.state === "estimated" || row.isEstimate,
    },
  ]
}

export function staffingInputsFromOnboarding(
  resolved: readonly ResolvedAnswer[],
): StaffingEngineInput {
  const volume = countFrom(resolved, "E2")
  const owner = ownerFrom(resolved)
  return {
    teamDjCount: countFrom(resolved, "T1"),
    leadCapableCount: countFrom(resolved, "T3"),
    assistantOnlyCount: countFrom(resolved, "T1b"),
    ownerDjFrequency: owner.value,
    ownerDjFrequencyKind: owner.kind,
    annualEventVolume: volume,
    leadDjAnnualCapacities: null,
    targetAnnualBookings: emptyNumeric("missing"),
    expectedAnnualBookingsWithoutExpansion: volume,
    closingRatePercent: emptyNumeric("missing"),
    averageSales: averageSalesFrom(resolved),
  }
}

/**
 * Approval is checked before any calculation runs. Stale or unapproved
 * onboarding never reaches the engine.
 */
export function buildStaffingAnalysis(
  context: AnswerContext,
  resolved: readonly ResolvedAnswer[],
): StaffingAnalysisView {
  const gate = findingsGate(context)
  if (gate !== "current") {
    return { gate, analysis: null, baselineNote: null, averageSaleNote: null }
  }

  const inputs = staffingInputsFromOnboarding(resolved)
  return {
    gate,
    analysis: analyzeStaffing(inputs),
    baselineNote:
      "Expected annual bookings without expansion is the current yearly event volume you already recorded. That is an explicit baseline, not a growth target.",
    averageSaleNote: inputs.averageSales
      ? "Typical event price is one owner-reported amount. It is not a mix of package prices."
      : null,
  }
}

export function ownerInvolvementLabel(value: OwnerDjFrequency): string {
  return T2_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function calculationKind(result: Calculation<unknown>): "confirmed" | "estimated" | "missing" {
  if (result.status === "estimated") return "estimated"
  if (result.status === "calculated") return "confirmed"
  return "missing"
}

export { analyzeStaffing }
export type { Calculation, StaffingEngineInput, StaffingEngineResult }
