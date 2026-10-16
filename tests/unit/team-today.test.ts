import { describe, expect, it } from "vitest"

import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
  DESIRED_DJ_COUNT_MAX,
  DESIRED_DJ_COUNT_MIN,
  parseCurrentDjCount,
  parseDesiredDjCount,
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
