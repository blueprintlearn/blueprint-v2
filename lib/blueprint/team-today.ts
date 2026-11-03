import { z } from "zod"

export const CURRENT_DJ_COUNT_MIN = 0
export const CURRENT_DJ_COUNT_MAX = 999
export const DESIRED_DJ_COUNT_MIN = 0
export const DESIRED_DJ_COUNT_MAX = 999

export const TEAM_COUNT_BASES = ["excludes_owner", "includes_owner", "unknown"] as const
export type TeamCountBasis = (typeof TEAM_COUNT_BASES)[number]

export const OWNER_DJ_FREQUENCIES = ["regularly", "sometimes", "no"] as const
export type OwnerDjFrequency = (typeof OWNER_DJ_FREQUENCIES)[number]

export const T2_OPTIONS: { value: OwnerDjFrequency; label: string }[] = [
  { value: "regularly", label: "Yes, regularly" },
  { value: "sometimes", label: "Yes, now and then" },
  { value: "no", label: "No" },
]

export const T4_CODES = ["i_do", "manager", "djs", "outside", "nobody"] as const
export type T4Code = (typeof T4_CODES)[number]

export const T4_OPTIONS: { value: T4Code; label: string }[] = [
  { value: "i_do", label: "I do" },
  { value: "manager", label: "A manager" },
  { value: "djs", label: "One or more of my DJs" },
  { value: "outside", label: "An outside trainer or program" },
  { value: "nobody", label: "Nobody right now" },
]

export const T4_EXCLUSIVE = "nobody"
export const T4_EXCLUSIVE_MESSAGE = "Nobody right now can’t be combined with the others."
export const T4_EXCLUSIVE_NOTE = "Nobody right now can’t be combined with the others."

export const T5_CODES = [
  "finding_candidates",
  "slow_to_ready",
  "quality_varies",
  "djs_leave",
  "not_enough_busy",
  "too_involved",
  "scheduling",
  "other",
] as const
export type T5Code = (typeof T5_CODES)[number]

export const T5_OPTIONS: { value: T5Code; label: string }[] = [
  { value: "finding_candidates", label: "Finding good candidates" },
  { value: "slow_to_ready", label: "New DJs take too long to get ready" },
  { value: "quality_varies", label: "Quality varies from DJ to DJ" },
  { value: "djs_leave", label: "DJs leave after we train them" },
  { value: "not_enough_busy", label: "Not enough DJs on busy dates" },
  { value: "too_involved", label: "I’m too involved in training" },
  { value: "scheduling", label: "Scheduling and availability" },
  { value: "other", label: "Other" },
]

export const T5_MAX = 3
export const T5_MAX_MESSAGE = "Choose up to three."
export const T5_OTHER_MESSAGE = "Add a few words about this challenge."

export const T7_CODES = [
  "more_events",
  "busiest_dates",
  "take_over_mine",
  "new_market",
  "backups",
  "other",
] as const
export type T7Code = (typeof T7_CODES)[number]

export const T7_OPTIONS: { value: T7Code; label: string }[] = [
  { value: "more_events", label: "More events than we can cover" },
  { value: "busiest_dates", label: "Cover our busiest dates" },
  { value: "take_over_mine", label: "Take over the events I DJ" },
  { value: "new_market", label: "Grow into a new market" },
  { value: "backups", label: "Have backups when someone can’t make it" },
  { value: "other", label: "Other" },
]

export const T7_OTHER_MESSAGE = "Add a few words about your reason."

export const T8_CODES = ["never", "a_few_times", "monthly_or_more", "not_sure"] as const
export type T8Code = (typeof T8_CODES)[number]

export const T8_OPTIONS: { value: T8Code; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "a_few_times", label: "A few times" },
  { value: "monthly_or_more", label: "About monthly or more" },
  { value: "not_sure", label: "Not sure" },
]

export const T0_INCLUDED = "included"
export const T0_TEAM_ONLY = "team_only"

