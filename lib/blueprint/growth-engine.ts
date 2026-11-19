/**
 * Deterministic growth-planning recommendations.
 *
 * Callers pass explicit Stage 1 facts, follow-up planning inputs, and a
 * staffing analysis. This module does not invent closing rates, DJ capacity,
 * or a forward-looking booking baseline. Historical event volume is never
 * treated as expected bookings without expansion.
 */

import {
  type Calculation,
  type InputKind,
  type NumericInput,
  type StaffingEngineResult,
} from "@/lib/blueprint/staffing-engine"
import type { JoinCode } from "@/lib/blueprint/development"
import type { G3Code } from "@/lib/blueprint/questions"
import type { OwnerGoalCode } from "@/lib/blueprint/goals"
import type { BeginnerCode, HiringWeightCode } from "@/lib/blueprint/ideal-dj"
import type { FinancialPriorityCode } from "@/lib/blueprint/numbers"
import type { T7Code } from "@/lib/blueprint/team-today"

export const GROWTH_RECOMMENDATION_KINDS = [
  "recruit",
  "demand",
  "utilize",
  "train",
  "experienced",
  "beginner",
] as const

export type GrowthRecommendationKind = (typeof GROWTH_RECOMMENDATION_KINDS)[number]

export const TRAINING_AVAILABILITY_CODES = ["yes", "limited", "no"] as const
export type TrainingAvailability = (typeof TRAINING_AVAILABILITY_CODES)[number]

export const OWNER_RESPONSE_STATUSES = ["accepted", "modified", "rejected"] as const
export type OwnerResponseStatus = (typeof OWNER_RESPONSE_STATUSES)[number]

export const HIGH_UTILIZATION = 0.85

export const GROWTH_KIND_LABELS: Record<GrowthRecommendationKind, string> = {
  recruit: "Recruit additional DJs",
  demand: "Increase booking demand before hiring",
  utilize: "Improve utilization of existing DJs",
  train: "Build training capacity before recruiting",
  experienced: "Recruit experienced DJs",
  beginner: "Recruit beginners you can train",
}

export type ChoiceInput<T> = {
  value: T | null
  kind: InputKind
}

export type GrowthEngineInput = {
  staffing: StaffingEngineResult
  desiredDjCount: NumericInput
  targetAnnualBookings: NumericInput
  hiringReason: ChoiceInput<T7Code>
  primaryGoal: ChoiceInput<OwnerGoalCode>
  goalTimeline: ChoiceInput<G3Code>
  joinPath: ChoiceInput<JoinCode>
  beginnerPreference: ChoiceInput<BeginnerCode>
  hiringWeight: ChoiceInput<HiringWeightCode>
  financialPriority: ChoiceInput<FinancialPriorityCode>
  trainingAvailability: ChoiceInput<TrainingAvailability>
  typicalLeadCapacity: NumericInput
}

export type GrowthRecommendation = Calculation<GrowthRecommendationKind> & {
  evidence: string[]
  hireProfileNote: string | null
}

export type GrowthConflict = {
  title: string
  explanation: string
}

export type GrowthEngineResult = {
  historicalUtilization: Calculation<number>
  targetUtilization: Calculation<number>
  recommendation: GrowthRecommendation
  conflicts: GrowthConflict[]
  areas: {
    staffing: string
    demand: string
    revenue: string
    training: string
  }
}

const missing = <T>(explanation: string, gaps: string[], formula: string | null = null): Calculation<T> => ({
  status: "unavailable",
  value: null,
  formula,
  explanation,
  assumptions: [],
  missing: gaps,
})

function usableNumber(input: NumericInput): input is NumericInput & { value: number } {
  return (
    (input.kind === "present" || input.kind === "estimated") &&
    input.value !== null &&
    Number.isFinite(input.value)
  )
}

function prefersBeginners(input: GrowthEngineInput): boolean {
  const beginner = input.beginnerPreference.value
  if (beginner === "no") return false
  if (beginner === "yes" || beginner === "yes_personality") return true
  const join = input.joinPath.value
  return join === "no_experience" || join === "not_yet" || join === "mix"
}

