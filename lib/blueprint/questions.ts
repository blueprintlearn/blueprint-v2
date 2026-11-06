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
export type QuestionKey =
  | "G1"
  | "G2"
  | "G3"
  | "T0"
  | "T1"
  | "T1b"
  | "T2"
  | "T3"
  | "T4"
  | "T5"
  | "T6"
  | "T7"
  | "T8"

export type GuidanceExample = {
  text: string
  /** Hidden below 760px so the phone panel keeps the DJ less and Scale examples. */
  desktopOnly?: boolean
}

export type GuidanceContent = {
  why: string
  examples: readonly GuidanceExample[]
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
        { text: "An owner who plays most Saturdays and wants weekends back picks DJ less." },
        { text: "A company turning down bookings it can’t staff picks Scale." },
        {
          text: "An owner whose DJs all do things differently picks Improve quality.",
          desktopOnly: true,
        },
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
      why: "When your goals pull in different directions, Blueprint follows your main goal first.",
      examples: [
        { text: "If weekends back matter most, pick DJ less." },
        { text: "If you can’t staff the bookings you have, pick Scale." },
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
    key: "T0",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "Earlier you told us you have DJs. Did that number include you?",
    whyNeeded: "We now count you separately from your team.",
    guidance: null,
  },
  {
    key: "T1",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Not counting yourself, how many DJs work events for your company?",
    whyNeeded:
      "Blueprint needs to know who can work events for you now, not counting you, to see what your team can cover.",
    guidance: {
      why: "Blueprint needs to know who can work events for you now, not counting you, to see what your team can cover.",
      examples: [
        { text: "Three regular DJs and one contractor who fills in on busy weekends: 4." },
        { text: "A DJ who moved away last spring: don’t count them." },
      ],
    },
  },
  {
    key: "T1b",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How many people work your events only as assistants?",
    whyNeeded: "Assistants share the work at events, but they never count as lead DJs.",
    guidance: {
      why: "Assistants share the work at events, but they never count as lead DJs.",
      examples: [
        { text: "Two lighting techs who never DJ: 2." },
        { text: "A trainee who only helps set up: 1." },
      ],
    },
  },
  {
    key: "T2",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Do you DJ events yourself?",
    whyNeeded: "Your own events are work your team would take over if you DJ less.",
    guidance: {
      why: "Your own events are work your team would take over if you DJ less.",
      examples: [
        { text: "Plays most Saturdays: Yes, regularly." },
        { text: "Covers when someone’s sick: Yes, now and then." },
      ],
    },
  },
  {
    key: "T3",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How many of those DJs can lead an event on their own today?",
    whyNeeded: "Only DJs who can run an event alone count toward lead capacity.",
    guidance: {
      why: "Only DJs who can run an event alone count toward lead capacity.",
      examples: [
        { text: "Four DJs, two you’d send alone to a wedding: 2." },
        { text: "Everyone’s still learning: 0." },
      ],
    },
  },
  {
    key: "T4",
    section: "team",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Who trains or mentors your DJs today? Choose all that apply.",
    whyNeeded: "Training takes someone’s time. Blueprint wants to know whose.",
    guidance: {
      why: "Training takes someone’s time. Blueprint wants to know whose.",
      examples: [
        { text: "The owner and one senior DJ." },
        { text: "An outside program, nobody in-house." },
      ],
    },
  },
  {
    key: "T5",
    section: "team",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What’s hardest about your team right now? Choose up to three.",
    whyNeeded: "Blueprint focuses its suggestions on what costs you the most.",
    guidance: {
      why: "Blueprint focuses its suggestions on what costs you the most.",
      examples: [
        { text: "New DJs take months to be ready." },
        { text: "Not enough DJs on busy dates." },
      ],
    },
  },
  {
    key: "T6",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Not counting yourself, how many DJs would you like to have?",
    whyNeeded: "Blueprint compares the team you want with what your work needs.",
    guidance: {
      why: "Your gut answer is fine.",
      examples: [
        { text: "Today 4, would like 6." },
        { text: "Happy with today’s size: same as today." },
      ],
    },
  },
  {
    key: "T7",
    section: "team",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "What’s the main reason you want more DJs?",
    whyNeeded: "Blueprint uses your reason when it later checks the team you want.",
    guidance: null,
  },
  {
    key: "T8",
    section: "team",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "In the last 12 months, how often did a DJ problem affect an event?",
    whyNeeded: "Problems at events tell Blueprint where your team is stretched.",
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
  "You skipped this for now. When you’re ready, choose your goals above and press Save goals."

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
