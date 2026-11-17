import type { AnswerContext, ResolvedAnswer } from "@/lib/blueprint/answers"
import {
  CHALLENGE_OPTIONS,
  EQUIPMENT_OPTIONS,
  HANDS_ON_OPTIONS,
  IMPROVE_OPTIONS,
  JOIN_OPTIONS,
  LEARN_OPTIONS,
  MATERIALS_OPTIONS,
  READY_OPTIONS,
  TIME_OPTIONS,
  TRAINER_OPTIONS,
} from "@/lib/blueprint/development"
import {
  EVENT_TYPE_OPTIONS,
  FUTURE_FOCUS_OPTIONS,
  NEW_DJ_PATH_OPTIONS,
  eventTypesFromUnknown,
} from "@/lib/blueprint/events"
import { OWNER_GOAL_LABELS, type OwnerGoalCode } from "@/lib/blueprint/goals"
import {
  ARRANGEMENT_OPTIONS,
  AVAILABILITY_OPTIONS,
  BEGINNER_OPTIONS,
  HIRING_WEIGHT_OPTIONS,
  PERSON_OPTIONS,
  POOR_FIT_OPTIONS,
  QUALITY_OPTIONS,
  SKILL_OPTIONS,
  SKILL_RATING_OPTIONS,
  TRAVEL_OPTIONS,
  coreValuesFromUnknown,
  skillRatingsFromUnknown,
} from "@/lib/blueprint/ideal-dj"
import {
  DIRECT_COST_OPTIONS,
  FINANCIAL_PRIORITY_OPTIONS,
  PAY_METHOD_OPTIONS,
  REVENUE_PERIOD_OPTIONS,
  djCostFromUnknown,
  formatUsd,
  payMethodFromUnknown,
  revenueFromUnknown,
  type MoneyAmountValue,
} from "@/lib/blueprint/numbers"
import {
  BLUEPRINT_SECTIONS,
  type BlueprintSectionSlug,
} from "@/lib/blueprint/progress"
import { G3_OPTIONS, type QuestionKey } from "@/lib/blueprint/questions"
import {
  COMPETE_OPTIONS,
  POSITIONING_OPTIONS,
  SERVICE_GOAL_OPTIONS,
  SERVICE_OPTIONS,
  WHY_CHOSEN_OPTIONS,
  serviceTypesFromUnknown,
} from "@/lib/blueprint/services"
import {
  T2_OPTIONS,
  T4_OPTIONS,
  T5_OPTIONS,
  T7_OPTIONS,
  T8_OPTIONS,
} from "@/lib/blueprint/team-today"

export const REVIEW_OPENING =
  "Here is your Company Blueprint as you described it. Check it, change anything that looks off, then approve it for now. This is a summary, not a set of recommendations."

export const REVIEW_CHOICE_MESSAGE = "Choose one of the options."
export const SKIPPED_REVIEW_NOTE = "You skipped this for now."
export const NUMBERS_PRIVACY_NOTE = "These numbers stay private to you."
export const FUTURE_DIRECTION_INTRO =
  "Onboarding captures how your company works today. Blueprint has not scored your business or built a plan yet. Later, it will help with the areas below."
export const FUTURE_DIRECTION_NOW =
  "What you can do now: review this snapshot, edit any section, and approve it when it looks right."
export const FUTURE_DIRECTION_LATER =
  "What is coming later: recruiting, training, and a path toward independent event work. Those are not available yet, and nothing here is a personalized recommendation."

export const FUTURE_AREAS = [
  {
    title: "Recruiting DJs who fit the company",
    body: "Help you describe who belongs on the team and look for people who match that picture.",
  },
  {
    title: "Training new and existing DJs",
    body: "Help you turn how you already develop people into a repeatable way to train.",
  },
  {
    title: "Building a repeatable path toward independent event work",
    body: "Help DJs move from assisting to running events without you having to invent each next step.",
  },
] as const

export const APPROVAL_CODES = ["approved", "not_yet", "not_sure"] as const
export type ApprovalCode = (typeof APPROVAL_CODES)[number]

export const APPROVAL_OPTIONS: { value: ApprovalCode; label: string }[] = [
  { value: "approved", label: "Yes, approve this for now" },
  { value: "not_yet", label: "Not yet — I still want to edit" },
  { value: "not_sure", label: "I’m not sure" },
]

export type ApprovalValue = { code: ApprovalCode; fingerprint: string }

export type SnapshotRow = {
  key: string
  label: string
  display: string
  state: "answered" | "estimated" | "skipped" | "unanswered" | "not_applicable"
  isEstimate: boolean
}

