import {
  BLUEPRINT_SECTIONS,
  LIVE_SECTION_SLUGS,
  TOTAL_SECTIONS,
  type BlueprintProgress,
  type BlueprintSectionSlug,
  type SectionStatus,
} from "@/lib/blueprint/progress"
import {
  QUESTION_BY_KEY,
  QUESTIONS,
  isQuestionKey,
  questionsForSection,
  type QuestionDefinition,
  type QuestionKey,
} from "@/lib/blueprint/questions"
import {
  hasStoredTeamCount,
  isConfirmedCount,
  t0Shown,
  type AnswerTeamToday,
} from "@/lib/blueprint/team-today"

export type AnswerGoals = {
  primary: { goal: string }
  others: readonly unknown[]
}

export type { AnswerTeamToday }

export type AnswerState = "unanswered" | "answered" | "estimated" | "skipped" | "not_applicable"

export type StoredAnswer = {
  questionKey: string
  state: "answered" | "estimated" | "skipped"
  value: unknown
}

export type AnswerContext = {
  goals: AnswerGoals | null
  teamToday: AnswerTeamToday | null
  answers: readonly StoredAnswer[]
}

export type ResolvedAnswer = {
  key: QuestionKey
  state: AnswerState
  value: unknown
  isEstimate: boolean
  question: QuestionDefinition
}

export type MissingInput = {
  questionKey: QuestionKey
  state: "skipped" | "unanswered"
  section: BlueprintSectionSlug
  href: string
  whyNeeded: string
  questionLabel: string
}

export type InputState = {
  questionKey: QuestionKey
  state: AnswerState
  value: unknown
  isEstimate: boolean
}

export type BlueprintResume = {
  lastSection: BlueprintSectionSlug | null
  lastQuestionKey: QuestionKey | null
}

export function resumeFromRow(
  row: { lastSection: string; lastQuestionKey: string | null } | null,
): BlueprintResume | null {
  if (!row) return null
  const key = row.lastQuestionKey
  return {
    lastSection: row.lastSection as BlueprintSectionSlug,
    lastQuestionKey: key && isQuestionKey(key) ? key : null,
  }
}

export function storedAnswerMap(answers: readonly StoredAnswer[]): Map<string, StoredAnswer> {
  return new Map(answers.map((row) => [row.questionKey, row]))
}

export function isQuestionApplicable(question: QuestionDefinition, context: AnswerContext): boolean {
  if (question.key === "G2") {
    const count = context.goals ? 1 + context.goals.others.length : 0
    return count >= 2
  }
  if (question.key === "T0") return t0Shown(context.teamToday)
  if (question.key === "T3") {
    return isConfirmedCount(context.teamToday?.currentDjCount ?? null, context.teamToday?.countBasis ?? "unknown")
      && (context.teamToday?.currentDjCount ?? 0) > 0
  }
  if (question.key === "T7") {
    const current = context.teamToday
    return (
      isConfirmedCount(current?.currentDjCount ?? null, current?.countBasis ?? "unknown") &&
      isConfirmedCount(current?.desiredDjCount ?? null, current?.desiredCountBasis ?? "unknown") &&
      (current?.desiredDjCount ?? 0) > (current?.currentDjCount ?? 0)
    )
  }
  return true
}

export function typedValue(question: QuestionDefinition, context: AnswerContext): unknown {
  const team = context.teamToday
  switch (question.key) {
    case "G1":
      return context.goals ? context.goals.primary.goal : null
    case "G2":
      return context.goals && context.goals.others.length >= 1 ? context.goals.primary.goal : null
    case "T0":
      return team && team.countBasis !== "unknown" ? team.countBasis : null
    case "T1":
      return team && isConfirmedCount(team.currentDjCount, team.countBasis) ? team.currentDjCount : null
    case "T1b":
      return team?.assistantOnlyCount ?? null
    case "T2":
      return team?.ownerDjFrequency ?? null
    case "T3":
      return team?.leadCapableCount ?? null
    case "T6":
      return team && isConfirmedCount(team.desiredDjCount, team.desiredCountBasis)
        ? team.desiredDjCount
        : null
    default:
      return null
  }
}