function prefersExperienced(input: GrowthEngineInput): boolean {
  if (input.beginnerPreference.value === "no") return true
  if (input.joinPath.value === "experienced") return true
  if (input.hiringWeight.value === "skills") return true
  return false
}

function isUrgent(input: GrowthEngineInput): boolean {
  return input.goalTimeline.value === "within_6_months"
}

function utilization(
  volume: Calculation<number>,
  capacity: Calculation<number>,
  explanation: string,
  volumeLabel: string,
): Calculation<number> {
  const formula = "Utilization = annual events ÷ available annual capacity"
  if (capacity.status === "unavailable" || capacity.value === null) {
    return missing("Utilization needs available annual capacity, which is not calculated yet.", capacity.missing, formula)
  }
  if (capacity.value === 0) {
    return missing("Available annual capacity is 0, so utilization is not calculated.", ["Available annual capacity above 0"], formula)
  }
  if (volume.status === "unavailable" || volume.value === null) {
    return missing(`Utilization needs ${volumeLabel}, which is not available.`, volume.missing, formula)
  }
  const value = volume.value / capacity.value
  return {
    status: volume.status === "estimated" || capacity.status === "estimated" ? "estimated" : "calculated",
    value,
    formula,
    explanation,
    assumptions: [
      ...volume.assumptions,
      ...capacity.assumptions,
    ],
    missing: [],
  }
}

function zeroLeadCapacity(): Calculation<number> {
  return {
    status: "calculated",
    value: 0,
    formula: "Available annual capacity = sum of each lead DJ’s available annual event capacity",
    explanation: "There are no independent lead DJs, so available annual capacity is 0. Assistants and the owner are not added.",
    assumptions: ["Assistants are excluded from independent lead capacity.", "The owner is not counted as a team lead DJ."],
    missing: [],
  }
}

export function analyzeGrowth(input: GrowthEngineInput): GrowthEngineResult {
  const leads = input.staffing.currentStaffing.independentLeadCount
  const historicalVolume = input.staffing.currentStaffing.annualEventVolume
  const additional = input.staffing.additionalBookingsNeeded
  const gap = input.staffing.capacityGap
  const capacity =
    leads.status !== "unavailable" && leads.value === 0 ? zeroLeadCapacity() : input.staffing.availableAnnualCapacity

  const historicalUtilization = utilization(
    historicalVolume,
    capacity,
    "This uses current or historical event volume as a planning proxy. It is not a forecast of bookings without expansion.",
    "current or historical event volume",
  )
  const targetUtilization = utilization(
    targetVolume(input.targetAnnualBookings),
    capacity,
    "This uses the owner-confirmed annual booking target, not historical volume.",
    "the annual booking target",
  )

  const areas = {
    staffing: staffingArea(input, leads, capacity),
    demand: demandArea(input, additional, historicalVolume),
    revenue: revenueArea(input),
    training: trainingArea(input),
  }

  const recommendation = recommend(input, leads, capacity, additional, gap)
  const conflicts = conflictsFor(input, leads, recommendation)

  return {
    historicalUtilization,
    targetUtilization,
    recommendation,
    conflicts,
    areas,
  }
}

function targetVolume(target: NumericInput): Calculation<number> {
  if (target.kind === "invalid" || (target.value !== null && (!Number.isInteger(target.value) || target.value < 0))) {
    return missing("The annual booking target is not a valid count.", ["A whole number that is 0 or more"])
  }
  if (target.kind === "missing" || target.kind === "skipped" || target.value === null) {
    return missing("An annual booking target was not provided.", ["Target annual bookings"])
  }
  return {
    status: target.kind === "estimated" ? "estimated" : "calculated",
    value: target.value,
    formula: null,
    explanation: "This is the annual booking target you provided for planning.",
    assumptions: target.kind === "estimated" ? ["The booking target was entered as an estimate."] : [],
    missing: [],
  }
}