export type SnapshotGroup = {
  slug: Exclude<BlueprintSectionSlug, "review">
  name: string
  href: string
  privacyNote?: string
  rows: SnapshotRow[]
}

const INTAKE_SLUGS = ["goals", "team", "events", "services", "numbers", "development", "ideal-dj"] as const

const SNAPSHOT_LABELS: Partial<Record<QuestionKey, string>> = {
  G1: "Goals",
  G2: "Main goal",
  G3: "When you want to get there",
  T0: "Did your earlier count include you?",
  T1: "DJs (not counting you)",
  T1b: "Assistants only",
  T2: "You DJ events",
  T3: "DJs who can lead",
  T4: "Who trains today",
  T5: "What’s hardest right now",
  T6: "DJs you’d like (not counting you)",
  T7: "Why you want more DJs",
  T8: "Reliability issues",
  E1: "Events you book",
  E2: "Events a year",
  E3: "Events you often work",
  E4: "Events your team can run without you",
  E5: "Events a new DJ could learn first",
  E6: "How new DJs start",
  E7: "Events you want more of",
  E8: "Events you don’t offer yet",
  E9: "What you want next",
  S1: "Services you offer",
  S2: "Services you deliver most",
  S3: "Services a new DJ could learn first",
  S4: "Where you sit in the market",
  S5: "Why clients choose you",
  S6: "What you compete on",
  S7: "Services you want to add",
  S8: "Services you want to grow",
  S9: "Where you want to grow",
  N1: "Yearly revenue",
  N2: "Events a year",
  N3: "Typical event price",
  N4: "How you pay lead DJs",
  N5: "Typical lead DJ cost",
  N6: "Other event costs",
  N7: "Typical other costs per event",
  N8: "Financial priority",
  N9: "Revenue target",
  D1: "How new DJs join",
  D2: "How they learn",
  D3: "Who handles training",
  D4: "How you know someone is ready",
  D5: "Training materials",
  D6: "Practice equipment",
  D7: "Hands-on opportunities",
  D8: "Current challenges",
  D9: "What you want to improve",
  D10: "Your weekly training time",
  I1: "Who comes to mind",
  I2: "Qualities that fit",
  I3: "Hiring priorities",
  I4: "Core values",
  I5: "Experience that matters",
  I6: "Someone with no DJ experience",
  I7: "What matters more when hiring",
  I8: "When you need DJs",
  I9: "Travel range",
  I10: "Working arrangement (preference)",
  I11: "Poor fit",
}

function labelOf<T extends string>(options: readonly { value: T; label: string }[], code: string): string | null {
  return options.find((option) => option.value === code)?.label ?? null
}

function labelsOf<T extends string>(
  options: readonly { value: T; label: string }[],
  codes: readonly string[],
  other?: string | null,
): string {
  const labels = codes
    .map((code) => (code === "other" && other ? other : labelOf(options, code)))
    .filter((label): label is string => Boolean(label))
  return labels.join(", ")
}

function codedValue(
  value: unknown,
  options: readonly { value: string; label: string }[],
): string | null {
  if (typeof value === "string") return labelOf(options, value)
  if (Array.isArray(value)) return labelsOf(options, value.map(String)) || null
  if (value && typeof value === "object") {
    const record = value as { codes?: unknown; other?: unknown; code?: unknown }
    if (typeof record.code === "string") {
      return record.code === "other" && typeof record.other === "string"
        ? record.other
        : labelOf(options, record.code)
    }
    if (Array.isArray(record.codes)) {
      return labelsOf(options, record.codes.map(String), typeof record.other === "string" ? record.other : null) || null
    }
  }
  return null
}

function moneyAmount(value: unknown): string | null {
  if (typeof value === "number") return formatUsd(value)
  if (value && typeof value === "object" && "amount" in value && typeof (value as MoneyAmountValue).amount === "number") {
    return formatUsd((value as MoneyAmountValue).amount)
  }
  return null
}

function goalLabel(goal: string, otherText?: string | null): string {
  if (goal === "other" && otherText?.trim()) return otherText.trim()
  return OWNER_GOAL_LABELS[goal as OwnerGoalCode] ?? goal
}

