export const QUALITY_MAX = 5
export const PRIORITY_MAX = 3
export const POOR_FIT_MAX = 3
export const CORE_VALUE_MAX = 3
export const CORE_VALUE_MAX_LENGTH = 40

export const PERSON_CODES = ["current_dj", "coworker", "personal", "none"] as const
export type PersonCode = (typeof PERSON_CODES)[number]

export const PERSON_OPTIONS: { value: PersonCode; label: string }[] = [
  { value: "current_dj", label: "One of my current or former DJs" },
  { value: "coworker", label: "Someone I’ve worked with outside DJing" },
  { value: "personal", label: "Someone I know personally" },
  { value: "none", label: "I don’t have anyone in mind" },
]

export const QUALITY_CODES = [
  "dependable",
  "friendly",
  "confident",
  "professional",
  "organized",
  "coachable",
  "calm",
  "energetic",
  "creative",
  "self_motivated",
  "team_player",
  "other",
] as const
export type QualityCode = (typeof QUALITY_CODES)[number]

export const QUALITY_OPTIONS: { value: QualityCode; label: string }[] = [
  { value: "dependable", label: "Dependable" },
  { value: "friendly", label: "Friendly and approachable" },
  { value: "confident", label: "Confident speaking to people" },
  { value: "professional", label: "Professional" },
  { value: "organized", label: "Organized" },
  { value: "coachable", label: "Coachable" },
  { value: "calm", label: "Calm under pressure" },
  { value: "energetic", label: "Energetic" },
  { value: "creative", label: "Creative" },
  { value: "self_motivated", label: "Self-motivated" },
  { value: "team_player", label: "Works well with others" },
  { value: "other", label: "Other" },
]

export const SKILL_CODES = [
  "djing",
  "music",
  "speaking",
  "customer_service",
  "events",
  "audio",
  "lighting",
  "sales",
] as const
export type SkillCode = (typeof SKILL_CODES)[number]

export const SKILL_OPTIONS: { value: SkillCode; label: string }[] = [
  { value: "djing", label: "DJing or mixing" },
  { value: "music", label: "Music knowledge" },
  { value: "speaking", label: "Public speaking or MC experience" },
  { value: "customer_service", label: "Customer service" },
  { value: "events", label: "Event experience" },
  { value: "audio", label: "Audio equipment" },
  { value: "lighting", label: "Lighting equipment" },
  { value: "sales", label: "Sales or client communication" },
]

export const SKILL_RATING_CODES = ["must_have", "can_teach", "not_important", "not_sure"] as const
export type SkillRatingCode = (typeof SKILL_RATING_CODES)[number]

export const SKILL_RATING_OPTIONS: { value: SkillRatingCode; label: string }[] = [
  { value: "must_have", label: "Must already have" },
  { value: "can_teach", label: "Can be taught" },
  { value: "not_important", label: "Not important for this role" },
  { value: "not_sure", label: "Not sure" },
]

export type SkillRatingsValue = Record<SkillCode, SkillRatingCode>

export const BEGINNER_CODES = ["yes", "yes_personality", "assistant_only", "no", "not_sure"] as const
export type BeginnerCode = (typeof BEGINNER_CODES)[number]

export const BEGINNER_OPTIONS: { value: BeginnerCode; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "yes_personality", label: "Yes, if they have the right personality" },
  { value: "assistant_only", label: "Only for assistant roles" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
]

export const HIRING_WEIGHT_CODES = ["character", "skills", "balance", "depends", "not_sure"] as const
export type HiringWeightCode = (typeof HIRING_WEIGHT_CODES)[number]

export const HIRING_WEIGHT_OPTIONS: { value: HiringWeightCode; label: string }[] = [
  { value: "character", label: "Strong character and willingness to learn" },
  { value: "skills", label: "Existing technical skills" },
  { value: "balance", label: "A balance of both" },
  { value: "depends", label: "It depends on the role" },
  { value: "not_sure", label: "Not sure" },
]

