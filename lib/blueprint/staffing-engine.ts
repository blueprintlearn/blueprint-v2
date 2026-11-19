/**
 * Deterministic staffing and demand calculations.
 *
 * Callers pass explicit inputs. This module does not read onboarding, invent
 * closing rates, or assume events-per-DJ defaults.
 */

export type InputKind = "present" | "estimated" | "missing" | "skipped" | "invalid"

export type NumericInput = {
  value: number | null
  kind: InputKind
}

export type OwnerDjFrequency = "regularly" | "sometimes" | "no"

export type LeadDjCapacity = {
  annualEvents: number
  estimated: boolean
}

export type AverageSale = {
  label: string
  amount: number
  estimated: boolean
}

export type StaffingEngineInput = {
  teamDjCount: NumericInput
  leadCapableCount: NumericInput
  assistantOnlyCount: NumericInput
  ownerDjFrequency: OwnerDjFrequency | null
  ownerDjFrequencyKind: InputKind
  annualEventVolume: NumericInput
  /** Per lead DJ. Null means Stage 1 never collected individual capacity. */
  leadDjAnnualCapacities: LeadDjCapacity[] | null
  targetAnnualBookings: NumericInput
  /** Explicit baseline for bookings without expansion. Not an implied substitute. */
  expectedAnnualBookingsWithoutExpansion: NumericInput
  closingRatePercent: NumericInput
  averageSales: AverageSale[] | null
}

export type CalculationStatus = "calculated" | "estimated" | "unavailable"

export type Calculation<T> = {
  status: CalculationStatus
  value: T | null
  formula: string | null
  explanation: string
  assumptions: string[]
  missing: string[]
}

export type StaffingFacts = {
  teamDjCount: Calculation<number>
  leadCapableCount: Calculation<number>
  assistantOnlyCount: Calculation<number>
  independentLeadCount: Calculation<number>
  annualEventVolume: Calculation<number>
  ownerInvolvement: Calculation<OwnerDjFrequency>
}

export type StaffingEngineResult = {
  currentStaffing: StaffingFacts
  availableAnnualCapacity: Calculation<number>
  capacityGap: Calculation<number>
  additionalBookingsNeeded: Calculation<number>
  additionalQualifiedLeadsAnnually: Calculation<number>
  additionalQualifiedLeadsMonthly: Calculation<number>
  potentialAdditionalGrossRevenue: Calculation<number>
}

const missing = (explanation: string, gaps: string[], formula: string | null = null): Calculation<never> => ({
  status: "unavailable",
  value: null,
  formula,
  explanation,
  assumptions: [],
  missing: gaps,
})

function fromCount(input: NumericInput, missingExplanation: string, formula: string | null = null): Calculation<number> {
  if (input.kind === "invalid" || (input.value !== null && (!Number.isFinite(input.value) || input.value < 0))) {
    return missing("This number is not a valid count, so it is not used.", ["A whole number that is 0 or more"])
  }
  if (input.kind === "missing" || input.kind === "skipped" || input.value === null) {
    return missing(missingExplanation, [missingExplanation])
  }
  return {
    status: input.kind === "estimated" ? "estimated" : "calculated",
    value: input.value,
    formula,
    explanation: "This is the number you recorded in your approved Blueprint.",
    assumptions: input.kind === "estimated" ? ["This number was entered as an estimate."] : [],
    missing: [],
  }
}

function usable(input: NumericInput): input is NumericInput & { value: number } {
  return (
    (input.kind === "present" || input.kind === "estimated") &&
    input.value !== null &&
    Number.isFinite(input.value) &&
    input.value >= 0
  )
}

export function emptyNumeric(kind: InputKind = "missing"): NumericInput {
  return { value: null, kind }
}

export function present(value: number, estimated = false): NumericInput {
  return { value, kind: estimated ? "estimated" : "present" }
}

