export const DEVELOPMENT_CHOICE_MAX = 3

export const JOIN_CODES = [
  "no_experience",
  "some_experience",
  "experienced",
  "mix",
  "not_yet",
] as const
export type JoinCode = (typeof JOIN_CODES)[number]

export const JOIN_OPTIONS: { value: JoinCode; label: string }[] = [
  { value: "no_experience", label: "Hired with no DJ experience" },
  { value: "some_experience", label: "Hired with some experience" },
  { value: "experienced", label: "Experienced DJs or subcontractors" },
  { value: "mix", label: "A mix" },
  { value: "not_yet", label: "I haven’t recruited anyone yet" },
]

export const LEARN_CODES = [
  "shadow",
  "assist",
  "one_on_one",
  "group",
  "online",
  "independent",
  "no_formal",
  "other",
] as const
export type LearnCode = (typeof LEARN_CODES)[number]

export const LEARN_OPTIONS: { value: LearnCode; label: string }[] = [
  { value: "shadow", label: "Shadow experienced DJs" },
  { value: "assist", label: "Assist at events" },
  { value: "one_on_one", label: "One-on-one training" },
  { value: "group", label: "Group training sessions" },
  { value: "online", label: "Online courses or videos" },
  { value: "independent", label: "Independent practice" },
  { value: "no_formal", label: "No formal training process" },
  { value: "other", label: "Other" },
]

export const TRAINER_CODES = ["owner", "lead_dj", "multiple", "outside", "nobody"] as const
export type TrainerCode = (typeof TRAINER_CODES)[number]

export const TRAINER_OPTIONS: { value: TrainerCode; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "lead_dj", label: "Lead DJ or mentor" },
  { value: "multiple", label: "Multiple team members" },
  { value: "outside", label: "Outside trainer" },
  { value: "nobody", label: "Nobody yet" },
]

export const READY_CODES = [
  "lessons",
  "skills_test",
  "practice",
  "assist",
  "approval",
  "no_process",
  "other",
] as const
export type ReadyCode = (typeof READY_CODES)[number]

export const READY_OPTIONS: { value: ReadyCode; label: string }[] = [
  { value: "lessons", label: "Complete required lessons" },
  { value: "skills_test", label: "Pass a skills test or audition" },
  { value: "practice", label: "Demonstrate skills at practice sessions" },
  { value: "assist", label: "Successfully assist at events" },
  { value: "approval", label: "Trainer or owner approval" },
  { value: "no_process", label: "No defined process yet" },
  { value: "other", label: "Other" },
]

export const MATERIALS_CODES = [
  "written",
  "videos",
  "courses",
  "quizzes",
  "presentations",
  "nothing",
  "other",
] as const
export type MaterialsCode = (typeof MATERIALS_CODES)[number]

export const MATERIALS_OPTIONS: { value: MaterialsCode; label: string }[] = [
  { value: "written", label: "Written instructions or checklists" },
  { value: "videos", label: "Training videos" },
  { value: "courses", label: "Online courses" },
  { value: "quizzes", label: "Quizzes or assignments" },
  { value: "presentations", label: "Training presentations" },
  { value: "nothing", label: "Nothing documented yet" },
  { value: "other", label: "Other" },
]

export const EQUIPMENT_CODES = ["dedicated", "shared", "own", "limited", "other"] as const
export type EquipmentCode = (typeof EQUIPMENT_CODES)[number]

export const EQUIPMENT_OPTIONS: { value: EquipmentCode; label: string }[] = [
  { value: "dedicated", label: "Dedicated practice equipment" },
  { value: "shared", label: "Shared company equipment" },
  { value: "own", label: "Their own equipment" },
  { value: "limited", label: "Limited or no equipment access" },
  { value: "other", label: "Other" },
]

export const HANDS_ON_CODES = [
  "observe",
  "assist",
  "warehouse",
  "group",
  "independent",
  "no_opportunities",
  "other",
] as const
export type HandsOnCode = (typeof HANDS_ON_CODES)[number]

export const HANDS_ON_OPTIONS: { value: HandsOnCode; label: string }[] = [
  { value: "observe", label: "Observe live events" },
  { value: "assist", label: "Assist experienced DJs" },
  { value: "warehouse", label: "Practice in a warehouse or office" },
  { value: "group", label: "Attend group practice sessions" },
  { value: "independent", label: "Practice independently" },
  { value: "no_opportunities", label: "No regular opportunities yet" },
  { value: "other", label: "Other" },
]

export const CHALLENGE_CODES = [
  "time",
  "engagement",
  "consistency",
  "readiness",
  "trainers",
  "event_experience",
  "materials",
  "no_major",
  "other",
] as const
export type ChallengeCode = (typeof CHALLENGE_CODES)[number]

export const CHALLENGE_OPTIONS: { value: ChallengeCode; label: string }[] = [
  { value: "time", label: "Finding time to train" },
  { value: "engagement", label: "Keeping trainees engaged" },
  { value: "consistency", label: "Training consistently" },
  { value: "readiness", label: "Knowing when someone is ready" },
  { value: "trainers", label: "Finding qualified trainers" },
  { value: "event_experience", label: "Getting trainees enough event experience" },
  { value: "materials", label: "Creating training materials" },
  { value: "no_major", label: "No major challenge yet" },
  { value: "other", label: "Other" },
]

export const IMPROVE_CODES = [
  "faster",
  "quality",
  "less_owner",
  "organized",
  "track",
  "more_services",
  "standardize",
  "other",
] as const
export type ImproveCode = (typeof IMPROVE_CODES)[number]