export const AVAILABILITY_CODES = [
  "weekday_day",
  "weekday_evening",
  "friday_evening",
  "saturday",
  "sunday",
  "varies",
] as const
export type AvailabilityCode = (typeof AVAILABILITY_CODES)[number]

export const AVAILABILITY_OPTIONS: { value: AvailabilityCode; label: string }[] = [
  { value: "weekday_day", label: "Weekday mornings or afternoons" },
  { value: "weekday_evening", label: "Weekday evenings" },
  { value: "friday_evening", label: "Friday evenings" },
  { value: "saturday", label: "Saturdays" },
  { value: "sunday", label: "Sundays" },
  { value: "varies", label: "Availability varies" },
]

export const TRAVEL_CODES = ["miles_15", "miles_30", "miles_60", "miles_more", "depends", "not_sure"] as const
export type TravelCode = (typeof TRAVEL_CODES)[number]

export const TRAVEL_OPTIONS: { value: TravelCode; label: string }[] = [
  { value: "miles_15", label: "Within 15 miles" },
  { value: "miles_30", label: "Within 30 miles" },
  { value: "miles_60", label: "Within 60 miles" },
  { value: "miles_more", label: "More than 60 miles" },
  { value: "depends", label: "Depends on the event" },
  { value: "not_sure", label: "Not sure" },
]

export const ARRANGEMENT_CODES = ["employees", "contractors", "both", "not_sure"] as const
export type ArrangementCode = (typeof ARRANGEMENT_CODES)[number]

export const ARRANGEMENT_OPTIONS: { value: ArrangementCode; label: string }[] = [
  { value: "employees", label: "Employees" },
  { value: "contractors", label: "Independent contractors" },
  { value: "both", label: "Both" },
  { value: "not_sure", label: "Not sure" },
]

export const POOR_FIT_CODES = [
  "unreliable",
  "poor_communication",
  "no_feedback",
  "unprofessional",
  "unavailable",
  "unwilling_to_learn",
  "hard_to_work_with",
  "other",
] as const
export type PoorFitCode = (typeof POOR_FIT_CODES)[number]

export const POOR_FIT_OPTIONS: { value: PoorFitCode; label: string }[] = [
  { value: "unreliable", label: "Unreliable or frequently late" },
  { value: "poor_communication", label: "Poor communication" },
  { value: "no_feedback", label: "Unwilling to accept feedback" },
  { value: "unprofessional", label: "Unprofessional behavior" },
  { value: "unavailable", label: "Unavailable during important event times" },
  { value: "unwilling_to_learn", label: "Unwilling to learn" },
  { value: "hard_to_work_with", label: "Difficulty working with others" },
  { value: "other", label: "Other" },
]

export type CoreValuesValue = { defined: false } | { defined: true; values: string[] }

export const IDEAL_DJ_OPENING =
  "Now your ideal DJ: who fits your company, even if you have not hired anyone yet. This is reflection only — no scores or hiring decisions yet."
export const IDEAL_DJ_FOOTER_NOTE = "The next sections are coming soon."
export const IDEAL_DJ_CHOICE_MESSAGE = "Choose one of the options."
export const IDEAL_DJ_LIST_MESSAGE = "Choose at least one option."
export const IDEAL_DJ_QUALITY_MAX_MESSAGE = "Choose up to five."
export const IDEAL_DJ_PRIORITY_MAX_MESSAGE = "Choose up to three."
export const IDEAL_DJ_SUBSET_MESSAGE = "Choose from the qualities you picked."
export const IDEAL_DJ_EXCLUSIVE_MESSAGE = "Choose that option on its own."
export const IDEAL_DJ_VALUES_MESSAGE = "Enter a short value, or say you haven’t defined these yet."
export const IDEAL_DJ_VALUE_LENGTH_MESSAGE = "Keep each value to 40 characters."
export const IDEAL_DJ_SKILL_MESSAGE = "Choose one option for each skill."
export const SKIPPED_IDEAL_DJ_NOTE = "You skipped this for now."
export const ARRANGEMENT_HELP =
  "This is a preference only. It does not decide how anyone is classified as an employee or contractor."