export function resolveQuestion(question: QuestionDefinition, context: AnswerContext): ResolvedAnswer {
  if (!isQuestionApplicable(question, context)) {
    return { key: question.key, state: "not_applicable", value: null, isEstimate: false, question }
  }

  if (question.storage === "typed") {
    const value = typedValue(question, context)
    if (value !== null && value !== undefined) {
      return { key: question.key, state: "answered", value, isEstimate: false, question }
    }
  } else {
    const stored = storedAnswerMap(context.answers).get(question.key)
    if (stored && (stored.state === "answered" || stored.state === "estimated")) {
      return {
        key: question.key,
        state: stored.state,
        value: stored.value,
        isEstimate: stored.state === "estimated",
        question,
      }
    }
    if (stored?.state === "skipped") {
      return { key: question.key, state: "skipped", value: null, isEstimate: false, question }
    }
  }

  const skip = storedAnswerMap(context.answers).get(question.key)
  if (skip?.state === "skipped") {
    return { key: question.key, state: "skipped", value: null, isEstimate: false, question }
  }

  return { key: question.key, state: "unanswered", value: null, isEstimate: false, question }
}

export function resolveAll(context: AnswerContext): ResolvedAnswer[] {
  return QUESTIONS.map((question) => resolveQuestion(question, context))
}

export function resolvedValue(resolved: ResolvedAnswer): unknown {
  if (resolved.state === "answered" || resolved.state === "estimated") return resolved.value
  return null
}

export function sectionStatusFromStates(
  section: BlueprintSectionSlug,
  resolved: readonly ResolvedAnswer[],
  live: boolean,
  context?: AnswerContext,
): SectionStatus {
  if (!live) return "coming_soon"

  const inSection = resolved.filter((row) => row.question.section === section)
  const cores = inSection.filter((row) => row.question.level === "core")
  const complete = cores.every((row) =>
    row.state === "answered" || row.state === "estimated" || row.state === "not_applicable",
  )
  if (complete && cores.length > 0) return "complete"

  const touched = inSection.some(
    (row) => row.state === "answered" || row.state === "estimated" || row.state === "skipped",
  )
  if (touched) return "needs_attention"
  if (section === "team" && hasStoredTeamCount(context?.teamToday ?? null)) return "needs_attention"
  return "not_started"
}

export function toAnswerCount(section: BlueprintSectionSlug, resolved: readonly ResolvedAnswer[]): number {
  return resolved.filter(
    (row) =>
      row.question.section === section &&
      row.question.level === "core" &&
      row.state === "unanswered",
  ).length
}

export function skippedCount(section: BlueprintSectionSlug, resolved: readonly ResolvedAnswer[]): number {
  return resolved.filter((row) => row.question.section === section && row.state === "skipped").length
}

export function anythingTouched(resolved: readonly ResolvedAnswer[]): boolean {
  return resolved.some(
    (row) => row.state === "answered" || row.state === "estimated" || row.state === "skipped",
  )
}

function unansweredCores(section: BlueprintSectionSlug, resolved: readonly ResolvedAnswer[]): ResolvedAnswer[] {
  return resolved.filter(
    (row) =>
      row.question.section === section &&
      row.question.level === "core" &&
      row.state === "unanswered",
  )
}

function skippedCores(section: BlueprintSectionSlug, resolved: readonly ResolvedAnswer[]): ResolvedAnswer[] {
  return resolved.filter(
    (row) =>
      row.question.section === section &&
      row.question.level === "core" &&
      row.state === "skipped",
  )
}

function firstCoreInOrder(
  sections: readonly BlueprintSectionSlug[],
  resolved: readonly ResolvedAnswer[],
  pick: (section: BlueprintSectionSlug) => ResolvedAnswer | undefined,
): { section: BlueprintSectionSlug; questionKey: QuestionKey } | null {
  for (const section of sections) {
    const first = pick(section)
    if (first) return { section, questionKey: first.key }
  }
  return null
}

