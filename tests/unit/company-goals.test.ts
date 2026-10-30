import { describe, expect, it } from "vitest"

import {
  CHOOSE_ONE_GOAL_MESSAGE,
  CHOOSE_PRIMARY_GOAL_MESSAGE,
  DJ_PAIR_MESSAGE,
  DJ_PAIR_NOTE,
  SAVE_COMPANY_GOALS_ERROR_CODES,
  alsoLine,
  mapSaveCompanyGoalsError,
  parseCompanyGoals,
  reconcileGoalSelection,
} from "@/lib/blueprint/company-goals"
import { OWNER_GOAL_OTHER_REQUIRED_MESSAGE } from "@/lib/blueprint/goals"

describe("parseCompanyGoals", () => {
  it("refuses an empty set", () => {
    expect(parseCompanyGoals({ goals: [] })).toEqual({ ok: false, error: CHOOSE_ONE_GOAL_MESSAGE })
  })

  it("accepts one goal as the primary", () => {
    expect(parseCompanyGoals({ goals: ["scale"], primary: "scale" })).toEqual({
      ok: true,
      value: { goals: ["scale"], primary: "scale", otherText: null },
    })
  })

  it("accepts the largest valid set (six goals, one of the DJ pair)", () => {
    const goals = ["dj_less", "scale", "expand", "improve_quality", "create_leadership", "other"]
    expect(parseCompanyGoals({ goals, primary: "scale", otherText: "Open a second market" }).ok).toBe(true)
  })

  it("refuses eight goals and duplicates", () => {
    expect(parseCompanyGoals({ goals: ["scale", "scale"], primary: "scale" }).ok).toBe(false)
    expect(
      parseCompanyGoals({
        goals: ["dj_less", "scale", "expand", "improve_quality", "create_leadership", "other", "stop_djing", "scale"],
        primary: "scale",
        otherText: "x",
      }).ok,
    ).toBe(false)
  })

  it("refuses a primary that is not in the set", () => {
    expect(parseCompanyGoals({ goals: ["scale", "expand"], primary: "improve_quality" })).toEqual({
      ok: false,
      error: CHOOSE_PRIMARY_GOAL_MESSAGE,
    })
    expect(parseCompanyGoals({ goals: ["scale", "expand"] })).toEqual({
      ok: false,
      error: CHOOSE_PRIMARY_GOAL_MESSAGE,
    })
  })

  it("requires Other text and rejects DJ less with Stop DJing", () => {
    expect(parseCompanyGoals({ goals: ["other"], primary: "other", otherText: "" })).toEqual({
      ok: false,
      error: OWNER_GOAL_OTHER_REQUIRED_MESSAGE,
    })
    expect(parseCompanyGoals({ goals: ["other"], primary: "other", otherText: "x".repeat(81) }).ok).toBe(false)
    expect(parseCompanyGoals({ goals: ["dj_less", "stop_djing"], primary: "dj_less" })).toEqual({
      ok: false,
      error: DJ_PAIR_MESSAGE,
    })
  })
})

describe("mapSaveCompanyGoalsError", () => {
  it("maps every documented function code", () => {
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.empty)).toBe(CHOOSE_ONE_GOAL_MESSAGE)
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.tooMany)).toBe(CHOOSE_ONE_GOAL_MESSAGE)
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.duplicate)).toBe(CHOOSE_ONE_GOAL_MESSAGE)
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.primary)).toBe(CHOOSE_PRIMARY_GOAL_MESSAGE)
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.otherText)).toBe(OWNER_GOAL_OTHER_REQUIRED_MESSAGE)
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.djPair)).toBe(DJ_PAIR_MESSAGE)
    expect(mapSaveCompanyGoalsError(SAVE_COMPANY_GOALS_ERROR_CODES.notOwner)).toBe("Only the company owner can change this.")
    expect(mapSaveCompanyGoalsError("XX000")).toBe("That didn’t save. Please try again.")
    expect(mapSaveCompanyGoalsError(undefined)).toBe("That didn’t save. Please try again.")
  })
})

describe("reconcileGoalSelection", () => {
  it("drops DJ less when Stop DJing is checked, and the other way around", () => {
    expect(reconcileGoalSelection(["dj_less"], ["dj_less", "stop_djing"], "dj_less")).toEqual({
      goals: ["stop_djing"],
      primary: "",
      note: DJ_PAIR_NOTE,
    })
    expect(reconcileGoalSelection(["stop_djing"], ["stop_djing", "dj_less"], "stop_djing")).toEqual({
      goals: ["dj_less"],
      primary: "",
      note: DJ_PAIR_NOTE,
    })
  })

  it("clears the primary when that goal is unchecked", () => {
    expect(reconcileGoalSelection(["scale", "expand"], ["expand"], "scale")).toEqual({
      goals: ["expand"],
      primary: "",
      note: null,
    })
  })
})

describe("alsoLine", () => {
  it("lists extra goals in G1 order with customer words, never codes", () => {
    expect(
      alsoLine([
        { goal: "expand", otherText: null },
        { goal: "scale", otherText: null },
        { goal: "other", otherText: "Open a second market" },
      ]),
    ).toBe("Also: Scale, Expand, Open a second market")
    expect(alsoLine([])).toBeNull()
  })
})