function parseChoice<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): { ok: true; value: T } | { ok: false; error: string } {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? { ok: true, value: raw as T }
    : { ok: false, error: IDEAL_DJ_CHOICE_MESSAGE }
}

function parseCodedList<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  options: { max?: number; exclusive?: T; maxMessage?: string } = {},
): { ok: true; value: T[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: IDEAL_DJ_LIST_MESSAGE }
  const codes: T[] = []
  for (const item of raw) {
    const code = String(item)
    if (!(allowed as readonly string[]).includes(code)) {
      return { ok: false, error: IDEAL_DJ_CHOICE_MESSAGE }
    }
    if (!codes.includes(code as T)) codes.push(code as T)
  }
  if (codes.length === 0) return { ok: false, error: IDEAL_DJ_LIST_MESSAGE }
  if (options.exclusive && codes.includes(options.exclusive) && codes.length !== 1) {
    return { ok: false, error: IDEAL_DJ_EXCLUSIVE_MESSAGE }
  }
  if (options.max && codes.length > options.max) {
    return { ok: false, error: options.maxMessage ?? IDEAL_DJ_PRIORITY_MAX_MESSAGE }
  }
  return { ok: true, value: codes }
}

export function parsePerson(raw: unknown) {
  return parseChoice(raw, PERSON_CODES)
}

export function parseQualities(raw: unknown) {
  return parseCodedList(raw, QUALITY_CODES, { max: QUALITY_MAX, maxMessage: IDEAL_DJ_QUALITY_MAX_MESSAGE })
}

export function parsePriorities(raw: unknown, qualities: readonly string[] | null) {
  const parsed = parseCodedList(raw, QUALITY_CODES, {
    max: PRIORITY_MAX,
    maxMessage: IDEAL_DJ_PRIORITY_MAX_MESSAGE,
  })
  if (!parsed.ok) return parsed
  if (!qualities || !parsed.value.every((code) => qualities.includes(code))) {
    return { ok: false as const, error: IDEAL_DJ_SUBSET_MESSAGE }
  }
  return parsed
}

export function parseCoreValues(raw: unknown): { ok: true; value: CoreValuesValue } | { ok: false; error: string } {
  if (raw === "none" || (typeof raw === "object" && raw !== null && !Array.isArray(raw) && (raw as { defined?: unknown }).defined === false)) {
    return { ok: true, value: { defined: false } }
  }
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null && Array.isArray((raw as { values?: unknown }).values)
      ? (raw as { values: unknown[] }).values
      : null
  if (!source) return { ok: false, error: IDEAL_DJ_VALUES_MESSAGE }
  const values: string[] = []
  for (const item of source) {
    if (typeof item !== "string") return { ok: false, error: IDEAL_DJ_VALUES_MESSAGE }
    const next = item.trim()
    if (!next) continue
    if (next.length > CORE_VALUE_MAX_LENGTH) return { ok: false, error: IDEAL_DJ_VALUE_LENGTH_MESSAGE }
    if (!values.includes(next)) values.push(next)
  }
  if (values.length === 0) return { ok: false, error: IDEAL_DJ_VALUES_MESSAGE }
  if (values.length > CORE_VALUE_MAX) return { ok: false, error: IDEAL_DJ_PRIORITY_MAX_MESSAGE }
  return { ok: true, value: { defined: true, values } }
}

export function parseSkillRatings(raw: unknown): { ok: true; value: SkillRatingsValue } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: IDEAL_DJ_SKILL_MESSAGE }
  }
  const record = raw as Record<string, unknown>
  const value = {} as SkillRatingsValue
  for (const skill of SKILL_CODES) {
    const rating = record[skill]
    if (typeof rating !== "string" || !(SKILL_RATING_CODES as readonly string[]).includes(rating)) {
      return { ok: false, error: IDEAL_DJ_SKILL_MESSAGE }
    }
    value[skill] = rating as SkillRatingCode
  }
  for (const key of Object.keys(record)) {
    if (!(SKILL_CODES as readonly string[]).includes(key)) {
      return { ok: false, error: IDEAL_DJ_SKILL_MESSAGE }
    }
  }
  return { ok: true, value }
}

