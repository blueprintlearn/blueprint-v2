import { z } from "zod"

export const ANNUAL_EVENT_COUNT_MIN = 0
export const ANNUAL_EVENT_COUNT_MAX = 9999
export const EVENT_OTHER_TEXT_MAX = 80

export const EVENT_TYPE_CODES = [
  "wedding",
  "school_dance",
  "corporate",
  "private_party",
  "bar_club",
  "other",
] as const
export type EventTypeCode = (typeof EVENT_TYPE_CODES)[number]

export const EVENT_TYPE_OPTIONS: { value: EventTypeCode; label: string }[] = [
  { value: "wedding", label: "Weddings" },
  { value: "school_dance", label: "School dances" },
  { value: "corporate", label: "Corporate events" },
  { value: "private_party", label: "Private parties" },
  { value: "bar_club", label: "Bars and clubs" },
  { value: "other", label: "Other" },
]

export const NEW_DJ_PATH_CODES = ["assistant", "lead", "mixed"] as const
export type NewDjPathCode = (typeof NEW_DJ_PATH_CODES)[number]

export const NEW_DJ_PATH_OPTIONS: { value: NewDjPathCode; label: string }[] = [
  { value: "assistant", label: "They start as assistants" },
  { value: "lead", label: "They start leading events" },
  { value: "mixed", label: "It depends" },
]

export const FUTURE_FOCUS_CODES = ["more_bookings", "less_involvement", "both"] as const
export type FutureFocusCode = (typeof FUTURE_FOCUS_CODES)[number]

export const FUTURE_FOCUS_OPTIONS: { value: FutureFocusCode; label: string }[] = [
  { value: "more_bookings", label: "More bookings" },
  { value: "less_involvement", label: "Less of my time at events" },
  { value: "both", label: "Both" },
]

export const EVENTS_OPENING =
  "Now your events: what you book today, who can run them, and what you want next."
export const EVENTS_FOOTER_NOTE = "The next sections are coming soon."
export const EVENTS_RANGE_MESSAGE = "Enter a whole number from 0 to 9,999."
export const EVENT_TYPES_CHOOSE_MESSAGE = "Choose at least one event type."
export const EVENT_OTHER_MESSAGE = "Add a few words about this event type."
export const EVENT_COMMON_SUBSET_MESSAGE = "Choose from the event types you already offer."
export const EVENT_NEW_OVERLAP_MESSAGE = "Choose types you don’t already offer."
export const SKIPPED_EVENTS_NOTE = "You skipped this for now."

export const E2_FIELD_HELP = "A round number is fine. Count every event you staffed in the last 12 months, of every type."
export const E2_ESTIMATE_UNIT = "events a year"

export type EventTypesValue = {
  codes: EventTypeCode[]
  other: string | null
}

const EVENT_TYPES_SCHEMA = z.object({
  codes: z.array(z.enum(EVENT_TYPE_CODES)).min(1),
  other: z.string().trim().min(1).max(EVENT_OTHER_TEXT_MAX).nullable(),
})

function asEventTypeCodes(raw: unknown): EventTypeCode[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((code): code is EventTypeCode => (EVENT_TYPE_CODES as readonly string[]).includes(String(code)))
}

export function eventTypesFromUnknown(raw: unknown): EventTypesValue | null {
  if (!raw || typeof raw !== "object") return null
  const codes = asEventTypeCodes((raw as { codes?: unknown }).codes)
  if (codes.length === 0) return null
  const otherRaw = (raw as { other?: unknown }).other
  const other = typeof otherRaw === "string" && otherRaw.trim() ? otherRaw.trim() : null
  return { codes, other }
}

export function parseEventTypesValue(
  raw: unknown,
): { ok: true; value: EventTypesValue } | { ok: false; error: string } {
  const parsed = EVENT_TYPES_SCHEMA.safeParse(raw)
  if (!parsed.success) {
    if (
      raw &&
      typeof raw === "object" &&
      Array.isArray((raw as { codes?: unknown }).codes) &&
      (raw as { codes: string[] }).codes.includes("other")
    ) {
      return { ok: false, error: EVENT_OTHER_MESSAGE }
    }
    return { ok: false, error: EVENT_TYPES_CHOOSE_MESSAGE }
  }
  if (parsed.data.codes.includes("other") && !parsed.data.other) {
    return { ok: false, error: EVENT_OTHER_MESSAGE }
  }
  if (!parsed.data.codes.includes("other") && parsed.data.other) {
    return { ok: true, value: { codes: parsed.data.codes, other: null } }
  }
  return { ok: true, value: parsed.data }
}

