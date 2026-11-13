import { parseAnnualEventCount } from "@/lib/blueprint/events"

export const MONEY_MIN = 0
export const MONEY_MAX = 99_999_999
export const PERCENT_MIN = 0
export const PERCENT_MAX = 100

export const REVENUE_PERIOD_CODES = ["last_year", "this_year"] as const
export type RevenuePeriodCode = (typeof REVENUE_PERIOD_CODES)[number]

export const REVENUE_PERIOD_OPTIONS: { value: RevenuePeriodCode; label: string }[] = [
  { value: "last_year", label: "Last year’s total" },
  { value: "this_year", label: "This year, estimated from typical months" },
]

export const PAY_METHOD_CODES = ["flat", "percentage", "hourly", "salary", "varies", "not_sure"] as const
export type PayMethodCode = (typeof PAY_METHOD_CODES)[number]

export const PAY_METHOD_OPTIONS: { value: PayMethodCode; label: string }[] = [
  { value: "flat", label: "Flat amount per event" },
  { value: "percentage", label: "Percentage of booking" },
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
  { value: "varies", label: "Varies" },
  { value: "not_sure", label: "Not sure" },
]

export const DIRECT_COST_CODES = [
  "assistants",
  "rentals",
  "travel",
  "supplies",
  "other",
  "none",
  "not_sure",
] as const
export type DirectCostCode = (typeof DIRECT_COST_CODES)[number]

export const DIRECT_COST_OPTIONS: { value: DirectCostCode; label: string }[] = [
  { value: "assistants", label: "Assistants or production staff" },
  { value: "rentals", label: "Equipment rentals" },
  { value: "travel", label: "Travel" },
  { value: "supplies", label: "Supplies" },
  { value: "other", label: "Other" },
  { value: "none", label: "None" },
  { value: "not_sure", label: "Not sure" },
]

export const FINANCIAL_PRIORITY_CODES = [
  "increase_revenue",
  "improve_margins",
  "pay_djs",
  "reduce_costs",
  "predictable_income",
  "not_sure",
] as const
export type FinancialPriorityCode = (typeof FINANCIAL_PRIORITY_CODES)[number]

export const FINANCIAL_PRIORITY_OPTIONS: { value: FinancialPriorityCode; label: string }[] = [
  { value: "increase_revenue", label: "Increase revenue" },
  { value: "improve_margins", label: "Improve profit margins" },
  { value: "pay_djs", label: "Pay DJs competitively" },
  { value: "reduce_costs", label: "Reduce event costs" },
  { value: "predictable_income", label: "Make income more predictable" },
  { value: "not_sure", label: "Not sure yet" },
]

export const MONEY_UNIT_CODES = ["usd", "percent"] as const
export type MoneyUnitCode = (typeof MONEY_UNIT_CODES)[number]

export const PRECISION_OPTIONS: { value: "exact" | "estimated"; label: string }[] = [
  { value: "exact", label: "Exact" },
  { value: "estimated", label: "Estimated" },
]

export type MoneyAmountValue = { amount: number }
export type RevenueValue = { amount: number; period: RevenuePeriodCode }
export type DjCostValue = { amount: number; unit: MoneyUnitCode }
export type DirectCostTypesValue = { codes: DirectCostCode[] }

export const NUMBERS_OPENING =
  "Now your numbers: approximate is fine. These stay private to you, and Blueprint will not turn them into scores or recommendations yet."
export const NUMBERS_FOOTER_NOTE = "The next sections are coming soon."
export const NUMBERS_AMOUNT_MESSAGE = "Enter a whole-dollar amount from $0 to $99,999,999."
export const NUMBERS_PERCENT_MESSAGE = "Enter a whole number from 0 to 100."
export const NUMBERS_PERIOD_MESSAGE = "Choose last year or this year."
export const NUMBERS_CHOICE_MESSAGE = "Choose one of the options."
export const NUMBERS_COSTS_MESSAGE = "Choose the other direct costs you typically have, or None or Not sure."
export const NUMBERS_COST_EXCLUSIVE_MESSAGE = "None and Not sure can’t be combined with other costs."
export const NUMBERS_DJ_UNIT_MESSAGE = "Enter a dollar amount or a percentage that matches how you pay lead DJs."
export const N2_CONFIRM_HELP = "This is the same yearly volume as Your events. Confirm it or update it here."
export const N1_FIELD_HELP =
  "Company revenue, which may include rentals, production, or other services. Approximate is fine."
