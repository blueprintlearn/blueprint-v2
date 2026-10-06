import { describe, expect, it } from "vitest"

import { SYSTEM_ROLES } from "@/lib/rules/system-role"

describe("system roles", () => {
  it("includes the four Stage 0 system roles and not applicant", () => {
    expect([...SYSTEM_ROLES]).toEqual([
      "owner_admin",
      "manager",
      "trainer_mentor",
      "dj_trainee",
    ])
    expect(SYSTEM_ROLES).not.toContain("applicant")
  })
})
