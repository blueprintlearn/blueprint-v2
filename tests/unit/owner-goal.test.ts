import { describe, expect, it } from "vitest"

import {
  OWNER_GOAL_CODES,
  OWNER_GOAL_LABELS,
  OWNER_GOAL_OTHER_MAX_LENGTH,
  parseOwnerGoal,
} from "@/lib/blueprint/goals"
import { SYSTEM_ROLES } from "@/lib/rules/system-role"

describe("owner goal validation", () => {
  it("accepts every stable goal code and labels each one", () => {
    expect([...OWNER_GOAL_CODES]).toEqual([
      "dj_less",
      "stop_djing",
      "scale",
      "expand",
      "improve_quality",
      "create_leadership",
      "other",
    ])

    for (const code of OWNER_GOAL_CODES) {
      expect(OWNER_GOAL_LABELS[code].length).toBeGreaterThan(0)
    }
  })

  it("does not add system roles", () => {
    expect([...SYSTEM_ROLES]).toEqual([
      "owner_admin",
      "manager",
      "trainer_mentor",
      "dj_trainee",
    ])
  })

  it("stores a listed goal and clears other text", () => {
    expect(
      parseOwnerGoal({
        ownerGoal: "stop_djing",
        ownerGoalOther: "  leftover  ",
      }),
    ).toEqual({
      ownerGoal: "stop_djing",
      ownerGoalOther: null,
    })
  })

  it("requires trimmed other text of at most 80 characters", () => {
    expect(parseOwnerGoal({ ownerGoal: "other" })).toBeNull()
    expect(parseOwnerGoal({ ownerGoal: "other", ownerGoalOther: "   " })).toBeNull()
    expect(
      parseOwnerGoal({
        ownerGoal: "other",
        ownerGoalOther: "x".repeat(OWNER_GOAL_OTHER_MAX_LENGTH + 1),
      }),
    ).toBeNull()
    expect(parseOwnerGoal({ ownerGoal: "not-a-goal" })).toBeNull()

    expect(
      parseOwnerGoal({
        ownerGoal: "other",
        ownerGoalOther: "  Grow a second market  ",
      }),
    ).toEqual({
      ownerGoal: "other",
      ownerGoalOther: "Grow a second market",
    })
  })
})
