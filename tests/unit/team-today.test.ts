import { describe, expect, it } from "vitest"

import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
  DESIRED_DJ_COUNT_MAX,
  DESIRED_DJ_COUNT_MIN,
  T1B_FIELD_HELP,
  T4_EXCLUSIVE_MESSAGE,
  T5_MAX_MESSAGE,
  T5_OTHER_MESSAGE,
  T7_OTHER_MESSAGE,
  isConfirmedCount,
  m2Copy,
  parseCurrentDjCount,
  parseDesiredDjCount,
  parseT4Value,
  parseT5Value,
  parseT7Value,
  reconcileT4,
} from "@/lib/blueprint/team-today"
import { SYSTEM_ROLES } from "@/lib/rules/system-role"

describe("team today DJ count validation", () => {
  it("accepts integers from 0 to 999", () => {
    expect(CURRENT_DJ_COUNT_MIN).toBe(0)
    expect(CURRENT_DJ_COUNT_MAX).toBe(999)
    expect(parseCurrentDjCount("0")).toBe(0)
    expect(parseCurrentDjCount("7")).toBe(7)
    expect(parseCurrentDjCount(" 247 ")).toBe(247)
    expect(parseCurrentDjCount(String(CURRENT_DJ_COUNT_MAX))).toBe(999)
  })

  it("treats a blank count as unset and a zero as a saved value", () => {
    expect(parseCurrentDjCount("")).toBeNull()
    expect(parseCurrentDjCount("   ")).toBeNull()
    expect(parseCurrentDjCount("0")).toBe(0)
  })

  it("does not add system roles", () => {
    expect([...SYSTEM_ROLES]).toEqual([
      "owner_admin",
      "manager",
      "trainer_mentor",
      "dj_trainee",
    ])
  })

  it("rejects empty, non-integer, and out-of-range values", () => {
    expect(parseCurrentDjCount("")).toBeNull()
    expect(parseCurrentDjCount("   ")).toBeNull()
    expect(parseCurrentDjCount("-1")).toBeNull()
    expect(parseCurrentDjCount("1.5")).toBeNull()
    expect(parseCurrentDjCount("1e2")).toBeNull()
    expect(parseCurrentDjCount("1000")).toBeNull()
    expect(parseCurrentDjCount("not-a-count")).toBeNull()
    expect(parseCurrentDjCount(7)).toBeNull()
  })
})

describe("team today desired DJ count validation", () => {
  it("accepts integers from 0 to 999", () => {
    expect(DESIRED_DJ_COUNT_MIN).toBe(0)
    expect(DESIRED_DJ_COUNT_MAX).toBe(999)
    expect(parseDesiredDjCount("0")).toBe(0)
    expect(parseDesiredDjCount("12")).toBe(12)
    expect(parseDesiredDjCount(" 12 ")).toBe(12)
    expect(parseDesiredDjCount(String(DESIRED_DJ_COUNT_MAX))).toBe(999)
  })

  it("treats a blank count as unset and a zero as a saved value", () => {
    expect(parseDesiredDjCount("")).toBeNull()
    expect(parseDesiredDjCount("   ")).toBeNull()
    expect(parseDesiredDjCount("0")).toBe(0)
  })

  it("rejects empty, non-integer, and out-of-range values", () => {
    expect(parseDesiredDjCount("")).toBeNull()
    expect(parseDesiredDjCount("   ")).toBeNull()
    expect(parseDesiredDjCount("-1")).toBeNull()
    expect(parseDesiredDjCount("1.5")).toBeNull()
    expect(parseDesiredDjCount("1e2")).toBeNull()
    expect(parseDesiredDjCount("1000")).toBeNull()
    expect(parseDesiredDjCount("abc")).toBeNull()
    expect(parseDesiredDjCount(7)).toBeNull()
  })
})

