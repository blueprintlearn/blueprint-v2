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

const goal = { primary: { goal: "scale" }, others: [] }
const twoGoals = { primary: { goal: "scale" }, others: [{ goal: "expand" }] }
const team = (desired: number | null, current = 3) => ({ currentDjCount: current, desiredDjCount: desired })

function progress(
  goals: AnswerContext["goals"],
  teamToday: AnswerContext["teamToday"],
  answers: StoredAnswer[] = [],
  resume: { lastSection: string; lastQuestionKey: string | null } | null = null,
) {
  return getBlueprintProgressFromStates(resolveAll({ goals, teamToday, answers }), resumeFromRow(resume))
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
    expect(p.focusQuestionKey).toBe("TL1")
    expect(p.action).toBe("continue")
  })

  it("team only with no goal: Team needs attention, still resume at Goals", () => {
    const p = progress(null, team(null))
    expect(p.statuses.team).toBe("needs_attention")
    expect(p.completeCount).toBe(0)
    expect(p.next).toBe("goals")
    expect(p.action).toBe("continue")
  })

  it("current DJ count saved but desired not: Team needs attention", () => {
    const p = progress(goal, team(null))
    expect(p.statuses.team).toBe("needs_attention")
    expect(p.completeCount).toBe(1)
    expect(p.next).toBe("team")
    expect(p.focusQuestionKey).toBe("TL6")
    expect(p.action).toBe("continue")
  })

  it("a saved 0 counts as answered, only a missing value is unanswered", () => {
    expect(progress(goal, team(0, 0)).statuses.team).toBe("complete")
    expect(progress(goal, team(null, 0)).statuses.team).toBe("needs_attention")
  })

  it("both live sections complete: nothing left, review", () => {
    const p = progress(goal, team(5))
    expect(p.completeCount).toBe(2)
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
    const p = progress(goal, team(null), [], { lastSection: "team", lastQuestionKey: "TL1" })
    expect(p.next).toBe("team")
    expect(p.focusQuestionKey).toBe("TL6")
  })

  it("resume never lands on a skipped question", () => {
    const p = progress(
      null,
      team(5),
      [{ questionKey: "G1", state: "skipped", value: null }],
      { lastSection: "goals", lastQuestionKey: "G1" },
    )
    expect(p.action).toBe("review")
    expect(p.next).toBeNull()
  })

  it("marks sections 3 to 8 coming soon and never counts them as complete", () => {
    const p = progress(goal, team(5))
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
})