export const OTHER_TEXT_MAX = 80
export const TEAM_RANGE_MESSAGE = "Enter a whole number from 0 to 999."
export const T4_CHOOSE_MESSAGE = "Choose who trains or mentors your DJs today."
export const T5_CHOOSE_MESSAGE = "Choose what’s hardest about your team right now."
export const SAVE_TEAM_FAILED_MESSAGE = "That didn’t save. Please try again."

export const TEAM_EARLIER_SAVED_NOTE =
  "Your earlier answers are saved. We have a few new questions to finish your team profile."

export const TEAM_OPENING_V2 =
  "Now your team. We’ll count you separately, because your own events matter here too."

export const T1_FIELD_HELP =
  "Count DJs who are currently available to work events for you, employees and contractors alike, whether or not they lead yet. Don’t count someone who worked for you before but isn’t available now, or people who only assist. You’re counted next."

export const T1B_FIELD_HELP =
  "Helpers, lighting techs or trainees who support a DJ but don’t DJ or MC. They’re counted for event work, never as lead DJs."

export const T2_FIELD_HELP = "Many owners do. Blueprint plans your workload separately from your team’s."

export const T3_FIELD_HELP =
  "“Lead” means you’d send them alone to run the whole event. Only these DJs count toward lead capacity."

export const T4_FIELD_HELP = "Include anyone who teaches new DJs or gives feedback."

export const T5_FIELD_HELP = "Pick what costs you the most time, money or sleep."

export const T6_FIELD_HELP = "Your gut answer is fine."

export const T8_FIELD_HELP =
  "For example: a late arrival, a missed event, a client complaint, an equipment mistake."

export const T0_OPTIONS = [
  { value: T0_INCLUDED, label: "Yes, it included me" },
  { value: T0_TEAM_ONLY, label: "No, just my team" },
] as const

export function t0Label(n: number) {
  return `Earlier you told us you have ${n} DJs. Did that number include you?`
}

export function t6UnconfirmedLabel(n: number) {
  return `Earlier you said ${n}. Not counting you, is that still right?`
}

export function t3Help(t1: number) {
  return `${T3_FIELD_HELP} Enter a whole number from 0 to ${t1}.`
}

export function skippedTeamNote() {
  return "You skipped this for now. When you’re ready, answer it above and press Save."
}

export function teamTodayFixture(partial: Partial<AnswerTeamToday> = {}): AnswerTeamToday {
  return { ...emptyTeamToday(), ...partial }
}

export type AnswerTeamToday = {
  currentDjCount: number | null
  desiredDjCount: number | null
  countBasis: TeamCountBasis
  desiredCountBasis: TeamCountBasis
  assistantOnlyCount: number | null
  ownerDjFrequency: OwnerDjFrequency | null
  leadCapableCount: number | null
  earlierDjCount: number | null
  earlierDesiredDjCount: number | null
}

export function emptyTeamToday(): AnswerTeamToday {
  return {
    currentDjCount: null,
    desiredDjCount: null,
    countBasis: "unknown",
    desiredCountBasis: "unknown",
    assistantOnlyCount: null,
    ownerDjFrequency: null,
    leadCapableCount: null,
    earlierDjCount: null,
    earlierDesiredDjCount: null,
  }
}

export function isConfirmedCount(value: number | null, basis: TeamCountBasis): value is number {
  return value !== null && basis === "excludes_owner"
}

export function storedCurrentCount(team: AnswerTeamToday | null): number | null {
  if (!team) return null
  return team.currentDjCount
}

export function hasStoredTeamCount(team: AnswerTeamToday | null): boolean {
  if (!team) return false
  return team.currentDjCount !== null || team.desiredDjCount !== null
}

export function t0Shown(team: AnswerTeamToday | null): boolean {
  return Boolean(team && team.countBasis === "unknown" && team.currentDjCount !== null)
}

