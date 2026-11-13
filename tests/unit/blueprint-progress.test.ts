import { describe, expect, it } from "vitest"

import {
  getBlueprintProgressFromStates,
  resolveAll,
  resumeFromRow,
  type AnswerContext,
  type StoredAnswer,
} from "@/lib/blueprint/answers"
import {
  BLUEPRINT_SECTIONS,
  LIVE_SECTION_SLUGS,
  TOTAL_SECTIONS,
} from "@/lib/blueprint/progress"
import { M1_COPY, shouldShowM1 } from "@/lib/blueprint/questions"
import { completeEventsAnswers } from "@/lib/blueprint/events"
import { completeNumbersAnswers } from "@/lib/blueprint/numbers"
import { completeServicesAnswers } from "@/lib/blueprint/services"
import { emptyTeamToday, teamTodayFixture, type AnswerTeamToday } from "@/lib/blueprint/team-today"

const goal = { primary: { goal: "scale" }, others: [] }
const twoGoals = { primary: { goal: "scale" }, others: [{ goal: "expand" }] }

function completeTeam(partial: Partial<AnswerTeamToday> = {}): AnswerTeamToday {
  return teamTodayFixture({
    currentDjCount: 3,
    desiredDjCount: 5,
    countBasis: "excludes_owner",
    desiredCountBasis: "excludes_owner",
    assistantOnlyCount: 1,
    ownerDjFrequency: "sometimes",
    leadCapableCount: 2,
    ...partial,
  })
}

const teamAnswers: StoredAnswer[] = [
  { questionKey: "T4", state: "answered", value: ["manager"] },
  { questionKey: "T5", state: "answered", value: { codes: ["scheduling"], other: null } },
]

function progress(
  goals: AnswerContext["goals"],
  teamToday: AnswerContext["teamToday"],
  answers: StoredAnswer[] = [],
  resume: { lastSection: string; lastQuestionKey: string | null } | null = null,
) {
  const context = { goals, teamToday, answers }
  return getBlueprintProgressFromStates(resolveAll(context), resumeFromRow(resume), context)
}