function staffingArea(
  input: GrowthEngineInput,
  leads: Calculation<number>,
  capacity: Calculation<number>,
): string {
  const desired = usableNumber(input.desiredDjCount) ? `${input.desiredDjCount.value} desired DJs` : "no desired team size yet"
  const leadText = leads.value === null ? "an unknown number of independent lead DJs" : `${leads.value} independent lead DJs`
  const capText =
    capacity.value === null ? "available annual capacity is not calculated" : `about ${capacity.value} events of annual lead capacity`
  return `You currently have ${leadText}, and ${desired}. ${capText.charAt(0).toUpperCase()}${capText.slice(1)}. Assistants and the owner are not counted as independent lead capacity.`
}

function demandArea(
  input: GrowthEngineInput,
  additional: Calculation<number>,
  historicalVolume: Calculation<number>,
): string {
  const historical =
    historicalVolume.value === null
      ? "Current or historical event volume is not available."
      : `Current or historical volume is ${historicalVolume.value} events a year. That is a planning proxy, not a confirmed forecast of bookings without expansion.`
  const reason =
    input.hiringReason.value === "more_events"
      ? " Onboarding says the main reason for more DJs is more events than you can cover."
      : input.hiringReason.value === "take_over_mine"
        ? " Onboarding says you want DJs to take over events you currently DJ."
        : ""
  if (additional.status === "unavailable" || additional.value === null) {
    return `${historical} Additional bookings cannot be calculated until there is both a booking target and an owner-confirmed forward-looking baseline.${reason}`
  }
  return `${historical} Additional bookings needed for the target are ${additional.value}.${reason}`
}

function revenueArea(input: GrowthEngineInput): string {
  const revenue = input.staffing.potentialAdditionalGrossRevenue
  const priority = input.financialPriority.value
  const priorityText = priority ? ` Financial priority recorded in onboarding: ${priority.replaceAll("_", " ")}.` : ""
  if (revenue.status === "unavailable" || revenue.value === null) {
    return `Potential additional gross revenue is not calculated yet.${priorityText} Blueprint does not invent a closing rate or mix pricing tiers.`
  }
  return `Potential additional gross revenue is an estimate, not guaranteed profit.${priorityText}`
}

function trainingArea(input: GrowthEngineInput): string {
  const availability =
    input.trainingAvailability.value === null
      ? "Forward-looking training availability was not provided."
      : input.trainingAvailability.value === "yes"
        ? "You said you can train new DJs in the next 12 months."
        : input.trainingAvailability.value === "limited"
          ? "You said training capacity is limited in the next 12 months."
          : "You said you cannot train new DJs in the next 12 months."
  const join =
    input.joinPath.value === "no_experience"
      ? " Onboarding says new DJs typically join with no experience."
      : input.joinPath.value === "experienced"
        ? " Onboarding says you typically hire experienced DJs."
        : ""
  return `${availability}${join}`
}