export const IMPROVE_OPTIONS: { value: ImproveCode; label: string }[] = [
  { value: "faster", label: "Train DJs faster" },
  { value: "quality", label: "Improve DJ quality and consistency" },
  { value: "less_owner", label: "Reduce owner involvement" },
  { value: "organized", label: "Make training more organized" },
  { value: "track", label: "Track trainee progress" },
  { value: "more_services", label: "Prepare DJs for more services" },
  { value: "standardize", label: "Standardize experienced DJs" },
  { value: "other", label: "Other" },
]

export const TIME_CODES = ["under_1", "one_to_two", "three_to_five", "over_five", "varies", "not_sure"] as const
export type TimeCode = (typeof TIME_CODES)[number]

export const TIME_OPTIONS: { value: TimeCode; label: string }[] = [
  { value: "under_1", label: "Less than 1 hour per week" },
  { value: "one_to_two", label: "1–2 hours per week" },
  { value: "three_to_five", label: "3–5 hours per week" },
  { value: "over_five", label: "More than 5 hours per week" },
  { value: "varies", label: "It varies" },
  { value: "not_sure", label: "I’m not sure" },
]

export const DEVELOPMENT_OPENING =
  "Now how you develop DJs: how people join, how they learn, and what you want Blueprint to improve. This is intake only — no training plan yet."
export const DEVELOPMENT_FOOTER_NOTE = "The next sections are coming soon."
export const DEVELOPMENT_CHOICE_MESSAGE = "Choose one of the options."
export const DEVELOPMENT_LIST_MESSAGE = "Choose at least one option."
export const DEVELOPMENT_CHOICE_MAX_MESSAGE = "Choose up to three."
export const DEVELOPMENT_EXCLUSIVE_MESSAGE = "Choose that option on its own."
export const SKIPPED_DEVELOPMENT_NOTE = "You skipped this for now."

function parseChoice<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): { ok: true; value: T } | { ok: false; error: string } {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? { ok: true, value: raw as T }
    : { ok: false, error: DEVELOPMENT_CHOICE_MESSAGE }
}

function parseCodedList<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  options: { max?: number; exclusive?: T } = {},
): { ok: true; value: T[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: DEVELOPMENT_LIST_MESSAGE }
  const codes: T[] = []
  for (const item of raw) {
    const code = String(item)
    if (!(allowed as readonly string[]).includes(code)) {
      return { ok: false, error: DEVELOPMENT_CHOICE_MESSAGE }
    }
    if (!codes.includes(code as T)) codes.push(code as T)
  }
  if (codes.length === 0) return { ok: false, error: DEVELOPMENT_LIST_MESSAGE }
  if (options.exclusive && codes.includes(options.exclusive) && codes.length !== 1) {
    return { ok: false, error: DEVELOPMENT_EXCLUSIVE_MESSAGE }
  }
  if (options.max && codes.length > options.max) {
    return { ok: false, error: DEVELOPMENT_CHOICE_MAX_MESSAGE }
  }
  return { ok: true, value: codes }
}

export function parseJoinPath(raw: unknown) {
  return parseChoice(raw, JOIN_CODES)
}

export function parseLearnMethods(raw: unknown) {
  return parseCodedList(raw, LEARN_CODES, { exclusive: "no_formal" })
}

export function parseTrainer(raw: unknown) {
  return parseChoice(raw, TRAINER_CODES)
}

export function parseReadySignals(raw: unknown) {
  return parseCodedList(raw, READY_CODES, { exclusive: "no_process" })
}

export function parseMaterials(raw: unknown) {
  return parseCodedList(raw, MATERIALS_CODES, { exclusive: "nothing" })
}

export function parseEquipment(raw: unknown) {
  return parseChoice(raw, EQUIPMENT_CODES)
}

export function parseHandsOn(raw: unknown) {
  return parseCodedList(raw, HANDS_ON_CODES, { exclusive: "no_opportunities" })
}

export function parseChallenges(raw: unknown) {
  return parseCodedList(raw, CHALLENGE_CODES, { max: DEVELOPMENT_CHOICE_MAX, exclusive: "no_major" })
}

export function parseImprovements(raw: unknown) {
  return parseCodedList(raw, IMPROVE_CODES, { max: DEVELOPMENT_CHOICE_MAX })
}

export function parseTrainingTime(raw: unknown) {
  return parseChoice(raw, TIME_CODES)
}

export function codedListFromUnknown<T extends string>(raw: unknown, allowed: readonly T[]): T[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const codes = raw.filter((code): code is T => (allowed as readonly string[]).includes(String(code)))
  return codes.length > 0 ? codes : null
}

export function exclusiveList(next: string[], exclusive: string): string[] {
  const last = next[next.length - 1]
  if (last === exclusive) return [exclusive]
  return next.filter((code) => code !== exclusive)
}

export function capChoices(next: string[], max = DEVELOPMENT_CHOICE_MAX): string[] {
  return next.length <= max ? next : next.slice(0, max)
}

export function skippedDevelopmentNote() {
  return SKIPPED_DEVELOPMENT_NOTE
}

export function completeDevelopmentAnswers() {
  return [
    { questionKey: "D1", state: "answered" as const, value: "mix" },
    { questionKey: "D2", state: "answered" as const, value: ["shadow", "assist"] },
    { questionKey: "D3", state: "answered" as const, value: "owner" },
    { questionKey: "D4", state: "answered" as const, value: ["assist", "approval"] },
    { questionKey: "D5", state: "answered" as const, value: ["written", "videos"] },
    { questionKey: "D6", state: "answered" as const, value: "shared" },
    { questionKey: "D7", state: "answered" as const, value: ["observe", "assist"] },
    { questionKey: "D8", state: "answered" as const, value: ["time", "readiness"] },
    { questionKey: "D9", state: "answered" as const, value: ["organized", "less_owner"] },
    { questionKey: "D10", state: "answered" as const, value: "one_to_two" },
  ]
}