export function t6Unconfirmed(team: AnswerTeamToday | null): boolean {
  return Boolean(
    team && team.desiredDjCount !== null && team.desiredCountBasis !== "excludes_owner",
  )
}

const djCountSchema = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().min(min).max(max))

export const currentDjCountSchema = djCountSchema(CURRENT_DJ_COUNT_MIN, CURRENT_DJ_COUNT_MAX)
export const desiredDjCountSchema = djCountSchema(DESIRED_DJ_COUNT_MIN, DESIRED_DJ_COUNT_MAX)

function parseDjCount(value: unknown, schema: typeof currentDjCountSchema): number | null {
  if (typeof value !== "string") return null
  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function parseCurrentDjCount(value: unknown): number | null {
  return parseDjCount(value, currentDjCountSchema)
}

export function parseDesiredDjCount(value: unknown): number | null {
  return parseDjCount(value, desiredDjCountSchema)
}

export function parseOptionalDjCount(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value === null || value === undefined || value === "") return { ok: true, value: null }
  const parsed = parseCurrentDjCount(value)
  return parsed === null ? { ok: false } : { ok: true, value: parsed }
}

export function parseOwnerDjFrequency(value: unknown): OwnerDjFrequency | null {
  return typeof value === "string" && (OWNER_DJ_FREQUENCIES as readonly string[]).includes(value)
    ? (value as OwnerDjFrequency)
    : null
}

export const T4_SCHEMA = z.array(z.enum(T4_CODES)).min(1)
export const T5_SCHEMA = z.object({
  codes: z.array(z.enum(T5_CODES)).min(1).max(T5_MAX),
  other: z.string().trim().min(1).max(OTHER_TEXT_MAX).nullable(),
})
export const T7_SCHEMA = z.object({
  code: z.enum(T7_CODES),
  other: z.string().trim().min(1).max(OTHER_TEXT_MAX).nullable(),
})
export const T8_SCHEMA = z.enum(T8_CODES)

export function reconcileT4(selected: string[]): T4Code[] {
  const codes = selected.filter((code): code is T4Code => (T4_CODES as readonly string[]).includes(code))
  if (codes.includes("nobody") && codes.length > 1) {
    return codes[codes.length - 1] === "nobody" ? ["nobody"] : codes.filter((code) => code !== "nobody")
  }
  return codes
}

export function parseT4Value(raw: unknown): { ok: true; value: T4Code[] } | { ok: false; error: string } {
  const parsed = T4_SCHEMA.safeParse(raw)
  if (!parsed.success) return { ok: false, error: T4_CHOOSE_MESSAGE }
  if (parsed.data.includes("nobody") && parsed.data.length > 1) {
    return { ok: false, error: T4_EXCLUSIVE_MESSAGE }
  }
  return { ok: true, value: parsed.data }
}

export function parseT5Value(raw: unknown): { ok: true; value: z.infer<typeof T5_SCHEMA> } | { ok: false; error: string } {
  const parsed = T5_SCHEMA.safeParse(raw)
  if (!parsed.success) {
    if (Array.isArray((raw as { codes?: unknown })?.codes) && ((raw as { codes: unknown[] }).codes.length > T5_MAX)) {
      return { ok: false, error: T5_MAX_MESSAGE }
    }
    if (
      raw &&
      typeof raw === "object" &&
      Array.isArray((raw as { codes?: unknown }).codes) &&
      (raw as { codes: string[] }).codes.includes("other")
    ) {
      return { ok: false, error: T5_OTHER_MESSAGE }
    }
    return { ok: false, error: T5_CHOOSE_MESSAGE }
  }
  if (parsed.data.codes.includes("other") && !parsed.data.other) {
    return { ok: false, error: T5_OTHER_MESSAGE }
  }
  if (!parsed.data.codes.includes("other") && parsed.data.other) {
    return { ok: true, value: { codes: parsed.data.codes, other: null } }
  }
  return { ok: true, value: parsed.data }
}

