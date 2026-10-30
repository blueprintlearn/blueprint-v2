import { z } from "zod"

import {
  OWNER_GOAL_CODES,
  OWNER_GOAL_LABELS,
  OWNER_GOAL_OTHER_MAX_LENGTH,
  OWNER_GOAL_OTHER_REQUIRED_MESSAGE,
  type OwnerGoalCode,
} from "@/lib/blueprint/goals"

/** G1 option descriptions. Other has no description; its follow-up field carries the words. */
export const OWNER_GOAL_DESCRIPTIONS: Record<OwnerGoalCode, string | undefined> = {
  dj_less: "Perform at fewer events yourself",
  stop_djing: "Stop performing at events",
  scale: "Book and staff more events",
  expand: "Serve a new city or market",
  improve_quality: "Make every DJ’s events more consistent",
  create_leadership: "Develop trainers or leads so it doesn’t all run through you",
  other: undefined,
}

export const GOAL_SET_OPTIONS = OWNER_GOAL_CODES.map((value) => ({
  value,
  label: OWNER_GOAL_LABELS[value],
  description: OWNER_GOAL_DESCRIPTIONS[value],
}))

export const CHOOSE_ONE_GOAL_MESSAGE = "Choose at least one goal."
export const CHOOSE_PRIMARY_GOAL_MESSAGE = "Choose which goal matters most."
export const DJ_PAIR_MESSAGE = "Choose DJ less or Stop DJing, not both."
export const OWNER_ONLY_GOAL_MESSAGE = "Only the company owner can change this."
export const SAVE_GOALS_FAILED_MESSAGE = "That didn’t save. Please try again."
export const DJ_PAIR_NOTE = "Stop DJing includes DJing less."
export const SINGLE_PRIMARY_LINE =
  "That’s your main goal. Blueprint will put it first in its recommendations."
export const PRIMARY_SELECT_HELP =
  "Blueprint puts this goal first in its recommendations. You can change it any time."

/**
 * Distinct SQLSTATE codes raised by `save_company_goals`.
 * Documented here so the action can map them to the section 1 messages.
 *
 * PBG01 empty set
 * PBG02 more than 7 goals
 * PBG03 duplicate goals
 * PBG04 primary missing or not in the set
 * PBG05 Other text missing or longer than 80
 * PBG06 DJ less and Stop DJing together
 * PBG07 not the active owner
 */
export const SAVE_COMPANY_GOALS_ERROR_CODES = {
  empty: "PBG01",
  tooMany: "PBG02",
  duplicate: "PBG03",
  primary: "PBG04",
  otherText: "PBG05",
  djPair: "PBG06",
  notOwner: "PBG07",
} as const

export type CompanyGoalEntry = {
  goal: OwnerGoalCode
  otherText: string | null
}

export type CurrentCompanyGoals = {
  companyId: string
  primary: CompanyGoalEntry
  others: CompanyGoalEntry[]
}

export type CompanyGoalsInput = {
  goals: OwnerGoalCode[]
  primary: OwnerGoalCode
  otherText: string | null
}

export const companyGoalsSchema = z
  .object({
    goals: z.array(z.enum(OWNER_GOAL_CODES)),
    primary: z.enum(OWNER_GOAL_CODES).optional(),
    otherText: z.string().trim().max(OWNER_GOAL_OTHER_MAX_LENGTH).optional(),
  })
  .superRefine((value, context) => {
    const unique = new Set(value.goals)

    if (value.goals.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["goals"],
        message: CHOOSE_ONE_GOAL_MESSAGE,
      })
      return
    }

    if (value.goals.length > 7 || unique.size !== value.goals.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["goals"],
        message: CHOOSE_ONE_GOAL_MESSAGE,
      })
      return
    }

    if (unique.has("dj_less") && unique.has("stop_djing")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["goals"],
        message: DJ_PAIR_MESSAGE,
      })
    }

    if (!value.primary || !unique.has(value.primary)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primary"],
        message: CHOOSE_PRIMARY_GOAL_MESSAGE,
      })
    }

    const other = value.otherText ?? ""
    if (unique.has("other") && other.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherText"],
        message: OWNER_GOAL_OTHER_REQUIRED_MESSAGE,
      })
    }
  })
  .transform((value): CompanyGoalsInput => {
    const unique = [...new Set(value.goals)]
    return {
      goals: unique,
      primary: value.primary as OwnerGoalCode,
      otherText: unique.includes("other") ? (value.otherText ?? "") : null,
    }
  })