export function parseBeginner(raw: unknown) {
  return parseChoice(raw, BEGINNER_CODES)
}

export function parseHiringWeight(raw: unknown) {
  return parseChoice(raw, HIRING_WEIGHT_CODES)
}

export function parseAvailability(raw: unknown) {
  return parseCodedList(raw, AVAILABILITY_CODES, { exclusive: "varies" })
}

export function parseTravel(raw: unknown) {
  return parseChoice(raw, TRAVEL_CODES)
}

export function parseArrangement(raw: unknown) {
  return parseChoice(raw, ARRANGEMENT_CODES)
}

export function parsePoorFit(raw: unknown) {
  return parseCodedList(raw, POOR_FIT_CODES, { max: POOR_FIT_MAX, maxMessage: IDEAL_DJ_PRIORITY_MAX_MESSAGE })
}

export function codedListFromUnknown<T extends string>(raw: unknown, allowed: readonly T[]): T[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const codes = raw.filter((code): code is T => (allowed as readonly string[]).includes(String(code)))
  return codes.length > 0 ? codes : null
}

export function qualitiesFromUnknown(raw: unknown): QualityCode[] | null {
  return codedListFromUnknown(raw, QUALITY_CODES)
}

export function coreValuesFromUnknown(raw: unknown): CoreValuesValue | null {
  const parsed = parseCoreValues(raw)
  return parsed.ok ? parsed.value : null
}

export function skillRatingsFromUnknown(raw: unknown): SkillRatingsValue | null {
  const parsed = parseSkillRatings(raw)
  return parsed.ok ? parsed.value : null
}

export function prioritiesMatchQualities(priorities: unknown, qualities: unknown): boolean {
  const chosen = qualitiesFromUnknown(priorities)
  const allowed = qualitiesFromUnknown(qualities)
  return Boolean(chosen && allowed && chosen.every((code) => allowed.includes(code)))
}

export function exclusiveList(next: string[], exclusive: string): string[] {
  const last = next[next.length - 1]
  if (last === exclusive) return [exclusive]
  return next.filter((code) => code !== exclusive)
}

export function capChoices(next: string[], max: number): string[] {
  return next.length <= max ? next : next.slice(0, max)
}

export function qualityLabel(i1: string | null): string {
  return i1 && i1 !== "none"
    ? "What makes that person a great fit? Choose up to five."
    : "Which qualities would you want in a future DJ? Choose up to five."
}

export function skippedIdealDjNote() {
  return SKIPPED_IDEAL_DJ_NOTE
}

export function completeIdealDjAnswers() {
  return [
    { questionKey: "I1", state: "answered" as const, value: "none" },
    {
      questionKey: "I2",
      state: "answered" as const,
      value: ["dependable", "friendly", "coachable"],
    },
    { questionKey: "I3", state: "answered" as const, value: ["dependable", "friendly"] },
    { questionKey: "I4", state: "answered" as const, value: { defined: false } },
    {
      questionKey: "I5",
      state: "answered" as const,
      value: {
        djing: "can_teach",
        music: "can_teach",
        speaking: "can_teach",
        customer_service: "must_have",
        events: "can_teach",
        audio: "can_teach",
        lighting: "not_important",
        sales: "not_sure",
      } satisfies SkillRatingsValue,
    },
    { questionKey: "I6", state: "answered" as const, value: "yes_personality" },
    { questionKey: "I7", state: "answered" as const, value: "character" },
    { questionKey: "I8", state: "answered" as const, value: ["saturday"] },
    { questionKey: "I9", state: "answered" as const, value: "miles_30" },
    { questionKey: "I10", state: "answered" as const, value: "not_sure" },
    { questionKey: "I11", state: "answered" as const, value: ["unreliable", "poor_communication"] },
  ]
}