export function parseT7Value(raw: unknown): { ok: true; value: z.infer<typeof T7_SCHEMA> } | { ok: false; error: string } {
  const parsed = T7_SCHEMA.safeParse(raw)
  if (!parsed.success) {
    if (raw && typeof raw === "object" && (raw as { code?: string }).code === "other") {
      return { ok: false, error: T7_OTHER_MESSAGE }
    }
    return { ok: false, error: "Choose one of the options." }
  }
  if (parsed.data.code === "other" && !parsed.data.other) {
    return { ok: false, error: T7_OTHER_MESSAGE }
  }
  if (parsed.data.code !== "other") return { ok: true, value: { code: parsed.data.code, other: null } }
  return { ok: true, value: parsed.data }
}

export function parseT8Value(raw: unknown): { ok: true; value: T8Code } | { ok: false; error: string } {
  const parsed = T8_SCHEMA.safeParse(raw)
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: "Choose one of the options." }
}

export function t3RangeMessage(t1: number) {
  return `Enter a whole number from 0 to ${t1}.`
}

export function t3AboveT1Message(t1: number) {
  return `That’s more than the ${t1} DJs you entered. Enter ${t1} or fewer.`
}

export function t1BelowT3Message(t3: number) {
  return `You said ${t3} of your DJs can lead. Enter at least ${t3}, or change that answer first.`
}

export function includesOwnerT1Note(n: number) {
  return `You told us ${n} included you. Enter how many DJs you have, not counting yourself.`
}

function noun(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}

export function m2Sentence1(team: {
  currentDjCount: number
  leadCapableCount: number | null
  assistantOnlyCount: number | null
  ownerDjFrequency: OwnerDjFrequency | null
}): string {
  const t1 = team.currentDjCount
  if (t1 === 0) return "You, with no other DJs right now."

  const djs = t1 === 1 ? "1 DJ" : `${t1} DJs`
  const lead =
    team.leadCapableCount === null
      ? ""
      : team.leadCapableCount === 1
        ? ", 1 of whom can lead on their own"
        : `, ${team.leadCapableCount} of whom can lead on their own`
  const assistants =
    team.assistantOnlyCount === null
      ? ""
      : team.assistantOnlyCount === 1
        ? ", plus 1 assistant"
        : `, plus ${team.assistantOnlyCount} assistants`
  const start = team.ownerDjFrequency === "no" ? `Your team: ${djs}` : `You and ${djs}`
  return `${start}${lead}${assistants}.`
}

export function m2Copy(input: {
  currentDjCount: number
  leadCapableCount: number | null
  assistantOnlyCount: number | null
  ownerDjFrequency: OwnerDjFrequency | null
  desiredDjCount: number | null
  trainers: readonly string[] | null
  goals: readonly string[]
}): { sentences: string[]; headsUp: string | null } {
  const sentences = [m2Sentence1(input)]
  if (input.desiredDjCount !== null) {
    sentences.push(`You’d like ${input.desiredDjCount} ${noun(input.desiredDjCount, "DJ", "DJs")}.`)
  }
  const wantsFewerEvents = input.goals.some((goal) => goal === "dj_less" || goal === "stop_djing")
  const headsUp =
    input.trainers?.length === 1 &&
    input.trainers[0] === "i_do" &&
    wantsFewerEvents
      ? "Heads up: you’re also the only trainer. Training new DJs will add to your week before it frees it up."
      : null
  return { sentences, headsUp }
}

export function t4CodesFromAnswers(answers: readonly { questionKey: string; state: string; value: unknown }[]): string[] | null {
  const row = answers.find((answer) => answer.questionKey === "T4" && answer.state === "answered")
  return Array.isArray(row?.value) ? row.value.map(String) : null
}

export function mapSaveTeamTodayError(code?: string) {
  if (code === "PBG07") return "Only the company owner can change this."
  if (code === "23514") return TEAM_RANGE_MESSAGE
  return SAVE_TEAM_FAILED_MESSAGE
}
