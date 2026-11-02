import { z } from "zod"

import type { BlueprintSectionSlug } from "@/lib/blueprint/progress"
import type { OwnerGoalCode } from "@/lib/blueprint/goals"

export const QUESTION_KEY_PATTERN = /^[A-Z]{1,2}[0-9]{1,2}[a-z]?$/

export const G3_CODES = ["within_6_months", "6_to_12_months", "1_to_2_years", "no_set_date"] as const
export type G3Code = (typeof G3_CODES)[number]

export const G3_OPTIONS: { value: G3Code; label: string }[] = [
  { value: "within_6_months", label: "Within 6 months" },
  { value: "6_to_12_months", label: "In 6 to 12 months" },
  { value: "1_to_2_years", label: "In 1 to 2 years" },
  { value: "no_set_date", label: "No set date" },
]

export const G3_SCHEMA = z.enum(G3_CODES)
export const G3_CHOOSE_MESSAGE = "Choose one of the options."
export const G3_HELP = "Applies to your main goal."
export const G3_LABEL = "When would you like to get there?"
export const ADD_MORE_DETAIL = "Add more detail (optional)"

export const ALREADY_ANSWERED_MESSAGE = "You’ve already answered this. Change your answer instead."
export const OWNER_ONLY_MESSAGE = "Only the company owner can change this."
export const SAVE_FAILED_MESSAGE = "That didn’t save. Please try again."

export type QuestionLevel = "core" | "go_deeper"
export type QuestionStorage = "typed" | "answers"
export type QuestionKey = "G1" | "G2" | "G3" | "TL1" | "TL6"

export type GuidanceContent = {
  why: string
  examples: string[]
}

export type QuestionDefinition = {
  key: QuestionKey
  section: BlueprintSectionSlug
  level: QuestionLevel
  storage: QuestionStorage
  skipAllowed: boolean
  estimable: boolean
  version: number
  label: string
  whyNeeded: string
  guidance: GuidanceContent | null
}

export const QUESTIONS: readonly QuestionDefinition[] = [
  {
    key: "G1",
    section: "goals",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What do you want Blueprint to help you do? Choose all that apply.",
    whyNeeded: "Your goals shape every recommendation Blueprint makes.",
    guidance: {
      why: "Everything Blueprint suggests ties back to your goals, so this shapes every recommendation.",
      examples: [
        "An owner who plays most Saturdays and wants weekends back picks DJ less.",
        "A company turning down bookings it can’t staff picks Scale.",
        "An owner whose DJs all do things differently picks Improve quality.",
      ],
    },
  },
  {
    key: "G2",
    section: "goals",
    level: "core",
    storage: "typed",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "Which one matters most right now?",
    whyNeeded: "Blueprint puts your main goal first in its recommendations.",
    guidance: {
      why: "Blueprint puts this goal first in its recommendations. You can change it any time.",
      examples: [
        "If weekends back matter most, pick DJ less.",
        "If you can’t staff the bookings you have, pick Scale.",
      ],
    },
  },
  {
    key: "G3",
    section: "goals",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: G3_LABEL,
    whyNeeded: "Blueprint uses your timeframe to decide when to start recruiting.",
    guidance: null,
  },
  {
    key: "TL1",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "Current DJ count",
    whyNeeded: "Blueprint needs your DJ count to check whether your team fits your events.",
    guidance: null,
  },
  {
    key: "TL6",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "Desired DJ count",
    whyNeeded: "Blueprint compares the team you want with what your events need.",
    guidance: null,
  },
]

export const QUESTION_BY_KEY: Record<QuestionKey, QuestionDefinition> = Object.fromEntries(
  QUESTIONS.map((question) => [question.key, question]),
) as Record<QuestionKey, QuestionDefinition>

export function isQuestionKey(value: string): value is QuestionKey {
  return value in QUESTION_BY_KEY
}

export function questionsForSection(section: BlueprintSectionSlug): QuestionDefinition[] {
  return QUESTIONS.filter((question) => question.section === section)
}

export const G1_SKIPPED_TEXT =
  "You skipped this for now. Your goals shape every recommendation, so choose them when you’re ready."

export const M1_COPY: Record<OwnerGoalCode, string> = {
  dj_less: "To DJ less, your team needs room to take on some of your events. We’ll measure how many in a minute.",
  stop_djing:
    "To stop DJing, your team has to take over every event you play now. The next two sections measure exactly how many that is.",
  scale: "To scale, you need enough ready DJs for more bookings, and a way to get new DJs ready faster.",
  expand: "To expand, you’ll need DJs where the new market is, and someone there to train them.",
  improve_quality: "To improve quality, every DJ needs the same standard, and a way to show they meet it.",
  create_leadership:
    "To create leadership, some DJs need to grow into trainers or leads, so it doesn’t all run through you.",
  other: "Got it. Blueprint will keep ‘{text}’ in front of every recommendation.",
}

/** D-4 option (b): build the copy now; show it once the capacity check is live. */
export function shouldShowM1(): boolean {
  return false
}

export function m1Copy(primary: OwnerGoalCode, otherText?: string | null): string {
  if (primary === "other") {
    const text = otherText?.trim() || "your goal"
    return M1_COPY.other.replace("{text}", text)
  }
  return M1_COPY[primary]
}
