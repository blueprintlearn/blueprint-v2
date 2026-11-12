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
  goals: null as null | { primary: { goal: string }; others: unknown[] },
  team: null as null | {
    currentDjCount: number | null
    desiredDjCount: number | null
    countBasis: "excludes_owner" | "includes_owner" | "unknown"
    desiredCountBasis: "excludes_owner" | "includes_owner" | "unknown"
    assistantOnlyCount: number | null
    ownerDjFrequency: "regularly" | "sometimes" | "no" | null
    leadCapableCount: number | null
    earlierDjCount: number | null
    earlierDesiredDjCount: number | null
  },
  answers: [] as { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[],
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/blueprint/guided-switch", () => ({
  isGuidedBlueprintEnabled: () => mocks.guided,
}))
vi.mock("@/lib/blueprint/queries", () => ({
  getCurrentCompanyGoals: async () => mocks.goals,
  getCurrentTeamToday: async () => mocks.team,
  getCurrentBlueprintAnswers: async () => mocks.answers,
}))

import {
  saveAnswer,
  saveCompanyGoals,
  saveDesiredDjCount,
  saveEventsFutureCard,
  saveEventsStaffCard,
  saveEventsTodayCard,
  saveOwnerGoal,
  saveTeamRunsCard,
  saveTeamToday,
  saveTeamTodayCard,
  saveTeamWantedCard,
  skipQuestion,
} from "@/lib/blueprint/actions"
import { emptyTeamToday } from "@/lib/blueprint/team-today"
import { ALREADY_ANSWERED_MESSAGE, G3_CHOOSE_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
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
  mocks.goals = null
  mocks.team = emptyTeamToday()
  mocks.answers = []
  const deleteChain = {
    eq: () => deleteChain,
    then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
  }
  mocks.createClient.mockImplementation(async () => ({
    from: () => ({
      upsert: mocks.upsert,
      update: mocks.update,
      delete: () => deleteChain,
    }),
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

describe("saveAnswer and skipQuestion", () => {
  it("saves a G3 code and records progress", async () => {
    const data = new FormData()
    data.set("questionKey", "G3")
    data.set("value", "within_6_months")
    const result = await saveAnswer(initial, data)
    expect(result.error).toBeNull()
    expect(result.savedAt).toEqual(expect.any(Number))
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-a",
        question_key: "G3",
        value: "within_6_months",
        state: "answered",
      }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("rejects a bad G3 code before writing", async () => {
    const data = new FormData()
    data.set("questionKey", "G3")
    data.set("value", "soon")
    expect(await saveAnswer(initial, data)).toEqual({ error: G3_CHOOSE_MESSAGE, savedAt: null })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("refuses unknown, financial and typed keys before touching the database", async () => {
    for (const key of ["N1", "E0", "G1", "nope"]) {
      const data = new FormData()
      data.set("questionKey", key)
      data.set("value", "within_6_months")
      expect(await saveAnswer(initial, data)).toEqual({ error: "That didn’t save. Please try again.", savedAt: null })
    }
    expect(mocks.getCurrentMembership).not.toHaveBeenCalled()
  })

  it("skips G1 when there are no goals and refuses once goals exist", async () => {
    const skipped = await skipQuestion("G1")
    expect(skipped.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "G1", state: "skipped", value: null }),
      { onConflict: "company_id,question_key" },
    )

    mocks.goals = { primary: { goal: "scale" }, others: [] }
    expect(await skipQuestion("G1")).toEqual({ error: ALREADY_ANSWERED_MESSAGE, savedAt: null })
  })

  it("never offers a skip path for G2", async () => {
    expect(await skipQuestion("G2")).toEqual({ error: "That didn’t save. Please try again.", savedAt: null })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})

describe("guided team today v2 actions", () => {
  it("saves card 1 through save_team_today_v2 and confirms T1", async () => {
    const data = new FormData()
    data.set("t1", "4")
    data.set("t1b", "1")
    data.set("t2", "sometimes")
    data.set("t3", "2")
    const result = await saveTeamTodayCard(initial, data)
    expect(result.error).toBeNull()
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_team_today_v2",
      expect.objectContaining({
        p_company_id: "company-a",
        p_current_dj_count: 4,
        p_assistant_only_count: 1,
        p_owner_dj_frequency: "sometimes",
        p_lead_capable_count: 2,
        p_count_basis: "excludes_owner",
      }),
    )
  })

  it("refuses T3 when T1 is null", async () => {
    mocks.team = emptyTeamToday()
    const data = new FormData()
    data.set("t3", "2")
    expect(await saveTeamTodayCard(initial, data)).toEqual({ error: SAVE_FAILED_MESSAGE, savedAt: null })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("keeps T0 Yes from rewriting the stored count", async () => {
    mocks.team = {
      ...emptyTeamToday(),
      currentDjCount: 6,
      countBasis: "unknown",
    }
    const data = new FormData()
    data.set("t0", "included")
    const result = await saveTeamTodayCard(initial, data)
    expect(result.error).toBeNull()
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_team_today_v2",
      expect.objectContaining({
        p_count_basis: "includes_owner",
      }),
    )
    expect(mocks.rpc.mock.calls[0][1].p_current_dj_count).toBeUndefined()
  })

  it("saves T6 independently and confirms the desired basis", async () => {
    const data = new FormData()
    data.set("t6", "8")
    const result = await saveTeamWantedCard(initial, data)
    expect(result.error).toBeNull()
    expect(mocks.rpc).toHaveBeenCalledWith("save_team_today_v2", {
      p_company_id: "company-a",
      p_desired_dj_count: 8,
      p_desired_count_basis: "excludes_owner",
    })
  })

  it("does not claim a runs-card save when T4 and T5 are empty", async () => {
    expect(await saveTeamRunsCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("does not claim a today or wanted save when those cards are empty", async () => {
    expect(await saveTeamTodayCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(await saveTeamWantedCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("writes T4 and T5 from the runs card", async () => {
    const data = new FormData()
    data.append("t4", "manager")
    data.append("t5", "finding_candidates")
    const result = await saveTeamRunsCard(initial, data)
    expect(result.error).toBeNull()
    expect(result.savedAt).toEqual(expect.any(Number))
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "T4", state: "answered", value: ["manager"] }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "T5",
        state: "answered",
        value: { codes: ["finding_candidates"], other: null },
      }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("refuses T4 nobody plus another trainer and T5's fourth choice", async () => {
    const t4 = new FormData()
    t4.append("t4", "nobody")
    t4.append("t4", "i_do")
    expect((await saveTeamRunsCard(initial, t4)).error).toBe("Nobody right now can’t be combined with the others.")
    expect(mocks.upsert).not.toHaveBeenCalled()

    const t5 = new FormData()
    t5.append("t5", "finding_candidates")
    t5.append("t5", "slow_to_ready")
    t5.append("t5", "quality_varies")
    t5.append("t5", "djs_leave")
    expect((await saveTeamRunsCard(initial, t5)).error).toBe("Choose up to three.")
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("refuses guided team writes when the switch is off", async () => {
    mocks.guided = false
    const today = new FormData()
    today.set("t1", "2")
    expect(await saveTeamTodayCard(initial, today)).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    const wanted = new FormData()
    wanted.set("t6", "4")
    expect(await saveTeamWantedCard(initial, wanted)).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("refuses a manager on the guided team path", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    const data = new FormData()
    data.set("t1", "2")
    expect(await saveTeamTodayCard(initial, data)).toEqual({
      error: "Only the company owner can change this.",
      savedAt: null,
    })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})

describe("save events cards", () => {
  it("does not claim a save when the cards are empty", async () => {
    expect(await saveEventsTodayCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(await saveEventsStaffCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(await saveEventsFutureCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("writes a partial today card and keeps other event answers", async () => {
    const data = new FormData()
    data.append("e1", "wedding")
    data.append("e1", "other")
    data.set("e1Other", "Bar mitzvahs")
    const result = await saveEventsTodayCard(initial, data)
    expect(result.error).toBeNull()
    expect(result.savedAt).toEqual(expect.any(Number))
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "E1",
        state: "answered",
        value: { codes: ["wedding", "other"], other: "Bar mitzvahs" },
      }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E2" }),
      expect.anything(),
    )
  })

  it("marks an annual volume from the helper as estimated", async () => {
    const data = new FormData()
    data.set("e2", "96")
    data.set("e2Estimated", "1")
    const result = await saveEventsTodayCard(initial, data)
    expect(result.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E2", state: "estimated", value: 96 }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("rejects an annual volume outside 0 to 9,999", async () => {
    for (const value of ["-1", "10000", "12.5", "abc"]) {
      const data = new FormData()
      data.set("e2", value)
      expect(await saveEventsTodayCard(initial, data)).toEqual({
        error: "Enter a whole number from 0 to 9,999.",
        savedAt: null,
      })
    }
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("keeps a named custom type when later cards select Other", async () => {
    mocks.answers = [
      { questionKey: "E1", state: "answered", value: { codes: ["wedding", "other"], other: "Bar mitzvahs" } },
    ]
    const staff = new FormData()
    staff.append("e4", "other")
    expect((await saveEventsStaffCard(initial, staff)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "E4",
        value: { codes: ["other"], other: "Bar mitzvahs" },
      }),
      { onConflict: "company_id,question_key" },
    )

    const future = new FormData()
    future.append("e7", "other")
    expect((await saveEventsFutureCard(initial, future)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "E7",
        value: { codes: ["other"], other: "Bar mitzvahs" },
      }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("rejects most-common types that are not already offered", async () => {
    mocks.answers = [
      { questionKey: "E1", state: "answered", value: { codes: ["wedding"], other: null } },
    ]
    const data = new FormData()
    data.append("e3", "corporate")
    expect(await saveEventsTodayCard(initial, data)).toEqual({
      error: "Choose from the event types you already offer.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("rejects new types that overlap current types", async () => {
    mocks.answers = [
      { questionKey: "E1", state: "answered", value: { codes: ["wedding", "corporate"], other: null } },
    ]
    const data = new FormData()
    data.append("e8", "wedding")
    expect(await saveEventsFutureCard(initial, data)).toEqual({
      error: "Choose types you don’t already offer.",
      savedAt: null,
    })
  })

  it("writes staffing and future cards, including both as a future focus", async () => {
    const staff = new FormData()
    staff.append("e4", "corporate")
    staff.append("e5", "wedding")
    staff.set("e6", "assistant")
    expect((await saveEventsStaffCard(initial, staff)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E6", value: "assistant" }),
      { onConflict: "company_id,question_key" },
    )

    const future = new FormData()
    future.set("e9", "both")
    expect((await saveEventsFutureCard(initial, future)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E9", value: "both" }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("lets skipQuestion skip an events core, and refuses it once answered", async () => {
    const skipped = await skipQuestion("E2")
    expect(skipped.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E2", state: "skipped", value: null }),
      { onConflict: "company_id,question_key" },
    )
    mocks.answers = [{ questionKey: "E2", state: "skipped", value: null }]
    expect(await skipQuestion("E2")).toEqual({ error: ALREADY_ANSWERED_MESSAGE, savedAt: null })
  })

  it("refuses events writes when the switch is off or the caller is a manager", async () => {
    mocks.guided = false
    const data = new FormData()
    data.append("e1", "wedding")
    expect(await saveEventsTodayCard(initial, data)).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    mocks.guided = true
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await saveEventsTodayCard(initial, data)).toEqual({
      error: "Only the company owner can change this.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})