export function continueTarget(
  resolved: readonly ResolvedAnswer[],
  resume: BlueprintResume | null,
): { section: BlueprintSectionSlug; questionKey: QuestionKey } | null {
  const live = LIVE_SECTION_SLUGS
  const last = resume?.lastSection && live.includes(resume.lastSection) ? resume.lastSection : null
  const afterLast = last ? live.slice(live.indexOf(last) + 1) : []
  const searchUnanswered = last ? [last, ...afterLast, ...live] : live
  const unanswered = firstCoreInOrder(searchUnanswered, resolved, (section) => unansweredCores(section, resolved)[0])
  if (unanswered) return unanswered

  const searchSkipped = last ? [last, ...afterLast, ...live] : live
  return firstCoreInOrder(searchSkipped, resolved, (section) => skippedCores(section, resolved)[0])
}

export function revisitKey(
  section: BlueprintSectionSlug,
  resolved: readonly ResolvedAnswer[],
): QuestionKey | null {
  return unansweredCores(section, resolved)[0]?.key ?? skippedCores(section, resolved)[0]?.key ?? null
}

export function getBlueprintProgressFromStates(
  resolved: readonly ResolvedAnswer[],
  resume: BlueprintResume | null,
  context?: AnswerContext,
): BlueprintProgress {
  const statuses = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [
      section.slug,
      sectionStatusFromStates(section.slug, resolved, section.live, context),
    ]),
  ) as Record<BlueprintSectionSlug, SectionStatus>

  const skippedCounts = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [section.slug, skippedCount(section.slug, resolved)]),
  ) as Record<BlueprintSectionSlug, number>

  const toAnswerCounts = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [section.slug, toAnswerCount(section.slug, resolved)]),
  ) as Record<BlueprintSectionSlug, number>

  const completeCount = LIVE_SECTION_SLUGS.filter((slug) => statuses[slug] === "complete").length
  const startedCount = LIVE_SECTION_SLUGS.filter((slug) => statuses[slug] === "needs_attention").length
  const target = continueTarget(resolved, resume)
  const revisitKeys = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [section.slug, revisitKey(section.slug, resolved)]),
  ) as Record<BlueprintSectionSlug, QuestionKey | null>
  const skippedKeys = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [section.slug, skippedCores(section.slug, resolved)[0]?.key ?? null]),
  ) as Record<BlueprintSectionSlug, QuestionKey | null>
  const teamStartedOnly =
    Boolean(context && hasStoredTeamCount(context.teamToday)) &&
    !anythingTouched(resolved) &&
    statuses.team === "needs_attention"
  const action = !anythingTouched(resolved) && !teamStartedOnly ? "start" : target ? "continue" : "review"

  return {
    statuses,
    skippedCounts,
    toAnswerCounts,
    completeCount,
    startedCount,
    next: target?.section ?? null,
    focusQuestionKey: target?.questionKey ?? null,
    revisitKeys,
    skippedKeys,
    action,
  }
}

export function getMissingInputs(context: AnswerContext, questionKeys: readonly string[]): MissingInput[] {
  const missing: MissingInput[] = []
  for (const key of questionKeys) {
    if (!isQuestionKey(key)) continue
    const resolved = resolveQuestion(QUESTION_BY_KEY[key], context)
    if (resolved.state !== "skipped" && resolved.state !== "unanswered") continue
    missing.push({
      questionKey: resolved.key,
      state: resolved.state,
      section: resolved.question.section,
      href: `/blueprint/${resolved.question.section}#q-${resolved.key}`,
      whyNeeded: resolved.question.whyNeeded,
      questionLabel: resolved.question.label,
    })
  }
  return missing
}

export function getInputStates(context: AnswerContext, questionKeys: readonly string[]): InputState[] {
  return questionKeys.filter(isQuestionKey).map((key) => {
    const resolved = resolveQuestion(QUESTION_BY_KEY[key], context)
    return {
      questionKey: resolved.key,
      state: resolved.state,
      value: resolvedValue(resolved),
      isEstimate: resolved.isEstimate,
    }
  })
}

export function firstUnansweredCore(
  section: BlueprintSectionSlug,
  resolved: readonly ResolvedAnswer[],
): QuestionKey | null {
  return unansweredCores(section, resolved)[0]?.key ?? null
}

export function sectionHref(slug: BlueprintSectionSlug, questionKey?: string | null) {
  return questionKey ? `/blueprint/${slug}#q-${questionKey}` : `/blueprint/${slug}`
}

export { questionsForSection, TOTAL_SECTIONS }