function recommend(
  input: GrowthEngineInput,
  leads: Calculation<number>,
  capacity: Calculation<number>,
  additional: Calculation<number>,
  gap: Calculation<number>,
): GrowthRecommendation {
  const essentials = [
    ...(leads.status === "unavailable" || leads.value === null ? ["Independent lead DJ count"] : []),
    ...(capacity.status === "unavailable" || capacity.value === null ? ["Each lead DJ’s available annual event capacity"] : []),
    ...(additional.status === "unavailable" || additional.value === null
      ? additional.missing.length > 0
        ? additional.missing
        : ["Target annual bookings", "Expected annual bookings without expansion"]
      : []),
    ...(gap.status === "unavailable" || gap.value === null
      ? gap.missing.length > 0
        ? gap.missing
        : ["Capacity gap"]
      : []),
  ]
  const uniqueEssentials = [...new Set(essentials)]
  if (
    leads.status === "unavailable" ||
    leads.value === null ||
    capacity.status === "unavailable" ||
    capacity.value === null ||
    additional.status === "unavailable" ||
    additional.value === null ||
    gap.status === "unavailable" ||
    gap.value === null
  ) {
    return {
      ...missing(
        "Blueprint does not have enough information for a confident next step. Follow-up answers stay separate from the Blueprint you approved, and missing numbers are not invented.",
        uniqueEssentials,
      ),
      evidence: uniqueEssentials.map((item) => `Missing: ${item}.`),
      hireProfileNote: null,
    }
  }

  const needMoreCapacity = gap.value > 0
  const needMoreBookings = additional.value > 0
  const estimated =
    capacity.status === "estimated" ||
    additional.status === "estimated" ||
    gap.status === "estimated" ||
    input.trainingAvailability.kind === "estimated" ||
    input.typicalLeadCapacity.kind === "estimated"
  const status = estimated ? "estimated" : "calculated"
  const beginners = prefersBeginners(input)
  const experienced = prefersExperienced(input)
  const urgent = isUrgent(input)
  const training = input.trainingAvailability.value
  const trainingKnown = training !== null && (input.trainingAvailability.kind === "present" || input.trainingAvailability.kind === "estimated")

  const evidence: string[] = [
    `Independent lead DJs: ${leads.value}.`,
    `Available annual capacity: ${capacity.value} events.`,
    `Capacity gap versus the booking target: ${gap.value}.`,
    `Additional bookings needed: ${additional.value}.`,
    "Current or historical event volume is not used as expected bookings without expansion.",
  ]
  if (historicalHigh(input, capacity)) {
    evidence.push(`Historical utilization is at least ${Math.round(HIGH_UTILIZATION * 100)}% of capacity. That is a proxy, not a forecast.`)
  }

  if (!needMoreCapacity && !needMoreBookings) {
    const wantsMoreDjs =
      usableNumber(input.desiredDjCount) && leads.value !== null && input.desiredDjCount.value > leads.value
    if (wantsMoreDjs) {
      return finish(
        "demand",
        status,
        "The booking target is already covered by expected bookings without expansion, and existing lead capacity covers the target. Hiring more DJs is not the first constraint. Increase demand before adding people.",
        [
          ...evidence,
          `Desired team size (${input.desiredDjCount.value}) is larger than independent lead DJs (${leads.value}).`,
        ],
        input,
      )
    }
    return finish(
      "utilize",
      status,
      "The booking target does not require more lead capacity. The next step is to use the DJs you already have more fully, not to hire.",
      evidence,
      input,
    )
  }

  if (!needMoreCapacity && needMoreBookings) {
    return finish(
      "utilize",
      status,
      "There is more booking demand than the no-expansion baseline, but existing lead capacity can cover the target. Use current DJs more fully before recruiting.",
      evidence,
      input,
    )
  }

  // needMoreCapacity
  if (beginners && trainingKnown && (training === "no" || training === "limited") && !urgent) {
    return finish(
      "train",
      status,
      "You need more event capacity, and your hiring path includes people who need training. Training availability is not enough to take beginners yet, so training capacity is the first obstacle.",
      [...evidence, trainingEvidence(training)],
      input,
    )
  }
  if (beginners && trainingKnown && (training === "no" || training === "limited") && urgent) {
    return finish(
      "experienced",
      status,
      "You need more event capacity on a short timeline, and you cannot train beginners quickly enough. Experienced DJs are the next step so growth is not waiting on a training program.",
      [...evidence, trainingEvidence(training), "Timeline recorded in onboarding is within 6 months."],
      input,
    )
  }
  if (beginners && training === "yes" && !urgent) {
    return finish(
      "beginner",
      status,
      "You need more event capacity, you can train in the next 12 months, and your hiring path includes beginners. Recruit people you can train rather than only experienced DJs.",
      [...evidence, trainingEvidence("yes")],
      input,
    )
  }
  if (experienced || urgent || input.beginnerPreference.value === "no") {
    return finish(
      "experienced",
      status,
      "You need more event capacity. Onboarding and timing point to experienced DJs rather than building a beginner pipeline first.",
      [
        ...evidence,
        urgent ? "Timeline recorded in onboarding is within 6 months." : "Hiring answers point toward people who can lead sooner.",
      ],
      input,
    )
  }
  if (!trainingKnown && beginners) {
    return {
      status: "estimated",
      value: "recruit",
      formula: null,
      explanation:
        "You need more event capacity, so recruiting is in view. Training availability was not provided, so Blueprint will not choose beginners versus experienced DJs yet.",
      assumptions: ["Training availability is required to choose beginners versus experienced DJs."],
      missing: ["Training availability in the next 12 months"],
      evidence: [...evidence, "Missing: training availability in the next 12 months."],
      hireProfileNote: hireProfileNote(input),
    }
  }
  return finish(
    "recruit",
    status,
    "You need more event capacity than independent lead DJs can currently cover. Recruiting additional DJs is the next step.",
    evidence,
    input,
  )
}