describe("getBlueprintProgress from answer states", () => {
  it("marks section 1 complete only when a primary goal exists", () => {
    expect(progress(null, null).statuses.goals).toBe("not_started")
    expect(progress(goal, null).statuses.goals).toBe("complete")
  })

  it("is not started with nothing saved: start at Goals", () => {
    const p = progress(null, null)
    expect(p.statuses.goals).toBe("not_started")
    expect(p.statuses.team).toBe("not_started")
    expect(p.completeCount).toBe(0)
    expect(p.startedCount).toBe(0)
    expect(p.next).toBe("goals")
    expect(p.focusQuestionKey).toBe("G1")
    expect(p.action).toBe("start")
  })

  it("goal saved, no team row: continue at Team", () => {
    const p = progress(goal, null)
    expect(p.statuses.goals).toBe("complete")
    expect(p.statuses.team).toBe("not_started")
    expect(p.completeCount).toBe(1)
    expect(p.next).toBe("team")
    expect(p.focusQuestionKey).toBe("T1")
    expect(p.action).toBe("continue")
  })

  it("legacy counts with unknown basis need attention and count as started", () => {
    const legacy = teamTodayFixture({ currentDjCount: 3, desiredDjCount: 5 })
    const p = progress(goal, legacy)
    expect(p.statuses.team).toBe("needs_attention")
    expect(p.toAnswerCounts.team).toBeGreaterThan(0)
    expect(p.startedCount).toBe(1)
    expect(p.focusQuestionKey).toBe("T0")
    expect(p.action).toBe("continue")
  })

  it("team only with no goal: Team needs attention, still resume at Goals", () => {
    const p = progress(null, teamTodayFixture({ currentDjCount: 3 }))
    expect(p.statuses.team).toBe("needs_attention")
    expect(p.completeCount).toBe(0)
    expect(p.next).toBe("goals")
    expect(p.action).toBe("continue")
  })

  it("confirmed current count without the rest: Team needs attention at T1b", () => {
    const p = progress(
      goal,
      teamTodayFixture({ currentDjCount: 3, countBasis: "excludes_owner" }),
    )
    expect(p.statuses.team).toBe("needs_attention")
    expect(p.completeCount).toBe(1)
    expect(p.next).toBe("team")
    expect(p.focusQuestionKey).toBe("T1b")
    expect(p.action).toBe("continue")
  })

  it("a confirmed 0 counts as answered T1 and makes T3 not applicable", () => {
    const zero = teamTodayFixture({
      currentDjCount: 0,
      countBasis: "excludes_owner",
      assistantOnlyCount: 0,
      ownerDjFrequency: "no",
      desiredDjCount: 0,
      desiredCountBasis: "excludes_owner",
    })
    expect(progress(goal, zero, teamAnswers).statuses.team).toBe("complete")
    expect(resolveAll({ goals: goal, teamToday: zero, answers: teamAnswers }).find((row) => row.key === "T3")?.state).toBe(
      "not_applicable",
    )
  })

  it("goals and team complete still continue into Your events", () => {
    const p = progress(goal, completeTeam(), teamAnswers)
    expect(p.completeCount).toBe(2)
    expect(p.startedCount).toBe(0)
    expect(p.statuses.events).toBe("not_started")
    expect(p.next).toBe("events")
    expect(p.focusQuestionKey).toBe("E1")
    expect(p.action).toBe("continue")
  })

  it("marks Your events complete only when every events core is answered, not skipped", () => {
    const complete = progress(goal, completeTeam(), [...teamAnswers, ...completeEventsAnswers()])
    expect(complete.statuses.events).toBe("complete")
    expect(complete.completeCount).toBe(3)
    expect(complete.next).toBe("services")
    expect(complete.focusQuestionKey).toBe("S1")
    expect(complete.action).toBe("continue")

    const skippedVolume = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers().filter((row) => row.questionKey !== "E2"),
      { questionKey: "E2", state: "skipped", value: null },
    ])
    expect(skippedVolume.statuses.events).toBe("needs_attention")
    expect(skippedVolume.skippedCounts.events).toBe(1)
    expect(skippedVolume.completeCount).toBe(2)
    expect(skippedVolume.action).toBe("continue")
    expect(skippedVolume.next).toBe("services")
    expect(skippedVolume.focusQuestionKey).toBe("S1")
    expect(skippedVolume.revisitKeys.events).toBe("E2")
    expect(skippedVolume.skippedKeys.events).toBe("E2")
  })

  it("counts an estimated annual volume as complete", () => {
    const p = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers().map((row) =>
        row.questionKey === "E2" ? { ...row, state: "estimated" as const } : row,
      ),
    ])
    expect(p.statuses.events).toBe("complete")
    expect(p.completeCount).toBe(3)
  })

  it("skipped G1 is needs attention and never complete", () => {
    const p = progress(null, null, [{ questionKey: "G1", state: "skipped", value: null }])
    expect(p.statuses.goals).toBe("needs_attention")
    expect(p.completeCount).toBe(0)
    expect(p.skippedCounts.goals).toBe(1)
    expect(p.action).toBe("continue")
    expect(p.next).toBe("team")
  })

  it("answering only Go deeper moves goals from not started to needs attention", () => {
    const p = progress(null, null, [{ questionKey: "G3", state: "answered", value: "no_set_date" }])
    expect(p.statuses.goals).toBe("needs_attention")
    expect(p.completeCount).toBe(0)
  })

  it("G2 is not applicable with one goal, so one goal completes the section", () => {
    const resolved = resolveAll({ goals: goal, teamToday: null, answers: [] })
    expect(resolved.find((row) => row.key === "G2")?.state).toBe("not_applicable")
    expect(progress(goal, null).statuses.goals).toBe("complete")
    expect(progress(twoGoals, null).statuses.goals).toBe("complete")
  })

  it("resume prefers the last section when it still has an unanswered core", () => {
    const p = progress(
      goal,
      teamTodayFixture({ currentDjCount: 3, countBasis: "excludes_owner" }),
      [],
      { lastSection: "team", lastQuestionKey: "T1" },
    )
    expect(p.next).toBe("team")
    expect(p.focusQuestionKey).toBe("T1b")
  })

  it("skipped T1 with the other cores answered needs attention and reviews", () => {
    const p = progress(goal, completeTeam({ currentDjCount: null, countBasis: "unknown", leadCapableCount: null }), [
      ...teamAnswers,
      { questionKey: "T1", state: "skipped", value: null },
    ])
    expect(p.statuses.team).toBe("needs_attention")
    expect(p.completeCount).toBe(1)
    expect(p.startedCount).toBe(1)
    expect(p.skippedCounts.team).toBe(1)
    expect(p.action).toBe("continue")
    expect(p.next).toBe("events")
    expect(p.focusQuestionKey).toBe("E1")
  })

  it("resume prefers unanswered cores over skipped ones", () => {
    const p = progress(
      null,
      completeTeam(),
      [...teamAnswers, { questionKey: "G1", state: "skipped", value: null }],
      { lastSection: "goals", lastQuestionKey: "G1" },
    )
    expect(p.focusQuestionKey).not.toBe("G1")
    expect(p.next).toBe("events")
    expect(p.focusQuestionKey).toBe("E1")
    expect(p.action).toBe("continue")
    expect(p.revisitKeys.goals).toBe("G1")
    expect(p.skippedKeys.goals).toBe("G1")
  })

  it("continues to a skipped question when that is what still needs attention", () => {
    const p = progress(null, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
      { questionKey: "G1", state: "skipped", value: null },
    ])
    expect(p.statuses.goals).toBe("needs_attention")
    expect(p.completeCount).toBe(4)
    expect(p.action).toBe("continue")
    expect(p.next).toBe("goals")
    expect(p.focusQuestionKey).toBe("G1")
  })

  it("marks Your services complete only when every services core is answered, not skipped", () => {
    const complete = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
    ])
    expect(complete.statuses.services).toBe("complete")
    expect(complete.completeCount).toBe(4)
    expect(complete.next).toBe("numbers")
    expect(complete.focusQuestionKey).toBe("N1")
    expect(complete.action).toBe("continue")

    const skippedTraining = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers().filter((row) => row.questionKey !== "S2"),
      { questionKey: "S2", state: "skipped", value: null },
    ])
    expect(skippedTraining.statuses.services).toBe("needs_attention")
    expect(skippedTraining.skippedCounts.services).toBe(1)
    expect(skippedTraining.completeCount).toBe(3)
    expect(skippedTraining.action).toBe("continue")
    expect(skippedTraining.next).toBe("numbers")
    expect(skippedTraining.focusQuestionKey).toBe("N1")

    const skippedWhenLaterDone = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers().filter((row) => row.questionKey !== "S2"),
      { questionKey: "S2", state: "skipped", value: null },
      ...completeNumbersAnswers(),
    ])
    expect(skippedWhenLaterDone.next).toBe("services")
    expect(skippedWhenLaterDone.focusQuestionKey).toBe("S2")
  })

  it("hides the started count when none are in progress", () => {
    expect(progress(null, null).startedCount).toBe(0)
    expect(progress(goal, completeTeam(), teamAnswers).startedCount).toBe(0)
  })

  it("marks sections 4 to 8 coming soon and never counts them as complete", () => {
    const p = progress(goal, completeTeam(), teamAnswers)
    for (const section of BLUEPRINT_SECTIONS.filter((s) => !s.live)) {
      expect(p.statuses[section.slug]).toBe("coming_soon")
    }
    expect(p.statuses.events).not.toBe("coming_soon")
    expect(p.statuses.services).not.toBe("coming_soon")
    expect(p.statuses.numbers).not.toBe("coming_soon")
    expect(p.completeCount).toBeLessThan(TOTAL_SECTIONS)
  })

  it("uses the approved section names, in order, with the matching slugs", () => {
    expect(BLUEPRINT_SECTIONS.map((s) => [s.slug, s.name])).toEqual([
      ["goals", "Your goals"],
      ["team", "Your team today"],
      ["events", "Your events"],
      ["services", "Your services and market"],
      ["numbers", "Your numbers"],
      ["development", "How you develop DJs"],
      ["ideal-dj", "Your ideal DJ"],
      ["review", "Your Blueprint"],
    ])
  })

  it("marks Your numbers complete only when every numbers core is answered, not skipped", () => {
    const complete = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
    ])
    expect(complete.statuses.numbers).toBe("complete")
    expect(complete.completeCount).toBe(5)
    expect(complete.next).toBeNull()
    expect(complete.action).toBe("review")

    const skippedRevenue = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers().filter((row) => row.questionKey !== "N1"),
      { questionKey: "N1", state: "skipped", value: null },
    ])
    expect(skippedRevenue.statuses.numbers).toBe("needs_attention")
    expect(skippedRevenue.skippedCounts.numbers).toBe(1)
    expect(skippedRevenue.completeCount).toBe(4)
    expect(skippedRevenue.next).toBe("numbers")
    expect(skippedRevenue.focusQuestionKey).toBe("N1")

    const withoutTarget = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers().filter((row) => row.questionKey !== "N9"),
    ])
    expect(withoutTarget.statuses.numbers).toBe("complete")
  })

  it("treats N2 as answered when E2 is answered, and skipped when E2 is skipped", () => {
    const shared = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
    ])
    expect(shared.statuses.events).toBe("complete")
    expect(shared.statuses.numbers).toBe("complete")

    const skippedVolume = progress(goal, completeTeam(), [
      ...teamAnswers,
      ...completeEventsAnswers().filter((row) => row.questionKey !== "E2"),
      { questionKey: "E2", state: "skipped", value: null },
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
    ])
    expect(skippedVolume.statuses.events).toBe("needs_attention")
    expect(skippedVolume.statuses.numbers).toBe("needs_attention")
    expect(skippedVolume.skippedKeys.numbers).toBe("N2")
    expect(skippedVolume.revisitKeys.numbers).toBe("N2")
  })

  it("has eight sections, five of them live: goals, team, events, services, then numbers", () => {
    expect(TOTAL_SECTIONS).toBe(8)
    expect(BLUEPRINT_SECTIONS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(LIVE_SECTION_SLUGS).toEqual(["goals", "team", "events", "services", "numbers"])
  })

  it("builds M1 copy now but does not show it (D-4b)", () => {
    expect(shouldShowM1()).toBe(false)
    expect(M1_COPY.scale).toContain("enough ready DJs")
    expect(M1_COPY.other).toContain("{text}")
  })

  it("does not treat an empty team object as started", () => {
    expect(progress(null, emptyTeamToday()).statuses.team).toBe("not_started")
  })
})
