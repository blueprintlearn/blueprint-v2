import { sectionHref, type AnswerContext, type ResolvedAnswer } from "@/lib/blueprint/answers"
import type { QuestionKey } from "@/lib/blueprint/questions"
import {
  NUMBERS_PRIVACY_NOTE,
  approvalStillHolds,
  parseStoredApproval,
  snapshotDisplay,
  snapshotFingerprint,
  snapshotLabel,
} from "@/lib/blueprint/review"

/**
 * Read-only view of the current approved onboarding version.
 *
 * Available from Stage 1 (never computed, never invented):
 * - Staffing / current team: T0–T5, T8, E4–E6, I8–I10
 * - Desired growth: G1–G3, T6–T7, E7–E9, S7–S9, N8–N9, D9
 * - Event demand: E1–E3, S2 (N2 is the same stored answer as E2)
 * - Pricing / market: S1, S4–S6, N1, N3–N7
 * - Training resources: D1–D8, D10, S3, I5–I6
 *
 * Not collected in Stage 1 (listed as gaps, not as skipped questions):
 * named competitors, named packages / formal price tiers, a utilization or
 * events-per-DJ target, training pay, employee vs contractor classification,
 * and operating markets / geography.
 */
export const FINDINGS_OPENING =
  "This is what Blueprint knows from the Blueprint you approved. Confirmed answers, estimates, and gaps are listed as you entered them. Blueprint has not built a growth plan yet."
export const FINDINGS_NEEDS_APPROVAL =
  "Findings come from the version you approve, not from guesses."
export const FINDINGS_STALE =
  "You changed an earlier answer, so this is no longer the approved version. Approve your Blueprint again to see current findings. Blueprint will not show the old summary as if it were still current."
export const FINDINGS_CLARIFICATION_INTRO =
  "These questions are still open. Filling them in will give Blueprint a clearer picture before a growth plan."
export const FINDINGS_NOT_COLLECTED_INTRO =
  "Stage 1 did not ask about these. They are listed so nothing is invented to fill the gap."
export const FINDINGS_REVIEW_CTA = "Review your Blueprint"
export const FINDINGS_PAGE_TITLE = "Business findings"

export type FindingsGate = "current" | "needs_approval" | "stale"

export type FindingsKind = "confirmed" | "estimated" | "skipped" | "missing"

export type FindingsFact = {
  key: string
  label: string
  display: string
  kind: FindingsKind
  href: string
  why: string
}

export type FindingsGroupId = "team" | "growth" | "demand" | "pricing" | "training"

export type FindingsGroup = {
  id: FindingsGroupId
  title: string
  intro: string
  privacyNote?: string
  facts: FindingsFact[]
}

export type NotCollectedItem = {
  title: string
  note: string
}

export type BusinessFindings = {
  gate: FindingsGate
  groups: FindingsGroup[]
  needsClarification: FindingsFact[]
  notCollected: readonly NotCollectedItem[]
}

export const NOT_COLLECTED: readonly NotCollectedItem[] = [
  {
    title: "Named competitors",
    note: "Onboarding asked what you compete on, not who you compete with.",
  },
  {
    title: "Named packages or formal price tiers",
    note: "Onboarding asked where you sit in the market and a typical event price, not a packaged menu.",
  },
  {
    title: "A target utilization or events per DJ",
    note: "Onboarding asked headcount and event volume separately. Blueprint has not calculated how many DJs the work needs.",
  },
  {
    title: "Training pay",
    note: "Onboarding asked who trains and how, not what you pay people while they learn.",
  },
  {
    title: "Employee or contractor classification",
    note: "Onboarding asked how you prefer people to work, not how they are classified today.",
  },
  {
    title: "Operating markets or geography",
    note: "Onboarding asked how far DJs travel, not which cities or regions you serve.",
  },
]

const GROUPS: {
  id: FindingsGroupId
  title: string
  intro: string
  privacyNote?: string
  keys: readonly QuestionKey[]
}[] = [
  {
    id: "team",
    title: "Current team",
    intro: "Who you have today, who can lead, and how events are staffed.",
    keys: ["T0", "T1", "T1b", "T2", "T3", "T4", "T5", "T8", "E4", "E5", "E6", "I8", "I9", "I10"],
  },
  {
    id: "growth",
    title: "Desired growth",
    intro: "Where you said you want the company to go.",
    keys: ["G1", "G2", "G3", "T6", "T7", "E7", "E8", "E9", "S7", "S8", "S9", "N8", "N9", "D9"],
  },
  {
    id: "demand",
    title: "Event demand",
    intro: "What you book today and how busy the year is.",
    keys: ["E1", "E2", "E3", "S2"],
  },
  {
    id: "pricing",
    title: "Pricing",
    intro: "How you sit in the market and what events typically cost.",
    privacyNote: NUMBERS_PRIVACY_NOTE,
    keys: ["S1", "S4", "S5", "S6", "N1", "N3", "N4", "N5", "N6", "N7"],
  },
  {
    id: "training",
    title: "Training resources",
    intro: "How people learn today, who trains them, and what you already have to work with.",
    keys: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D10", "S3", "I5", "I6"],
  },
]

export function findingsGate(context: AnswerContext): FindingsGate {
  const stored = context.answers.find((row) => row.questionKey === "R1")
  if (!stored || stored.state !== "answered") return "needs_approval"
  const parsed = parseStoredApproval(stored.value)
  if (!parsed.ok || parsed.value.code !== "approved") return "needs_approval"
  return approvalStillHolds(parsed.value, snapshotFingerprint(context)) ? "current" : "stale"
}

export function findingsAreCurrent(context: AnswerContext): boolean {
  return findingsGate(context) === "current"
}

function kindOf(row: ResolvedAnswer): FindingsKind | null {
  if (row.state === "not_applicable") return null
  if (row.state === "answered") return "confirmed"
  if (row.state === "estimated") return "estimated"
  if (row.state === "skipped") return "skipped"
  if (row.state === "unanswered") {
    if (row.question.level === "go_deeper") return null
    return "missing"
  }
  return null
}

function toFact(row: ResolvedAnswer, goals: AnswerContext["goals"], kind: FindingsKind): FindingsFact {
  return {
    key: row.key,
    label: snapshotLabel(row.key, row.question.label),
    display: snapshotDisplay(row, goals),
    kind,
    href: sectionHref(row.question.section, row.key),
    why: row.question.whyNeeded,
  }
}

export function buildBusinessFindings(context: AnswerContext, resolved: readonly ResolvedAnswer[]): BusinessFindings {
  const byKey = new Map(resolved.map((row) => [row.key, row]))
  const groups = GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    intro: group.intro,
    privacyNote: group.privacyNote,
    facts: group.keys.flatMap((key) => {
      const row = byKey.get(key)
      if (!row) return []
      const kind = kindOf(row)
      if (!kind) return []
      return [toFact(row, context.goals, kind)]
    }),
  }))

  const needsClarification = resolved.flatMap((row) => {
    if (row.question.section === "review") return []
    if (row.question.level !== "core") return []
    if (row.state !== "skipped" && row.state !== "unanswered") return []
    const kind = kindOf(row)
    if (kind !== "skipped" && kind !== "missing") return []
    return [toFact(row, context.goals, kind)]
  })

  return {
    gate: findingsGate(context),
    groups,
    needsClarification,
    notCollected: NOT_COLLECTED,
  }
}