export const N3_FIELD_HELP =
  "Typical booking price for one event. Don’t divide company-wide revenue by bookings if you also charge for other services."
export const N5_DOLLAR_HELP =
  "What a typical lead DJ costs you for one event. If you pay hourly or salary, estimate the usual per-event amount."
export const N5_PERCENT_HELP = "Percent of the booking price, as a whole number."
export const N5_VARIES_HELP = "Pay varies: enter a representative per-event amount and label it Estimated."
export const N7_FIELD_HELP =
  "Direct costs of running one event, not rent, insurance, or other overhead. Don’t include what you pay the lead DJ."
export const N9_FIELD_HELP = "No deadline. Approximate is fine. Leave this blank if you don’t have a target yet."
export const SKIPPED_NUMBERS_NOTE = "You skipped this for now. You can answer it later."

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function parseMoneyAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (parsed < MONEY_MIN || parsed > MONEY_MAX) return null
  return parsed
}

export function parseOptionalMoneyAmount(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value === null || value === undefined || String(value).trim() === "") return { ok: true, value: null }
  const parsed = parseMoneyAmount(value)
  return parsed === null ? { ok: false } : { ok: true, value: parsed }
}

export function parsePercent(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (parsed < PERCENT_MIN || parsed > PERCENT_MAX) return null
  return parsed
}

export function parseOptionalPercent(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value === null || value === undefined || String(value).trim() === "") return { ok: true, value: null }
  const parsed = parsePercent(value)
  return parsed === null ? { ok: false } : { ok: true, value: parsed }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function parseRevenueValue(raw: unknown): { ok: true; value: RevenueValue } | { ok: false; error: string } {
  const record = asRecord(raw)
  const amount = parseMoneyAmount(record?.amount)
  const period = record?.period
  if (amount === null) return { ok: false, error: NUMBERS_AMOUNT_MESSAGE }
  if (typeof period !== "string" || !(REVENUE_PERIOD_CODES as readonly string[]).includes(period)) {
    return { ok: false, error: NUMBERS_PERIOD_MESSAGE }
  }
  return { ok: true, value: { amount, period: period as RevenuePeriodCode } }
}

export function parseMoneyAmountValue(
  raw: unknown,
): { ok: true; value: MoneyAmountValue } | { ok: false; error: string } {
  const amount = parseMoneyAmount(asRecord(raw)?.amount ?? raw)
  if (amount === null) return { ok: false, error: NUMBERS_AMOUNT_MESSAGE }
  return { ok: true, value: { amount } }
}

export function parseDjCostValue(
  raw: unknown,
  method: PayMethodCode | null,
): { ok: true; value: DjCostValue } | { ok: false; error: string } {
  const record = asRecord(raw)
  const unitRaw = record?.unit ?? (method === "percentage" ? "percent" : "usd")
  if (typeof unitRaw !== "string" || !(MONEY_UNIT_CODES as readonly string[]).includes(unitRaw)) {
    return { ok: false, error: NUMBERS_DJ_UNIT_MESSAGE }
  }
  const unit = unitRaw as MoneyUnitCode
  const expected = compensationUnitForMethod(method)
  if (expected && unit !== expected) return { ok: false, error: NUMBERS_DJ_UNIT_MESSAGE }
  if (unit === "percent") {
    const amount = parsePercent(record?.amount)
    if (amount === null) return { ok: false, error: NUMBERS_PERCENT_MESSAGE }
    return { ok: true, value: { amount, unit } }
  }
  const amount = parseMoneyAmount(record?.amount)
  if (amount === null) return { ok: false, error: NUMBERS_AMOUNT_MESSAGE }
  return { ok: true, value: { amount, unit } }
}

export function parsePayMethod(raw: unknown): { ok: true; value: PayMethodCode } | { ok: false; error: string } {
  return typeof raw === "string" && (PAY_METHOD_CODES as readonly string[]).includes(raw)
    ? { ok: true, value: raw as PayMethodCode }
    : { ok: false, error: NUMBERS_CHOICE_MESSAGE }
}

export function parseFinancialPriority(
  raw: unknown,
): { ok: true; value: FinancialPriorityCode } | { ok: false; error: string } {
  return typeof raw === "string" && (FINANCIAL_PRIORITY_CODES as readonly string[]).includes(raw)
    ? { ok: true, value: raw as FinancialPriorityCode }
    : { ok: false, error: NUMBERS_CHOICE_MESSAGE }
}