export function analyzeStaffing(input: StaffingEngineInput): StaffingEngineResult {
  const teamDjCount = fromCount(
    input.teamDjCount,
    "Current DJ headcount (not counting the owner) is not available.",
  )
  const leadCapableCount = fromCount(
    input.leadCapableCount,
    "How many of those DJs can lead an event on their own is not available.",
  )
  const assistantOnlyCount = fromCount(
    input.assistantOnlyCount,
    "Assistant-only headcount is not available.",
  )
  const annualEventVolume = fromCount(
    input.annualEventVolume,
    "Current annual event volume is not available.",
  )

  let ownerInvolvement: Calculation<OwnerDjFrequency>
  if (input.ownerDjFrequencyKind === "invalid") {
    ownerInvolvement = missing("Owner involvement is not a recognized answer, so it is not used.", [
      "Whether the owner DJs events",
    ])
  } else if (
    input.ownerDjFrequencyKind === "missing" ||
    input.ownerDjFrequencyKind === "skipped" ||
    input.ownerDjFrequency === null
  ) {
    ownerInvolvement = missing("Whether the owner DJs events is not available.", ["Whether the owner DJs events"])
  } else {
    ownerInvolvement = {
      status: input.ownerDjFrequencyKind === "estimated" ? "estimated" : "calculated",
      value: input.ownerDjFrequency,
      formula: null,
      explanation: "The owner’s event work is recorded separately from team headcount.",
      assumptions: ["The owner is not added to the team DJ count or to independent lead capacity."],
      missing: [],
    }
  }

  let independentLeadCount: Calculation<number>
  if (leadCapableCount.status === "unavailable" || leadCapableCount.value === null) {
    independentLeadCount = missing(
      "Independent lead capacity uses DJs who can run an event alone. Assistants and the owner are not added.",
      ["DJs who can lead an event on their own"],
    )
  } else if (
    teamDjCount.value !== null &&
    teamDjCount.status !== "unavailable" &&
    leadCapableCount.value > teamDjCount.value
  ) {
    independentLeadCount = missing("Lead-capable DJs cannot be more than the current team DJ count.", [
      "A lead-capable count that is not higher than current DJs",
    ])
  } else {
    independentLeadCount = {
      status: leadCapableCount.status,
      value: leadCapableCount.value,
      formula: "Independent lead DJs = DJs who can lead (T3)",
      explanation:
        "Only DJs who can run an event alone count toward independent lead capacity. Assistants are not independent lead DJs. The owner’s own events are counted separately and are not added here.",
      assumptions: [
        "Assistants are excluded from independent lead capacity.",
        "The owner is not counted as a team lead DJ.",
      ],
      missing: [],
    }
  }

  const availableAnnualCapacity = availableCapacity(input.leadDjAnnualCapacities)
  const capacityGap = gap(input.targetAnnualBookings, availableAnnualCapacity)
  const additionalBookingsNeeded = additionalBookings(
    input.targetAnnualBookings,
    input.expectedAnnualBookingsWithoutExpansion,
  )
  const additionalQualifiedLeadsAnnually = annualLeads(additionalBookingsNeeded, input.closingRatePercent)
  const additionalQualifiedLeadsMonthly = monthlyLeads(additionalQualifiedLeadsAnnually)
  const potentialAdditionalGrossRevenue = revenue(additionalBookingsNeeded, input.averageSales)

  return {
    currentStaffing: {
      teamDjCount,
      leadCapableCount,
      assistantOnlyCount,
      independentLeadCount,
      annualEventVolume,
      ownerInvolvement,
    },
    availableAnnualCapacity,
    capacityGap,
    additionalBookingsNeeded,
    additionalQualifiedLeadsAnnually,
    additionalQualifiedLeadsMonthly,
    potentialAdditionalGrossRevenue,
  }
}

function availableCapacity(capacities: LeadDjCapacity[] | null): Calculation<number> {
  if (capacities === null) {
    return missing(
      "Individual lead-DJ event capacity was not collected, so annual capacity cannot be calculated. Blueprint does not assume 20, 30, or 40 events per DJ.",
      ["Each lead DJ’s available annual event capacity"],
      "Available annual capacity = sum of each lead DJ’s available annual event capacity",
    )
  }
  if (capacities.length === 0) {
    return missing(
      "No lead-DJ capacities were provided, so annual capacity cannot be calculated.",
      ["Each lead DJ’s available annual event capacity"],
      "Available annual capacity = sum of each lead DJ’s available annual event capacity",
    )
  }
  if (capacities.some((row) => !Number.isFinite(row.annualEvents) || row.annualEvents < 0)) {
    return missing("A lead DJ capacity is not a valid count, so annual capacity is not calculated.", [
      "Each lead DJ’s available annual event capacity as a whole number that is 0 or more",
    ])
  }
  const total = capacities.reduce((sum, row) => sum + row.annualEvents, 0)
  const estimated = capacities.some((row) => row.estimated)
  return {
    status: estimated ? "estimated" : "calculated",
    value: total,
    formula: "Available annual capacity = sum of each lead DJ’s available annual event capacity",
    explanation: "This is the sum of the annual event capacity you provided for each lead DJ.",
    assumptions: estimated ? ["At least one lead DJ capacity was entered as an estimate."] : [],
    missing: [],
  }
}