export function parseAnnualEventCount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (parsed < ANNUAL_EVENT_COUNT_MIN || parsed > ANNUAL_EVENT_COUNT_MAX) return null
  return parsed
}

export function parseOptionalAnnualEventCount(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value === null || value === undefined || String(value).trim() === "") return { ok: true, value: null }
  const parsed = parseAnnualEventCount(value)
  return parsed === null ? { ok: false } : { ok: true, value: parsed }
}

export function estimateAnnualVolume(values: Record<string, number>): number | null {
  const typicalMonth = values.typicalMonth
  if (!Number.isInteger(typicalMonth) || typicalMonth < 0) return null
  return typicalMonth * 12
}

export function parseNewDjPath(raw: unknown): { ok: true; value: NewDjPathCode } | { ok: false; error: string } {
  return typeof raw === "string" && (NEW_DJ_PATH_CODES as readonly string[]).includes(raw)
    ? { ok: true, value: raw as NewDjPathCode }
    : { ok: false, error: "Choose one of the options." }
}

export function parseFutureFocus(raw: unknown): { ok: true; value: FutureFocusCode } | { ok: false; error: string } {
  return typeof raw === "string" && (FUTURE_FOCUS_CODES as readonly string[]).includes(raw)
    ? { ok: true, value: raw as FutureFocusCode }
    : { ok: false, error: "Choose one of the options." }
}

export function isSubsetOfOffered(selected: readonly EventTypeCode[], offered: readonly EventTypeCode[]): boolean {
  return selected.every((code) => offered.includes(code))
}

export function overlapsOffered(selected: readonly EventTypeCode[], offered: readonly EventTypeCode[]): boolean {
  return selected.some((code) => code !== "other" && offered.includes(code))
}

export function optionsForCodes(codes: readonly EventTypeCode[]) {
  return EVENT_TYPE_OPTIONS.filter((option) => codes.includes(option.value))
}

export function staffingOptions(offered: readonly EventTypeCode[] | null) {
  if (!offered || offered.length === 0) return EVENT_TYPE_OPTIONS
  return optionsForCodes(offered)
}

export function newTypeOptions(offered: readonly EventTypeCode[] | null) {
  if (!offered || offered.length === 0) return EVENT_TYPE_OPTIONS
  const remaining = EVENT_TYPE_CODES.filter((code) => code === "other" || !offered.includes(code))
  return optionsForCodes(remaining)
}

export function labeledEventOptions(
  offered: readonly EventTypeCode[] | null,
  otherLabel: string | null,
) {
  const options = staffingOptions(offered)
  if (!otherLabel) return options
  return options.map((option) => (option.value === "other" ? { ...option, label: otherLabel } : option))
}

export function namedOtherLabel(offered: EventTypesValue | null): string | null {
  return offered?.codes.includes("other") && offered.other ? offered.other : null
}

export function inheritOfferedOther(
  codes: readonly string[],
  other: string | null,
  offered: EventTypesValue | null,
): string | null {
  if (!codes.includes("other")) return other
  return other ?? offered?.other ?? null
}

export function skippedEventsNote() {
  return SKIPPED_EVENTS_NOTE
}

export function completeEventsAnswers() {
  return [
    { questionKey: "E1", state: "answered" as const, value: { codes: ["wedding", "corporate"], other: null } },
    { questionKey: "E2", state: "answered" as const, value: 80 },
    { questionKey: "E3", state: "answered" as const, value: { codes: ["wedding"], other: null } },
    { questionKey: "E4", state: "answered" as const, value: { codes: ["corporate"], other: null } },
    { questionKey: "E5", state: "answered" as const, value: { codes: ["wedding"], other: null } },
    { questionKey: "E6", state: "answered" as const, value: "assistant" },
    { questionKey: "E7", state: "answered" as const, value: { codes: ["wedding"], other: null } },
    { questionKey: "E8", state: "answered" as const, value: { codes: ["school_dance"], other: null } },
    { questionKey: "E9", state: "answered" as const, value: "both" },
  ]
}
