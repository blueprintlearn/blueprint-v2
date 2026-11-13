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
  deletedKeys: [] as string[],
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
  saveNumbersCostsCard,
  saveNumbersGoalsCard,
  saveNumbersTodayCard,
  saveServicesGrowCard,
  saveServicesMarketCard,
  saveServicesTodayCard,
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
  mocks.deletedKeys = []
  let pendingDeleteKey: string | null = null
  const deleteChain = {
    eq: (column: string, value: unknown) => {
      if (column === "question_key") pendingDeleteKey = String(value)
      return deleteChain
    },
    then: (resolve: (value: { error: null }) => unknown) => {
      if (pendingDeleteKey) mocks.deletedKeys.push(pendingDeleteKey)
      pendingDeleteKey = null
      resolve({ error: null })
    },
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

  it("refuses unknown and typed keys before touching the database", async () => {
    for (const key of ["E0", "G1", "nope"]) {
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

describe("services cards", () => {
  it("saves current services and inherits a named custom service on later questions", async () => {
    const today = new FormData()
    today.append("s1", "dj_mc")
    today.append("s1", "other")
    today.set("s1Other", "Laser shows")
    today.append("s2", "other")
    expect((await saveServicesTodayCard(initial, today)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "S1",
        value: { codes: ["dj_mc", "other"], other: "Laser shows" },
      }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "S2",
        value: { codes: ["other"], other: "Laser shows" },
      }),
      { onConflict: "company_id,question_key" },
    )

    mocks.answers = [
      { questionKey: "S1", state: "answered", value: { codes: ["dj_mc", "other"], other: "Laser shows" } },
    ]
    const grow = new FormData()
    grow.append("s8", "other")
    expect((await saveServicesGrowCard(initial, grow)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "S8",
        value: { codes: ["other"], other: "Laser shows" },
      }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("rejects unknown why-chosen and compete codes mixed with valid selections", async () => {
    const why = new FormData()
    why.append("s5", "dj_talent")
    why.append("s5", "not_a_reason")
    expect(await saveServicesMarketCard(initial, why)).toEqual({
      error: "Choose one of the options.",
      savedAt: null,
    })

    const compete = new FormData()
    compete.append("s6", "finding_djs")
    compete.append("s6", "nope")
    expect(await saveServicesMarketCard(initial, compete)).toEqual({
      error: "Choose one of the options.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("rejects more than three why-chosen reasons and overlapping new services", async () => {
    const tooMany = new FormData()
    tooMany.append("s5", "dj_talent")
    tooMany.append("s5", "professionalism")
    tooMany.append("s5", "music_expertise")
    tooMany.append("s5", "reputation")
    expect(await saveServicesMarketCard(initial, tooMany)).toEqual({
      error: "Choose up to three.",
      savedAt: null,
    })

    mocks.answers = [
      { questionKey: "S1", state: "answered", value: { codes: ["dj_mc", "uplighting"], other: null } },
    ]
    const overlap = new FormData()
    overlap.append("s7", "dj_mc")
    expect(await saveServicesGrowCard(initial, overlap)).toEqual({
      error: "Choose services you don’t already offer.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("writes market perceptions and a service goal, including I’m not sure", async () => {
    const market = new FormData()
    market.set("s4", "not_sure")
    market.append("s5", "dj_talent")
    market.append("s6", "finding_djs")
    expect((await saveServicesMarketCard(initial, market)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "S4", value: "not_sure" }),
      { onConflict: "company_id,question_key" },
    )

    const grow = new FormData()
    grow.set("s9", "train_djs")
    expect((await saveServicesGrowCard(initial, grow)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "S9", value: "train_djs" }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("lets skipQuestion skip a services core, and refuses it once answered", async () => {
    const skipped = await skipQuestion("S2")
    expect(skipped.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "S2", state: "skipped", value: null }),
      { onConflict: "company_id,question_key" },
    )
    mocks.answers = [{ questionKey: "S2", state: "skipped", value: null }]
    expect(await skipQuestion("S2")).toEqual({ error: ALREADY_ANSWERED_MESSAGE, savedAt: null })
  })

  it("refuses services writes when the switch is off or the caller is a manager", async () => {
    mocks.guided = false
    const data = new FormData()
    data.append("s1", "dj_mc")
    expect(await saveServicesTodayCard(initial, data)).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    mocks.guided = true
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await saveServicesTodayCard(initial, data)).toEqual({
      error: "Only the company owner can change this.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})

describe("save numbers cards", () => {
  it("does not claim a save when the cards are empty", async () => {
    expect(await saveNumbersTodayCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(await saveNumbersCostsCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(await saveNumbersGoalsCard(initial, new FormData())).toEqual({ error: null, savedAt: null })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("writes revenue with a period and does not invent a booking price from it", async () => {
    const data = new FormData()
    data.set("n1", "250000")
    data.set("n1Period", "last_year")
    const result = await saveNumbersTodayCard(initial, data)
    expect(result.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "N1",
        state: "answered",
        value: { amount: 250000, period: "last_year" },
      }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N3" }),
      expect.anything(),
    )
  })

  it("persists N2 as E2, including an estimated volume", async () => {
    const data = new FormData()
    data.set("n2", "96")
    data.set("n2Estimated", "1")
    const result = await saveNumbersTodayCard(initial, data)
    expect(result.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E2", state: "estimated", value: 96 }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N2" }),
      expect.anything(),
    )
  })

  it("refuses N1 without a period and N3 outside the dollar range", async () => {
    const missingPeriod = new FormData()
    missingPeriod.set("n1", "250000")
    expect(await saveNumbersTodayCard(initial, missingPeriod)).toEqual({
      error: "Choose last year or this year.",
      savedAt: null,
    })
    const badPrice = new FormData()
    badPrice.set("n3", "12.5")
    expect(await saveNumbersTodayCard(initial, badPrice)).toEqual({
      error: "Enter a whole-dollar amount from $0 to $99,999,999.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("stores percent compensation for percentage pay and dollars otherwise", async () => {
    const percent = new FormData()
    percent.set("n4", "percentage")
    percent.set("n5Percent", "30")
    expect((await saveNumbersCostsCard(initial, percent)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N4", value: "percentage" }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "N5",
        value: { amount: 30, unit: "percent" },
      }),
      { onConflict: "company_id,question_key" },
    )

    mocks.upsert.mockClear()
    const dollars = new FormData()
    dollars.set("n4", "flat")
    dollars.set("n5", "400")
    expect((await saveNumbersCostsCard(initial, dollars)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "N5",
        value: { amount: 400, unit: "usd" },
      }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("rejects mixing None with other direct costs and skips N7 when costs are none", async () => {
    const mixed = new FormData()
    mixed.append("n6", "travel")
    mixed.append("n6", "none")
    expect(await saveNumbersCostsCard(initial, mixed)).toEqual({
      error: "None and Not sure can’t be combined with other costs.",
      savedAt: null,
    })

    const none = new FormData()
    none.append("n6", "none")
    none.set("n7", "150")
    expect((await saveNumbersCostsCard(initial, none)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N6", value: { codes: ["none"] } }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N7" }),
      expect.anything(),
    )
    expect(mocks.deletedKeys).toContain("N7")
  })

  it("keeps an incompatible saved N5 row but does not overwrite it when only N4 changes", async () => {
    mocks.answers = [
      { questionKey: "N4", state: "answered", value: "flat" },
      { questionKey: "N5", state: "answered", value: { amount: 400, unit: "usd" } },
    ]
    const data = new FormData()
    data.set("n4", "percentage")
    expect((await saveNumbersCostsCard(initial, data)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N4", value: "percentage" }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N5" }),
      expect.anything(),
    )
    expect(mocks.deletedKeys).not.toContain("N5")
  })

  it("clears a previous N7 amount when other costs change to None, and does not restore it if costs return without a new amount", async () => {
    mocks.answers = [
      { questionKey: "N6", state: "answered", value: { codes: ["travel"] } },
      { questionKey: "N7", state: "answered", value: { amount: 150 } },
    ]
    const none = new FormData()
    none.append("n6", "none")
    expect((await saveNumbersCostsCard(initial, none)).error).toBeNull()
    expect(mocks.deletedKeys).toContain("N7")

    mocks.deletedKeys = []
    mocks.answers = [{ questionKey: "N6", state: "answered", value: { codes: ["none"] } }]
    const travel = new FormData()
    travel.append("n6", "travel")
    expect((await saveNumbersCostsCard(initial, travel)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N6", value: { codes: ["travel"] } }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N7" }),
      expect.anything(),
    )
    expect(mocks.deletedKeys).toContain("N7")
  })

  it("writes a financial priority and an optional revenue target", async () => {
    const data = new FormData()
    data.set("n8", "increase_revenue")
    data.set("n9", "400000")
    data.set("n9Estimated", "1")
    expect((await saveNumbersGoalsCard(initial, data)).error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N8", value: "increase_revenue" }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_key: "N9",
        state: "estimated",
        value: { amount: 400000 },
      }),
      { onConflict: "company_id,question_key" },
    )
  })

  it("lets skipQuestion skip N2 by writing E2, and refuses once E2 is answered", async () => {
    const skipped = await skipQuestion("N2")
    expect(skipped.error).toBeNull()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "E2", state: "skipped", value: null }),
      { onConflict: "company_id,question_key" },
    )
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ question_key: "N2" }),
      expect.anything(),
    )
    mocks.answers = [{ questionKey: "E2", state: "answered", value: 80 }]
    expect(await skipQuestion("N2")).toEqual({ error: ALREADY_ANSWERED_MESSAGE, savedAt: null })
  })

  it("refuses numbers writes when the switch is off or the caller is a manager", async () => {
    mocks.guided = false
    const data = new FormData()
    data.set("n1", "250000")
    data.set("n1Period", "last_year")
    expect(await saveNumbersTodayCard(initial, data)).toEqual({
      error: "That didn’t save. Please try again.",
      savedAt: null,
    })
    mocks.guided = true
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await saveNumbersTodayCard(initial, data)).toEqual({
      error: "Only the company owner can change this.",
      savedAt: null,
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})


