import { z } from "zod"

export const SERVICE_OTHER_TEXT_MAX = 80
export const MARKET_CHOICE_MAX = 3

export const SERVICE_CODES = [
  "dj_mc",
  "ceremony_audio",
  "uplighting",
  "dance_floor_lighting",
  "photo_booths",
  "special_effects",
  "corporate_av",
  "karaoke",
  "other",
] as const
export type ServiceCode = (typeof SERVICE_CODES)[number]

export const SERVICE_OPTIONS: { value: ServiceCode; label: string }[] = [
  { value: "dj_mc", label: "DJ and MC" },
  { value: "ceremony_audio", label: "Ceremony audio" },
  { value: "uplighting", label: "Uplighting" },
  { value: "dance_floor_lighting", label: "Dance floor lighting" },
  { value: "photo_booths", label: "Photo booths" },
  { value: "special_effects", label: "Special effects" },
  { value: "corporate_av", label: "Corporate AV / production" },
  { value: "karaoke", label: "Karaoke" },
  { value: "other", label: "Other" },
]

export const POSITIONING_CODES = ["budget", "mid_market", "premium", "luxury", "not_sure"] as const
export type PositioningCode = (typeof POSITIONING_CODES)[number]

export const POSITIONING_OPTIONS: { value: PositioningCode; label: string }[] = [
  { value: "budget", label: "Budget-friendly" },
  { value: "mid_market", label: "Mid-market" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
  { value: "not_sure", label: "I’m not sure" },
]

export const WHY_CHOSEN_CODES = [
  "price_value",
  "dj_talent",
  "professionalism",
  "customer_experience",
  "music_expertise",
  "production_quality",
  "specialized_services",
  "reputation",
  "other",
] as const
export type WhyChosenCode = (typeof WHY_CHOSEN_CODES)[number]

export const WHY_CHOSEN_OPTIONS: { value: WhyChosenCode; label: string }[] = [
  { value: "price_value", label: "Price/value" },
  { value: "dj_talent", label: "DJ talent and personality" },
  { value: "professionalism", label: "Professionalism and reliability" },
  { value: "customer_experience", label: "Customer experience" },
  { value: "music_expertise", label: "Music expertise" },
  { value: "production_quality", label: "Production quality" },
  { value: "specialized_services", label: "Specialized services" },
  { value: "reputation", label: "Reputation and referrals" },
  { value: "other", label: "Other" },
]

export const COMPETE_CODES = [
  "price_competition",
  "finding_djs",
  "established_competitors",
  "standing_out",
  "client_expectations",
  "demand_seasonality",
  "other",
] as const
export type CompeteCode = (typeof COMPETE_CODES)[number]

export const COMPETE_OPTIONS: { value: CompeteCode; label: string }[] = [
  { value: "price_competition", label: "Price competition" },
  { value: "finding_djs", label: "Finding qualified DJs" },
  { value: "established_competitors", label: "Larger established competitors" },
  { value: "standing_out", label: "Standing out from other companies" },
  { value: "client_expectations", label: "Client expectations" },
  { value: "demand_seasonality", label: "Demand or seasonality" },
  { value: "other", label: "Other" },
]

export const SERVICE_GOAL_CODES = ["offer_more", "improve_quality", "train_djs", "simplify", "not_sure"] as const
export type ServiceGoalCode = (typeof SERVICE_GOAL_CODES)[number]

export const SERVICE_GOAL_OPTIONS: { value: ServiceGoalCode; label: string }[] = [
  { value: "offer_more", label: "Offer more services" },
  { value: "improve_quality", label: "Improve quality and consistency" },
  { value: "train_djs", label: "Train more DJs to deliver existing services" },
  { value: "simplify", label: "Simplify what we offer" },
  { value: "not_sure", label: "Not sure yet" },
]

export const SERVICES_OPENING =
  "Now your services: what you offer today, how you sit in the market, and what you want to grow."
export const SERVICES_FOOTER_NOTE = "The next sections are coming soon."
export const SERVICE_TYPES_CHOOSE_MESSAGE = "Choose at least one service."
export const SERVICE_OTHER_MESSAGE = "Add a few words about this service."
export const SERVICE_SUBSET_MESSAGE = "Choose from the services you already offer."
export const SERVICE_NEW_OVERLAP_MESSAGE = "Choose services you don’t already offer."
export const MARKET_CHOICE_MESSAGE = "Choose at least one option."
export const MARKET_CHOICE_MAX_MESSAGE = "Choose up to three."
export const SKIPPED_SERVICES_NOTE = "You skipped this for now."

export type ServiceTypesValue = {
  codes: ServiceCode[]
  other: string | null
}

const SERVICE_TYPES_SCHEMA = z.object({
  codes: z.array(z.enum(SERVICE_CODES)).min(1),
  other: z.string().trim().min(1).max(SERVICE_OTHER_TEXT_MAX).nullable(),
})

function asServiceCodes(raw: unknown): ServiceCode[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((code): code is ServiceCode => (SERVICE_CODES as readonly string[]).includes(String(code)))
}

export function serviceTypesFromUnknown(raw: unknown): ServiceTypesValue | null {
  if (!raw || typeof raw !== "object") return null
  const codes = asServiceCodes((raw as { codes?: unknown }).codes)
  if (codes.length === 0) return null
  const otherRaw = (raw as { other?: unknown }).other
  const other = typeof otherRaw === "string" && otherRaw.trim() ? otherRaw.trim() : null
  return { codes, other }
}

export function parseServiceTypesValue(
  raw: unknown,
): { ok: true; value: ServiceTypesValue } | { ok: false; error: string } {
  const parsed = SERVICE_TYPES_SCHEMA.safeParse(raw)
  if (!parsed.success) {
    if (
      raw &&
      typeof raw === "object" &&
      Array.isArray((raw as { codes?: unknown }).codes) &&
      (raw as { codes: string[] }).codes.includes("other")
    ) {
      return { ok: false, error: SERVICE_OTHER_MESSAGE }
    }
    return { ok: false, error: SERVICE_TYPES_CHOOSE_MESSAGE }
  }
  if (parsed.data.codes.includes("other") && !parsed.data.other) {
    return { ok: false, error: SERVICE_OTHER_MESSAGE }
  }
  if (!parsed.data.codes.includes("other") && parsed.data.other) {
    return { ok: true, value: { codes: parsed.data.codes, other: null } }
  }
  return { ok: true, value: parsed.data }
}

export function parsePositioning(raw: unknown): { ok: true; value: PositioningCode } | { ok: false; error: string } {
  return typeof raw === "string" && (POSITIONING_CODES as readonly string[]).includes(raw)
    ? { ok: true, value: raw as PositioningCode }
    : { ok: false, error: "Choose one of the options." }
}

export function parseServiceGoal(raw: unknown): { ok: true; value: ServiceGoalCode } | { ok: false; error: string } {
  return typeof raw === "string" && (SERVICE_GOAL_CODES as readonly string[]).includes(raw)
    ? { ok: true, value: raw as ServiceGoalCode }
    : { ok: false, error: "Choose one of the options." }
}

function parseCodedList<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): { ok: true; value: T[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: MARKET_CHOICE_MESSAGE }
  const codes: T[] = []
  for (const item of raw) {
    const code = String(item)
    if (!(allowed as readonly string[]).includes(code)) {
      return { ok: false, error: "Choose one of the options." }
    }
    codes.push(code as T)
  }
  if (codes.length === 0) return { ok: false, error: MARKET_CHOICE_MESSAGE }
  if (codes.length > MARKET_CHOICE_MAX) return { ok: false, error: MARKET_CHOICE_MAX_MESSAGE }
  return { ok: true, value: codes }
}