function historicalHigh(input: GrowthEngineInput, capacity: Calculation<number>): boolean {
  const volume = input.staffing.currentStaffing.annualEventVolume
  return (
    volume.status !== "unavailable" &&
    volume.value !== null &&
    capacity.status !== "unavailable" &&
    capacity.value !== null &&
    capacity.value > 0 &&
    volume.value / capacity.value >= HIGH_UTILIZATION
  )
}

function trainingEvidence(value: TrainingAvailability): string {
  if (value === "yes") return "You said you can train new DJs in the next 12 months."
  if (value === "limited") return "You said training capacity is limited in the next 12 months."
  return "You said you cannot train new DJs in the next 12 months."
}

function finish(
  kind: GrowthRecommendationKind,
  status: "calculated" | "estimated",
  explanation: string,
  evidence: string[],
  input: GrowthEngineInput,
): GrowthRecommendation {
  return {
    status,
    value: kind,
    formula: null,
    explanation,
    assumptions: [
      "This is a next step, not a hiring target and not a final growth plan.",
      "Typical lead-DJ capacity, when used, is applied to each independent lead DJ and labeled as an assumption.",
      ...(status === "estimated" ? ["At least one planning input or staffing result is an estimate."] : []),
    ],
    missing: [],
    evidence,
    hireProfileNote: hireProfileNote(input),
  }
}

function hireProfileNote(input: GrowthEngineInput): string | null {
  if (input.financialPriority.value === "reduce_costs" && prefersBeginners(input)) {
    return "Reducing event costs, recorded in onboarding, is one reason a beginner path may fit if training exists."
  }
  if (input.financialPriority.value === "pay_djs" && prefersExperienced(input)) {
    return "Paying DJs competitively, recorded in onboarding, is one reason experienced hires may fit."
  }
  return null
}

function conflictsFor(
  input: GrowthEngineInput,
  leads: Calculation<number>,
  recommendation: GrowthRecommendation,
): GrowthConflict[] {
  const conflicts: GrowthConflict[] = []
  const wantsMoreDjs =
    usableNumber(input.desiredDjCount) && leads.value !== null && input.desiredDjCount.value > leads.value
  if (
    wantsMoreDjs &&
    (recommendation.value === "demand" || recommendation.value === "utilize")
  ) {
    conflicts.push({
      title: "Desired team size is larger than the work appears to need",
      explanation: `You recorded wanting ${input.desiredDjCount.value} DJs, with ${leads.value} independent leads today. The booking target and capacity do not show a need to hire first. This does not change the team size or goal you already saved.`,
    })
  }
  const goal = input.primaryGoal.value
  if (
    (goal === "scale" || goal === "expand") &&
    (recommendation.value === "demand" || recommendation.value === "utilize")
  ) {
    conflicts.push({
      title: "The recorded growth goal is not the same as the first staffing step",
      explanation: `Your main goal is ${goal === "scale" ? "Scale" : "Expand"}. The numbers point to demand or utilization first, not hiring. Blueprint will not silently change that goal.`,
    })
  }
  if (goal === "dj_less" || goal === "stop_djing") {
    conflicts.push({
      title: "Owner DJ time is a separate decision from team hiring",
      explanation:
        "You want to DJ less or stop DJing. That is recorded, and the owner is not added to independent lead capacity. This warning does not block you from choosing a next step, and it does not change the saved goal.",
    })
  }
  return conflicts
}

export function emptyChoice<T>(): ChoiceInput<T> {
  return { value: null, kind: "missing" }
}

export function presentChoice<T>(value: T, estimated = false): ChoiceInput<T> {
  return { value, kind: estimated ? "estimated" : "present" }
}
