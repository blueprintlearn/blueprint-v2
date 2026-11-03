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

  it("both live sections complete only when every applicable team core is answered", () => {
    const p = progress(goal, completeTeam(), teamAnswers)
    expect(p.completeCount).toBe(2)
    expect(p.startedCount).toBe(0)
    expect(p.next).toBeNull()
    expect(p.action).toBe("review")
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
    expect(p.action).toBe("review")
    expect(p.next).toBeNull()
  })

  it("resume never lands on a skipped question", () => {
    const p = progress(
      null,
      completeTeam(),
      [...teamAnswers, { questionKey: "G1", state: "skipped", value: null }],
      { lastSection: "goals", lastQuestionKey: "G1" },
    )
    expect(p.action).toBe("review")
    expect(p.next).toBeNull()
  })

  it("hides the started count when none are in progress", () => {
    expect(progress(null, null).startedCount).toBe(0)
    expect(progress(goal, completeTeam(), teamAnswers).startedCount).toBe(0)
  })

  it("marks sections 3 to 8 coming soon and never counts them as complete", () => {
    const p = progress(goal, completeTeam(), teamAnswers)
    for (const section of BLUEPRINT_SECTIONS.filter((s) => !s.live)) {
      expect(p.statuses[section.slug]).toBe("coming_soon")
    }
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

  it("has eight sections, two of them live: goals then team", () => {
    expect(TOTAL_SECTIONS).toBe(8)
    expect(BLUEPRINT_SECTIONS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(LIVE_SECTION_SLUGS).toEqual(["goals", "team"])
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