export function parseCompanyGoals(input: {
  goals: unknown
  primary?: unknown
  otherText?: unknown
}): { ok: true; value: CompanyGoalsInput } | { ok: false; error: string } {
  const parsed = companyGoalsSchema.safeParse({
    goals: Array.isArray(input.goals) ? input.goals : [],
    primary: typeof input.primary === "string" && input.primary.length > 0 ? input.primary : undefined,
    otherText: typeof input.otherText === "string" ? input.otherText : undefined,
  })

  if (parsed.success) {
    return { ok: true, value: parsed.data }
  }

  const message = parsed.error.issues[0]?.message ?? CHOOSE_ONE_GOAL_MESSAGE
  return { ok: false, error: message }
}

export function mapSaveCompanyGoalsError(code: string | undefined): string {
  switch (code) {
    case SAVE_COMPANY_GOALS_ERROR_CODES.empty:
    case SAVE_COMPANY_GOALS_ERROR_CODES.tooMany:
    case SAVE_COMPANY_GOALS_ERROR_CODES.duplicate:
      return CHOOSE_ONE_GOAL_MESSAGE
    case SAVE_COMPANY_GOALS_ERROR_CODES.primary:
      return CHOOSE_PRIMARY_GOAL_MESSAGE
    case SAVE_COMPANY_GOALS_ERROR_CODES.otherText:
      return OWNER_GOAL_OTHER_REQUIRED_MESSAGE
    case SAVE_COMPANY_GOALS_ERROR_CODES.djPair:
      return DJ_PAIR_MESSAGE
    case SAVE_COMPANY_GOALS_ERROR_CODES.notOwner:
      return OWNER_ONLY_GOAL_MESSAGE
    default:
      return SAVE_GOALS_FAILED_MESSAGE
  }
}

export function sortGoals<T extends { goal: OwnerGoalCode }>(entries: T[]): T[] {
  return [...entries].sort(
    (left, right) => OWNER_GOAL_CODES.indexOf(left.goal) - OWNER_GOAL_CODES.indexOf(right.goal),
  )
}

export function goalDisplayLabel(entry: CompanyGoalEntry): string {
  if (entry.goal === "other") {
    const text = entry.otherText?.trim()
    return text ? text : OWNER_GOAL_LABELS.other
  }
  return OWNER_GOAL_LABELS[entry.goal]
}

export function companyGoalCodes(goals: CurrentCompanyGoals | null): OwnerGoalCode[] {
  if (!goals) return []
  return sortGoals([goals.primary, ...goals.others]).map((entry) => entry.goal)
}

export function companyGoalsOtherText(goals: CurrentCompanyGoals | null): string | null {
  if (!goals) return null
  return [goals.primary, ...goals.others].find((entry) => entry.goal === "other")?.otherText ?? null
}

export function alsoLine(others: CompanyGoalEntry[]): string | null {
  if (others.length === 0) return null
  return `Also: ${sortGoals(others).map(goalDisplayLabel).join(", ")}`
}

/**
 * Form-level rule: DJ less and Stop DJing exclude each other.
 * Checking one drops the other and sets the published note.
 */
export function reconcileGoalSelection(
  previous: readonly string[],
  next: readonly string[],
  primary: string,
): { goals: string[]; primary: string; note: string | null } {
  const unique = [...new Set(next)]
  let goals = unique
  let note: string | null = null

  if (unique.includes("dj_less") && unique.includes("stop_djing")) {
    const addedStop = !previous.includes("stop_djing") && unique.includes("stop_djing")
    goals = unique.filter((goal) => (addedStop ? goal !== "dj_less" : goal !== "stop_djing"))
    note = DJ_PAIR_NOTE
  }

  const nextPrimary = primary && goals.includes(primary) ? primary : ""
  return { goals, primary: nextPrimary, note }
}