function gap(target: NumericInput, available: Calculation<number>): Calculation<number> {
  const formula = "Capacity gap = target annual events − available annual capacity"
  if (available.status === "unavailable" || available.value === null) {
    return missing(
      "Capacity gap needs available annual capacity, which is not calculated yet.",
      available.missing.length > 0 ? available.missing : ["Available annual capacity"],
      formula,
    )
  }
  if (!usable(target)) {
    if (target.kind === "invalid" || (target.value !== null && target.value < 0)) {
      return missing("The annual event target is not a valid count, so the capacity gap is not calculated.", [
        "Target annual events",
      ], formula)
    }
    return missing(
      "Capacity gap needs a target for annual events. Stage 1 did not ask for that target.",
      ["Target annual events"],
      formula,
    )
  }
  return {
    status: target.kind === "estimated" || available.status === "estimated" ? "estimated" : "calculated",
    value: target.value - available.value,
    formula,
    explanation: "A positive gap means more event capacity would be needed to hit the target. This is not a hiring target.",
    assumptions: [
      "This does not set a hiring number.",
      ...(target.kind === "estimated" ? ["The annual event target was entered as an estimate."] : []),
      ...available.assumptions,
    ],
    missing: [],
  }
}

function additionalBookings(target: NumericInput, baseline: NumericInput): Calculation<number> {
  const formula = "Additional bookings needed = max(0, target annual bookings − expected annual bookings without expansion)"
  const targetOk = usable(target)
  const baselineOk = usable(baseline)
  if (!targetOk && !baselineOk) {
    return missing(
      "Additional bookings need both a target and an explicit baseline for bookings without expansion.",
      ["Target annual bookings", "Expected annual bookings without expansion"],
      formula,
    )
  }
  if (!targetOk) {
    if (target.kind === "invalid" || (target.value !== null && target.value < 0)) {
      return missing("The booking target is not a valid count, so additional bookings are not calculated.", [
        "Target annual bookings",
      ], formula)
    }
    return missing(
      "A booking target was not provided, so the incremental requirement is unknown. The baseline is not used as a substitute target.",
      ["Target annual bookings"],
      formula,
    )
  }
  if (!baselineOk) {
    if (baseline.kind === "invalid" || (baseline.value !== null && baseline.value < 0)) {
      return missing("The baseline for bookings without expansion is not a valid count.", [
        "Expected annual bookings without expansion",
      ], formula)
    }
    return missing(
      "The booking target is known, but the baseline for bookings without expansion is not, so the incremental requirement is unknown.",
      ["Expected annual bookings without expansion"],
      formula,
    )
  }
  return {
    status: target.kind === "estimated" || baseline.kind === "estimated" ? "estimated" : "calculated",
    value: Math.max(0, target.value - baseline.value),
    formula,
    explanation:
      "The baseline is the expected annual bookings without expansion, not an unexplained stand-in for last year. A result of 0 means the target is already covered by that baseline.",
    assumptions: [
      "Expected annual bookings without expansion is the explicit baseline passed into this calculation.",
      ...(target.kind === "estimated" ? ["The booking target was entered as an estimate."] : []),
      ...(baseline.kind === "estimated" ? ["The baseline was entered as an estimate."] : []),
    ],
    missing: [],
  }
}

