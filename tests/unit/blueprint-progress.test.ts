import { describe, expect, it } from "vitest"

import {
  BLUEPRINT_SECTIONS,
  getBlueprintProgress,
  LIVE_SECTION_SLUGS,
  TOTAL_SECTIONS,
} from "@/lib/blueprint/progress"

const goal = { ownerGoal: "scale" as const }
const team = (desired: number | null, current = 3) => ({ currentDjCount: current, desiredDjCount: desired })

describe("getBlueprintProgress", () => {
  it("is not started with nothing saved: start at Goals", () => {
    const p = getBlueprintProgress(null, null)
    expect(p.statuses.goals).toBe("not_started")
    expect(p.statuses.team).toBe("not_started")
    expect(p.doneCount).toBe(0)
    expect(p.next).toBe("goals")
    expect(p.action).toBe("start")
  })

  it("goal saved, no team row: continue at Team", () => {
    const p = getBlueprintProgress(goal, null)
    expect(p.statuses.goals).toBe("done")
    expect(p.statuses.team).toBe("not_started")
    expect(p.doneCount).toBe(1)
    expect(p.next).toBe("team")
    expect(p.action).toBe("continue")
  })

  it("team only with no goal: Team is in progress, still resume at Goals", () => {
    const p = getBlueprintProgress(null, team(null))
    expect(p.statuses.team).toBe("in_progress")
    expect(p.doneCount).toBe(0)
    expect(p.next).toBe("goals")
    expect(p.action).toBe("continue")
  })

  it("current DJ count saved but desired not: Team is in progress", () => {
    const p = getBlueprintProgress(goal, team(null))
    expect(p.statuses.team).toBe("in_progress")
    expect(p.doneCount).toBe(1)
    expect(p.next).toBe("team")
    expect(p.action).toBe("continue")
  })

  it("a saved 0 counts as answered, only a missing value is unanswered", () => {
    expect(getBlueprintProgress(goal, team(0, 0)).statuses.team).toBe("done")
    expect(getBlueprintProgress(goal, team(null, 0)).statuses.team).toBe("in_progress")
  })

  it("both live sections done: nothing left, review", () => {
    const p = getBlueprintProgress(goal, team(5))
    expect(p.doneCount).toBe(2)
    expect(p.next).toBeNull()
    expect(p.action).toBe("review")
  })

  it("marks sections 3 to 8 coming soon and never counts them as done", () => {
    const p = getBlueprintProgress(goal, team(5))
    for (const section of BLUEPRINT_SECTIONS.filter((s) => !s.live)) {
      expect(p.statuses[section.slug]).toBe("coming_soon")
    }
    expect(p.doneCount).toBeLessThan(TOTAL_SECTIONS)
  })

  it("has eight sections, two of them live: goals then team", () => {
    expect(TOTAL_SECTIONS).toBe(8)
    expect(BLUEPRINT_SECTIONS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(LIVE_SECTION_SLUGS).toEqual(["goals", "team"])
  })
})
