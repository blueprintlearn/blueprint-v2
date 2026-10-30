import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  dbError: null as null | { message: string; code?: string },
  updatedRows: [{ company_id: "company-a" }] as unknown[],
  upsert: vi.fn(),
  update: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  createClient: vi.fn(),
  getCurrentMembership: vi.fn(),
  guided: true,
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/blueprint/guided-switch", () => ({
  isGuidedBlueprintEnabled: () => mocks.guided,
}))

import { saveCompanyGoals, saveDesiredDjCount, saveOwnerGoal, saveTeamToday } from "@/lib/blueprint/actions"
import { OWNER_GOAL_OTHER_REQUIRED_MESSAGE } from "@/lib/blueprint/goals"

const initial = { error: null, savedAt: null }
const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
  mocks.dbError = null
  mocks.updatedRows = [{ company_id: "company-a" }]
  mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
  mocks.upsert.mockImplementation(async () => ({ error: mocks.dbError }))
  mocks.update.mockImplementation(() => ({
    eq: () => ({ select: async () => ({ data: mocks.dbError ? null : mocks.updatedRows, error: mocks.dbError }) }),
  }))
  mocks.rpc.mockImplementation(async () => ({ error: mocks.dbError }))
  mocks.guided = true
  mocks.createClient.mockImplementation(async () => ({
    from: () => ({ upsert: mocks.upsert, update: mocks.update }),
    rpc: mocks.rpc,
  }))
})

const goalsForm = (goals: string[], primary?: string, otherText?: string) => {
  const data = new FormData()
  for (const goal of goals) data.append("goals", goal)
  if (primary) data.set("primary", primary)
  if (otherText !== undefined) data.set("otherText", otherText)
  return data
}

describe("saveTeamToday", () => {
  it("confirms a save with savedAt and writes only the caller's company", async () => {
    const before = Date.now()
    const result = await saveTeamToday(initial, form({ currentDjCount: "0" }))
    expect(result.error).toBeNull()
    expect(result.savedAt).toBeGreaterThanOrEqual(before)
    expect(mocks.upsert).toHaveBeenCalledWith({ company_id: "company-a", current_dj_count: 0 }, { onConflict: "company_id" })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("rejects an invalid number before touching auth or the database", async () => {
    for (const value of ["", "-1", "1000", "2.5", "abc"]) {
      expect(await saveTeamToday(initial, form({ currentDjCount: value }))).toEqual({
        error: "Enter a whole number from 0 to 999.",
        savedAt: null,
      })
    }
    expect(mocks.getCurrentMembership).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("refuses anyone who is not the owner, and anyone without a company", async () => {
    for (const membership of [{ companyId: "company-a", companyName: "Company A", role: "manager" }, null]) {
      mocks.membership = membership
      expect(await saveTeamToday(initial, form({ currentDjCount: "3" }))).toEqual({
        error: "Only the company owner can change this.",
        savedAt: null,
      })
    }
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("says to try again when the database refuses", async () => {
    mocks.dbError = { message: "denied" }
    expect(await saveTeamToday(initial, form({ currentDjCount: "3" }))).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})

describe("saveDesiredDjCount", () => {
  it("confirms a save with savedAt", async () => {
    const result = await saveDesiredDjCount(initial, form({ desiredDjCount: "0" }))
    expect(result.error).toBeNull()
    expect(result.savedAt).toEqual(expect.any(Number))
    expect(mocks.update).toHaveBeenCalledWith({ desired_dj_count: 0 })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("keeps current-before-desired on the server", async () => {
    mocks.updatedRows = []
    expect(await saveDesiredDjCount(initial, form({ desiredDjCount: "4" }))).toEqual({
      error: "Save your current DJ count first.",
      savedAt: null,
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("uses the shared number, owner-only and retry messages", async () => {
    expect((await saveDesiredDjCount(initial, form({ desiredDjCount: "1200" }))).error).toBe("Enter a whole number from 0 to 999.")
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "trainer_mentor" }
    expect((await saveDesiredDjCount(initial, form({ desiredDjCount: "4" }))).error).toBe("Only the company owner can change this.")
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
    mocks.dbError = { message: "denied" }
    expect(await saveDesiredDjCount(initial, form({ desiredDjCount: "4" }))).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
  })
})

describe("saveOwnerGoal", () => {
  it("confirms a save and stores NULL Other text for any goal but Other", async () => {
    const result = await saveOwnerGoal(initial, form({ ownerGoal: "scale" }))
    expect(result).toEqual({ error: null, savedAt: expect.any(Number) })
    expect(mocks.upsert).toHaveBeenCalledWith(
      { company_id: "company-a", owner_goal: "scale", owner_goal_other: null },
      { onConflict: "company_id" },
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("asks for words when Other is chosen with empty or blank text", async () => {
    for (const fields of [{ ownerGoal: "other" } as Record<string, string>, { ownerGoal: "other", ownerGoalOther: "" }, { ownerGoal: "other", ownerGoalOther: "   " }]) {
      expect(await saveOwnerGoal(initial, form(fields))).toEqual({ error: OWNER_GOAL_OTHER_REQUIRED_MESSAGE, savedAt: null })
    }
    expect(OWNER_GOAL_OTHER_REQUIRED_MESSAGE).toBe("Add a few words about your goal.")
    expect(mocks.getCurrentMembership).not.toHaveBeenCalled()
  })

  it("asks to choose from the list for anything else it rejects", async () => {
    for (const fields of [{} as Record<string, string>, { ownerGoal: "" }, { ownerGoal: "not_a_goal" }, { ownerGoal: "other", ownerGoalOther: "x".repeat(81) }]) {
      expect(await saveOwnerGoal(initial, form(fields))).toEqual({ error: "Choose a goal from the list.", savedAt: null })
    }
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("refuses non-owners and reports database failures", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect((await saveOwnerGoal(initial, form({ ownerGoal: "scale" }))).error).toBe("Only the company owner can change this.")
    expect(mocks.upsert).not.toHaveBeenCalled()
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
    mocks.dbError = { message: "denied" }
    expect(await saveOwnerGoal(initial, form({ ownerGoal: "scale" }))).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
  })
})

describe("saveCompanyGoals", () => {
  it("saves for a switched-on owner and returns savedAt", async () => {
    const before = Date.now()
    const result = await saveCompanyGoals(initial, goalsForm(["scale", "expand"], "scale"))
    expect(result.error).toBeNull()
    expect(result.savedAt).toBeGreaterThanOrEqual(before)
    expect(mocks.rpc).toHaveBeenCalledWith("save_company_goals", {
      p_company_id: "company-a",
      p_goals: ["scale", "expand"],
      p_primary: "scale",
      p_other_text: "",
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("refuses the switch-off path without writing (S2-7 option A)", async () => {
    mocks.guided = false
    expect(await saveCompanyGoals(initial, goalsForm(["scale"], "scale"))).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses an empty set before touching the database", async () => {
    expect(await saveCompanyGoals(initial, goalsForm([]))).toEqual({
      error: "Choose at least one goal.",
      savedAt: null,
    })
    expect(mocks.getCurrentMembership).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("refuses a manager and maps function error codes", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await saveCompanyGoals(initial, goalsForm(["scale"], "scale"))).toEqual({
      error: "Only the company owner can change this.",
      savedAt: null,
    })
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
    mocks.dbError = { message: "denied", code: "PBG06" }
    expect(await saveCompanyGoals(initial, goalsForm(["scale"], "scale"))).toEqual({
      error: "Choose DJ less or Stop DJing, not both.",
      savedAt: null,
    })
  })
})