export function parseWhyChosen(raw: unknown) {
  return parseCodedList(raw, WHY_CHOSEN_CODES)
}

export function parseCompete(raw: unknown) {
  return parseCodedList(raw, COMPETE_CODES)
}

export function codedListFromUnknown<T extends string>(raw: unknown, allowed: readonly T[]): T[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const codes = raw.filter((code): code is T => (allowed as readonly string[]).includes(String(code)))
  return codes.length > 0 ? codes : null
}

export function isSubsetOfOffered(selected: readonly ServiceCode[], offered: readonly ServiceCode[]): boolean {
  return selected.every((code) => offered.includes(code))
}

export function overlapsOffered(selected: readonly ServiceCode[], offered: readonly ServiceCode[]): boolean {
  return selected.some((code) => code !== "other" && offered.includes(code))
}

export function optionsForCodes(codes: readonly ServiceCode[]) {
  return SERVICE_OPTIONS.filter((option) => codes.includes(option.value))
}

export function offeredServiceOptions(offered: readonly ServiceCode[] | null) {
  if (!offered || offered.length === 0) return SERVICE_OPTIONS
  return optionsForCodes(offered)
}

export function newServiceOptions(offered: readonly ServiceCode[] | null) {
  if (!offered || offered.length === 0) return SERVICE_OPTIONS
  const remaining = SERVICE_CODES.filter((code) => code === "other" || !offered.includes(code))
  return optionsForCodes(remaining)
}

export function labeledServiceOptions(
  offered: readonly ServiceCode[] | null,
  otherLabel: string | null,
) {
  const options = offeredServiceOptions(offered)
  if (!otherLabel) return options
  return options.map((option) => (option.value === "other" ? { ...option, label: otherLabel } : option))
}

export function namedOtherLabel(offered: ServiceTypesValue | null): string | null {
  return offered?.codes.includes("other") && offered.other ? offered.other : null
}

export function inheritOfferedOther(
  codes: readonly string[],
  other: string | null,
  offered: ServiceTypesValue | null,
): string | null {
  if (!codes.includes("other")) return other
  return other ?? offered?.other ?? null
}

export function capChoices(next: string[], max = MARKET_CHOICE_MAX): string[] {
  return next.length <= max ? next : next.slice(0, max)
}

export function skippedServicesNote() {
  return SKIPPED_SERVICES_NOTE
}

export function completeServicesAnswers() {
  return [
    { questionKey: "S1", state: "answered" as const, value: { codes: ["dj_mc", "uplighting"], other: null } },
    { questionKey: "S2", state: "answered" as const, value: { codes: ["uplighting"], other: null } },
    { questionKey: "S3", state: "answered" as const, value: { codes: ["dj_mc"], other: null } },
    { questionKey: "S4", state: "answered" as const, value: "mid_market" },
    { questionKey: "S5", state: "answered" as const, value: ["dj_talent", "professionalism"] },
    { questionKey: "S6", state: "answered" as const, value: ["finding_djs", "standing_out"] },
    { questionKey: "S7", state: "answered" as const, value: { codes: ["photo_booths"], other: null } },
    { questionKey: "S8", state: "answered" as const, value: { codes: ["dj_mc"], other: null } },
    { questionKey: "S9", state: "answered" as const, value: "train_djs" },
  ]
}