export function parseDirectCostTypes(
  raw: unknown,
): { ok: true; value: DirectCostTypesValue } | { ok: false; error: string } {
  const codesRaw = Array.isArray(raw) ? raw : asRecord(raw)?.codes
  if (!Array.isArray(codesRaw) || codesRaw.length === 0) return { ok: false, error: NUMBERS_COSTS_MESSAGE }
  const codes: DirectCostCode[] = []
  for (const item of codesRaw) {
    const code = String(item)
    if (!(DIRECT_COST_CODES as readonly string[]).includes(code)) {
      return { ok: false, error: NUMBERS_CHOICE_MESSAGE }
    }
    if (!codes.includes(code as DirectCostCode)) codes.push(code as DirectCostCode)
  }
  const exclusive = codes.filter((code) => code === "none" || code === "not_sure")
  if (exclusive.length > 0 && codes.length !== 1) {
    return { ok: false, error: NUMBERS_COST_EXCLUSIVE_MESSAGE }
  }
  return { ok: true, value: { codes } }
}

export function compensationUnitForMethod(method: PayMethodCode | null): MoneyUnitCode | null {
  if (method === "percentage") return "percent"
  if (method === "flat" || method === "hourly" || method === "salary" || method === "varies") return "usd"
  return null
}

export function djCostMatchesMethod(cost: DjCostValue | null, method: PayMethodCode | null): boolean {
  if (!cost) return false
  const expected = compensationUnitForMethod(method)
  if (expected === null) return true
  return cost.unit === expected
}

export function exclusiveDirectCosts(next: string[]): string[] {
  const last = next[next.length - 1]
  if (last === "none" || last === "not_sure") return [last]
  return next.filter((code) => code !== "none" && code !== "not_sure")
}

export function noneDirectCosts(value: DirectCostTypesValue | null): boolean {
  return value?.codes.length === 1 && value.codes[0] === "none"
}

export function estimateAnnualRevenue(values: Record<string, number>): number | null {
  const typicalMonth = values.typicalMonth
  if (!Number.isInteger(typicalMonth) || typicalMonth < MONEY_MIN) return null
  const estimated = typicalMonth * 12
  return estimated > MONEY_MAX ? MONEY_MAX : estimated
}

export function estimateTypicalBooking(values: Record<string, number>): number | null {
  const eventRevenue = values.eventRevenue
  const bookings = values.bookings
  if (!Number.isInteger(eventRevenue) || eventRevenue < MONEY_MIN) return null
  if (!Number.isInteger(bookings) || bookings <= 0) return null
  return Math.min(MONEY_MAX, Math.round(eventRevenue / bookings))
}

export function revenueFromUnknown(value: unknown): RevenueValue | null {
  const parsed = parseRevenueValue(value)
  return parsed.ok ? parsed.value : null
}

export function moneyAmountFromUnknown(value: unknown): MoneyAmountValue | null {
  const parsed = parseMoneyAmountValue(value)
  return parsed.ok ? parsed.value : null
}

export function djCostFromUnknown(value: unknown): DjCostValue | null {
  const parsed = parseDjCostValue(value, null)
  return parsed.ok ? parsed.value : null
}

export function directCostsFromUnknown(value: unknown): DirectCostTypesValue | null {
  const parsed = parseDirectCostTypes(value)
  return parsed.ok ? parsed.value : null
}

export function payMethodFromUnknown(value: unknown): PayMethodCode | null {
  const parsed = parsePayMethod(value)
  return parsed.ok ? parsed.value : null
}

export function financialPriorityFromUnknown(value: unknown): FinancialPriorityCode | null {
  const parsed = parseFinancialPriority(value)
  return parsed.ok ? parsed.value : null
}

export function volumeFromUnknown(value: unknown): number | null {
  return parseAnnualEventCount(value)
}

export function skippedNumbersNote() {
  return SKIPPED_NUMBERS_NOTE
}

export function completeNumbersAnswers() {
  return [
    { questionKey: "N1", state: "answered" as const, value: { amount: 250000, period: "last_year" } },
    { questionKey: "N3", state: "answered" as const, value: { amount: 1800 } },
    { questionKey: "N4", state: "answered" as const, value: "flat" },
    { questionKey: "N5", state: "answered" as const, value: { amount: 400, unit: "usd" } },
    { questionKey: "N6", state: "answered" as const, value: { codes: ["travel", "supplies"] } },
    { questionKey: "N7", state: "answered" as const, value: { amount: 150 } },
    { questionKey: "N8", state: "answered" as const, value: "increase_revenue" },
    { questionKey: "N9", state: "answered" as const, value: { amount: 400000 } },
  ]
}