function annualLeads(bookings: Calculation<number>, closingRatePercent: NumericInput): Calculation<number> {
  const formula = "Additional qualified leads annually = additional bookings needed ÷ closing rate"
  if (bookings.status === "unavailable" || bookings.value === null) {
    return missing(
      "Qualified leads need additional bookings, which are not calculated yet.",
      bookings.missing.length > 0 ? bookings.missing : ["Additional bookings needed"],
      formula,
    )
  }
  if (bookings.value === 0) {
    return {
      status: bookings.status,
      value: 0,
      formula,
      explanation: "No additional bookings are needed, so no additional qualified leads are required for this formula.",
      assumptions: bookings.assumptions,
      missing: [],
    }
  }
  if (!usable(closingRatePercent) || closingRatePercent.value === 0) {
    if (closingRatePercent.kind === "invalid" || (closingRatePercent.value !== null && closingRatePercent.value <= 0)) {
      return missing(
        "Closing rate must be a percentage greater than 0 and at most 100. Zero and out-of-range rates are not used.",
        ["Closing rate"],
        formula,
      )
    }
    if (closingRatePercent.value !== null && closingRatePercent.value > 100) {
      return missing(
        "Closing rate must be a percentage greater than 0 and at most 100. Zero and out-of-range rates are not used.",
        ["Closing rate"],
        formula,
      )
    }
    return missing(
      "Closing rate was not collected, so qualified leads cannot be calculated. Blueprint does not invent a closing percentage.",
      ["Closing rate"],
      formula,
    )
  }
  if (closingRatePercent.value > 100) {
    return missing(
      "Closing rate must be a percentage greater than 0 and at most 100. Zero and out-of-range rates are not used.",
      ["Closing rate"],
      formula,
    )
  }
  return {
    status:
      bookings.status === "estimated" || closingRatePercent.kind === "estimated" ? "estimated" : "calculated",
    value: bookings.value / (closingRatePercent.value / 100),
    formula,
    explanation:
      "This uses the closing rate you provided. It is treated as company-wide unless a later slice records a rate for a specific event category.",
    assumptions: [
      "Closing rate is company-wide. Stage 1 did not collect a rate by event category.",
      ...(closingRatePercent.kind === "estimated" ? ["The closing rate was entered as an estimate."] : []),
      ...bookings.assumptions,
    ],
    missing: [],
  }
}

function monthlyLeads(annual: Calculation<number>): Calculation<number> {
  const formula = "Additional qualified leads monthly = additional qualified leads annually ÷ 12"
  if (annual.status === "unavailable" || annual.value === null) {
    return missing(
      "Monthly qualified leads need the annual figure, which is not calculated yet.",
      annual.missing.length > 0 ? annual.missing : ["Additional qualified leads annually"],
      formula,
    )
  }
  return {
    status: annual.status,
    value: annual.value / 12,
    formula,
    explanation: "The annual additional qualified leads, spread evenly across 12 months.",
    assumptions: annual.assumptions,
    missing: [],
  }
}

function revenue(bookings: Calculation<number>, averageSales: AverageSale[] | null): Calculation<number> {
  const formula = "Potential additional gross revenue = additional bookings × average sale"
  if (bookings.status === "unavailable" || bookings.value === null) {
    return missing(
      "Revenue opportunity needs additional bookings, which are not calculated yet.",
      bookings.missing.length > 0 ? bookings.missing : ["Additional bookings needed"],
      formula,
    )
  }
  if (bookings.value === 0) {
    return {
      status: bookings.status,
      value: 0,
      formula,
      explanation: "No additional bookings are needed, so additional gross revenue for this formula is $0. This is not profit.",
      assumptions: ["This is not guaranteed revenue or profit.", ...bookings.assumptions],
      missing: [],
    }
  }
  if (averageSales === null || averageSales.length === 0) {
    return missing(
      "An applicable average sale is not available, so additional gross revenue cannot be calculated.",
      ["Typical event price or an identified pricing tier"],
      formula,
    )
  }
  if (averageSales.some((row) => !Number.isFinite(row.amount) || row.amount < 0)) {
    return missing("An average sale is not a valid amount, so additional gross revenue is not calculated.", [
      "A typical event price of $0 or more",
    ], formula)
  }
  if (averageSales.length > 1) {
    return missing(
      "More than one average sale was provided. Blueprint will not mix pricing tiers without identifying which price applies.",
      ["Which pricing tier’s average sale to use"],
      formula,
    )
  }
  const sale = averageSales[0]
  return {
    status: bookings.status === "estimated" || sale.estimated ? "estimated" : "calculated",
    value: bookings.value * sale.amount,
    formula,
    explanation: `This uses ${sale.label}. It is potential additional gross revenue, not guaranteed revenue or profit.`,
    assumptions: [
      "This is an estimate of gross revenue, not profit.",
      `${sale.label} is the only price used. Different packages or tiers are not mixed.`,
      ...(sale.estimated ? ["The average sale was entered as an estimate."] : []),
      ...bookings.assumptions,
    ],
    missing: [],
  }
}