function formatGoals(goals: AnswerContext["goals"]): string | null {
  if (!goals) return null
  const primary = goalLabel(
    String(goals.primary.goal),
    "otherText" in goals.primary ? String((goals.primary as { otherText?: unknown }).otherText ?? "") : null,
  )
  const others = goals.others
    .map((entry) => {
      if (!entry || typeof entry !== "object" || !("goal" in entry)) return null
      const goal = String((entry as { goal: unknown }).goal)
      const otherText =
        "otherText" in entry && typeof (entry as { otherText?: unknown }).otherText === "string"
          ? (entry as { otherText: string }).otherText
          : null
      return goalLabel(goal, otherText)
    })
    .filter((label): label is string => Boolean(label))
  return others.length > 0 ? `${primary}. Also: ${others.join(", ")}` : primary
}

function formatAnswered(row: ResolvedAnswer, goals: AnswerContext["goals"]): string | null {
  const value = row.value
  switch (row.key) {
    case "G1":
      return formatGoals(goals) ?? (typeof value === "string" ? goalLabel(value) : null)
    case "G2":
      return typeof value === "string" ? goalLabel(value) : null
    case "G3":
      return codedValue(value, G3_OPTIONS)
    case "T0":
      return value === "includes_owner" ? "Yes, it included me" : value === "excludes_owner" ? "No, just my team" : null
    case "T1":
    case "T1b":
    case "T3":
    case "T6":
    case "E2":
    case "N2":
      return typeof value === "number" ? String(value) : null
    case "T2":
      return codedValue(value, T2_OPTIONS)
    case "T4":
      return codedValue(value, T4_OPTIONS)
    case "T5":
      return codedValue(value, T5_OPTIONS)
    case "T7":
      return codedValue(value, T7_OPTIONS)
    case "T8":
      return codedValue(value, T8_OPTIONS)
    case "E1":
    case "E3":
    case "E4":
    case "E5":
    case "E7":
    case "E8":
      return codedValue(eventTypesFromUnknown(value) ?? value, EVENT_TYPE_OPTIONS)
    case "E6":
      return codedValue(value, NEW_DJ_PATH_OPTIONS)
    case "E9":
      return codedValue(value, FUTURE_FOCUS_OPTIONS)
    case "S1":
    case "S2":
    case "S3":
    case "S7":
    case "S8":
      return codedValue(serviceTypesFromUnknown(value) ?? value, SERVICE_OPTIONS)
    case "S4":
      return codedValue(value, POSITIONING_OPTIONS)
    case "S5":
      return codedValue(value, WHY_CHOSEN_OPTIONS)
    case "S6":
      return codedValue(value, COMPETE_OPTIONS)
    case "S9":
      return codedValue(value, SERVICE_GOAL_OPTIONS)
    case "N1": {
      const revenue = revenueFromUnknown(value)
      if (!revenue) return null
      const period = labelOf(REVENUE_PERIOD_OPTIONS, revenue.period)
      return period ? `${formatUsd(revenue.amount)} (${period})` : formatUsd(revenue.amount)
    }
    case "N3":
    case "N7":
    case "N9":
      return moneyAmount(value)
    case "N4":
      return codedValue(payMethodFromUnknown(value) ?? value, PAY_METHOD_OPTIONS)
    case "N5": {
      const cost = djCostFromUnknown(value)
      if (!cost) return null
      return cost.unit === "percent" ? `${cost.amount}%` : formatUsd(cost.amount)
    }
    case "N6":
      return codedValue(value, DIRECT_COST_OPTIONS)
    case "N8":
      return codedValue(value, FINANCIAL_PRIORITY_OPTIONS)
    case "D1":
      return codedValue(value, JOIN_OPTIONS)
    case "D2":
      return codedValue(value, LEARN_OPTIONS)
    case "D3":
      return codedValue(value, TRAINER_OPTIONS)
    case "D4":
      return codedValue(value, READY_OPTIONS)
    case "D5":
      return codedValue(value, MATERIALS_OPTIONS)
    case "D6":
      return codedValue(value, EQUIPMENT_OPTIONS)
    case "D7":
      return codedValue(value, HANDS_ON_OPTIONS)
    case "D8":
      return codedValue(value, CHALLENGE_OPTIONS)
    case "D9":
      return codedValue(value, IMPROVE_OPTIONS)
    case "D10":
      return codedValue(value, TIME_OPTIONS)
    case "I1":
      return codedValue(value, PERSON_OPTIONS)
    case "I2":
    case "I3":
      return codedValue(value, QUALITY_OPTIONS)
    case "I4": {
      const values = coreValuesFromUnknown(value)
      if (!values) return null
      return values.defined ? values.values.join(", ") : "I haven’t defined these yet"
    }
    case "I5": {
      const ratings = skillRatingsFromUnknown(value)
      if (!ratings) return null
      return SKILL_OPTIONS.map((skill) => {
        const rating = labelOf(SKILL_RATING_OPTIONS, ratings[skill.value])
        return rating ? `${skill.label}: ${rating}` : null
      })
        .filter(Boolean)
        .join("; ")
    }
    case "I6":
      return codedValue(value, BEGINNER_OPTIONS)
    case "I7":
      return codedValue(value, HIRING_WEIGHT_OPTIONS)
    case "I8":
      return codedValue(value, AVAILABILITY_OPTIONS)
    case "I9":
      return codedValue(value, TRAVEL_OPTIONS)
    case "I10":
      return codedValue(value, ARRANGEMENT_OPTIONS)
    case "I11":
      return codedValue(value, POOR_FIT_OPTIONS)
    default:
      return null
  }
}