describe("team today v2 parsers and M2", () => {
  it("refuses T4 nobody plus another trainer", () => {
    expect(parseT4Value(["nobody", "i_do"])).toEqual({
      ok: false,
      error: T4_EXCLUSIVE_MESSAGE,
    })
    expect(parseT4Value(["i_do", "manager"])).toEqual({ ok: true, value: ["i_do", "manager"] })
    expect(reconcileT4(["i_do", "nobody"])).toEqual(["nobody"])
    expect(reconcileT4(["nobody", "manager"])).toEqual(["manager"])
  })

  it("limits T5 to three and requires Other text", () => {
    expect(
      parseT5Value({
        codes: ["finding_candidates", "slow_to_ready", "quality_varies", "djs_leave"],
        other: null,
      }),
    ).toEqual({ ok: false, error: T5_MAX_MESSAGE })
    expect(parseT5Value({ codes: ["other"], other: null })).toEqual({ ok: false, error: T5_OTHER_MESSAGE })
    expect(parseT5Value({ codes: ["scheduling"], other: null })).toEqual({
      ok: true,
      value: { codes: ["scheduling"], other: null },
    })
  })

  it("requires T7 Other text", () => {
    expect(parseT7Value({ code: "other", other: null })).toEqual({ ok: false, error: T7_OTHER_MESSAGE })
    expect(parseT7Value({ code: "backups", other: null })).toEqual({
      ok: true,
      value: { code: "backups", other: null },
    })
  })

  it("builds every M2 sentence branch without using missing values as zero", () => {
    expect(
      m2Copy({
        currentDjCount: 0,
        leadCapableCount: null,
        assistantOnlyCount: null,
        ownerDjFrequency: "regularly",
        desiredDjCount: null,
        trainers: null,
        goals: [],
      }).sentences,
    ).toEqual(["You, with no other DJs right now."])

    expect(
      m2Copy({
        currentDjCount: 1,
        leadCapableCount: 1,
        assistantOnlyCount: 1,
        ownerDjFrequency: "no",
        desiredDjCount: 1,
        trainers: ["i_do"],
        goals: ["dj_less"],
      }),
    ).toEqual({
      sentences: ["Your team: 1 DJ, 1 of whom can lead on their own, plus 1 assistant.", "You’d like 1 DJ."],
      headsUp:
        "Heads up: you’re also the only trainer. Training new DJs will add to your week before it frees it up.",
    })

    expect(
      m2Copy({
        currentDjCount: 4,
        leadCapableCount: null,
        assistantOnlyCount: null,
        ownerDjFrequency: "sometimes",
        desiredDjCount: null,
        trainers: ["i_do", "manager"],
        goals: ["stop_djing"],
      }),
    ).toEqual({
      sentences: ["You and 4 DJs."],
      headsUp: null,
    })
  })

  it("shows the C6 heads-up when any goal is DJ less or Stop DJing", () => {
    const onlyTrainer = {
      currentDjCount: 3,
      leadCapableCount: null,
      assistantOnlyCount: null,
      ownerDjFrequency: "regularly" as const,
      desiredDjCount: null,
      trainers: ["i_do"],
    }
    expect(m2Copy({ ...onlyTrainer, goals: ["scale"] }).headsUp).toBeNull()
    expect(m2Copy({ ...onlyTrainer, goals: ["scale", "dj_less"] }).headsUp).toMatch(/only trainer/)
    expect(m2Copy({ ...onlyTrainer, goals: ["stop_djing", "expand"] }).headsUp).toMatch(/only trainer/)
  })

  it("uses the spec help for assistants", () => {
    expect(T1B_FIELD_HELP).toBe(
      "Helpers, lighting techs or trainees who support a DJ but don’t DJ or MC. They’re counted for event work, never as lead DJs.",
    )
  })

  it("never treats an unconfirmed count as confirmed", () => {
    expect(isConfirmedCount(6, "unknown")).toBe(false)
    expect(isConfirmedCount(6, "includes_owner")).toBe(false)
    expect(isConfirmedCount(6, "excludes_owner")).toBe(true)
    expect(isConfirmedCount(null, "excludes_owner")).toBe(false)
  })
})