export function snapshotDisplay(row: ResolvedAnswer, goals: AnswerContext["goals"]): string {
  if (row.state === "skipped") return "Skipped"
  if (row.state === "unanswered") return "Not answered yet"
  if (row.state === "not_applicable") return "Not applicable"
  return formatAnswered(row, goals) ?? "Answered"
}

export function snapshotFingerprint(context: AnswerContext): string {
  const team = context.teamToday
  const payload = {
    goals: context.goals,
    team: team
      ? {
          currentDjCount: team.currentDjCount,
          desiredDjCount: team.desiredDjCount,
          countBasis: team.countBasis,
          desiredCountBasis: team.desiredCountBasis,
          assistantOnlyCount: team.assistantOnlyCount,
          ownerDjFrequency: team.ownerDjFrequency,
          leadCapableCount: team.leadCapableCount,
        }
      : null,
    answers: [...context.answers]
      .filter((row) => row.questionKey !== "R1")
      .sort((left, right) => left.questionKey.localeCompare(right.questionKey))
      .map((row) => [row.questionKey, row.state, row.value]),
  }
  return JSON.stringify(payload)
}

export function parseApproval(raw: unknown): { ok: true; value: ApprovalValue } | { ok: false; error: string } {
  if (typeof raw === "string" && (APPROVAL_CODES as readonly string[]).includes(raw)) {
    return { ok: true, value: { code: raw as ApprovalCode, fingerprint: "" } }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: REVIEW_CHOICE_MESSAGE }
  }
  const record = raw as { code?: unknown; fingerprint?: unknown }
  if (typeof record.code !== "string" || !(APPROVAL_CODES as readonly string[]).includes(record.code)) {
    return { ok: false, error: REVIEW_CHOICE_MESSAGE }
  }
  return {
    ok: true,
    value: {
      code: record.code as ApprovalCode,
      fingerprint: typeof record.fingerprint === "string" ? record.fingerprint : "",
    },
  }
}

export function approvalStillHolds(value: unknown, fingerprint: string): boolean {
  const parsed = parseApproval(value)
  if (!parsed.ok) return false
  if (parsed.value.code !== "approved") return true
  if (!parsed.value.fingerprint) return true
  return parsed.value.fingerprint === fingerprint
}

export function approvalFromUnknown(raw: unknown): ApprovalValue | null {
  const parsed = parseApproval(raw)
  return parsed.ok ? parsed.value : null
}

export function buildBusinessSnapshot(context: AnswerContext, resolved: readonly ResolvedAnswer[]): SnapshotGroup[] {
  return INTAKE_SLUGS.map((slug) => {
    const section = BLUEPRINT_SECTIONS.find((item) => item.slug === slug)!
    const rows = resolved
      .filter((row) => row.question.section === slug)
      .filter((row) => row.question.level === "core" || row.state === "answered" || row.state === "estimated")
      .filter((row) => row.state !== "not_applicable")
      .map((row) => ({
        key: row.key,
        label: SNAPSHOT_LABELS[row.key] ?? row.question.label,
        display: snapshotDisplay(row, context.goals),
        state: row.state,
        isEstimate: row.isEstimate,
      }))
    return {
      slug,
      name: section.name,
      href: `/blueprint/${slug}`,
      privacyNote: slug === "numbers" ? NUMBERS_PRIVACY_NOTE : undefined,
      rows,
    }
  })
}

export function skippedReviewNote() {
  return SKIPPED_REVIEW_NOTE
}

export function completeReviewAnswers(fingerprint = "") {
  return [
    {
      questionKey: "R1",
      state: "answered" as const,
      value: { code: "approved", fingerprint } satisfies ApprovalValue,
    },
  ]
}
