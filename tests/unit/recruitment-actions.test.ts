import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  goals: { primary: { goal: "scale" as const }, others: [] } as { primary: { goal: string }; others: unknown[] } | null,
  team: null as null | object,
  answers: [] as { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[],
  planning: null as { inputs: unknown; recommendation_response: unknown } | null,
  plans: [] as object[],
  insertApproved: vi.fn(),
  upsertDraft: vi.fn(),
  sync: vi.fn(),
  loadRows: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentMembership: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/queries", () => ({
  getCurrentCompanyGoals: async () => mocks.goals,
  getCurrentTeamToday: async () => mocks.team,
  getCurrentBlueprintAnswers: async () => mocks.answers,
  getCurrentGrowthPlanning: async () => mocks.planning,
  getCurrentGrowthPlans: async () => mocks.plans,
}))
vi.mock("@/lib/blueprint/recruitment-store", () => ({
  insertApprovedStrategy: mocks.insertApproved,
  upsertDraftStrategy: mocks.upsertDraft,
  syncApprovedStrategiesToFingerprint: mocks.sync,
  loadRecruitmentRows: mocks.loadRows,
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }))

import {
  approveRecruitmentStrategy,
  saveRecruitmentDraft,
  saveRecruitmentInputs,
} from "@/lib/blueprint/recruitment-actions"
import { RECRUIT_CONFIRM_MESSAGE } from "@/lib/blueprint/recruitment"
import { OWNER_ONLY_MESSAGE } from "@/lib/blueprint/questions"
import { emptyTeamToday } from "@/lib/blueprint/team-today"

const initial = { error: null, savedAt: null }
const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
  mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
  mocks.guided = true
  mocks.goals = { primary: { goal: "scale" }, others: [] }
  mocks.team = emptyTeamToday()
  mocks.answers = []
  mocks.planning = null
  mocks.plans = []
  mocks.insertApproved.mockResolvedValue({ error: null })
  mocks.upsertDraft.mockResolvedValue({ error: null })
  mocks.sync.mockResolvedValue(undefined)
  mocks.loadRows.mockResolvedValue([])
})

describe("recruitment actions", () => {
  it("rejects non-owners before writing", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await approveRecruitmentStrategy(initial, form({ reason: "growth", stance: "accept", confirmApproval: "1" }))).toEqual({
      error: OWNER_ONLY_MESSAGE,
      savedAt: null,
    })
    expect(mocks.insertApproved).not.toHaveBeenCalled()
  })

  it("does not approve from a hiring-need or draft save", async () => {
    expect((await saveRecruitmentInputs(initial, form({ reason: "replacement", hiringTarget: "1" }))).error).toBeNull()
    expect(mocks.upsertDraft).toHaveBeenCalled()
    expect(mocks.insertApproved).not.toHaveBeenCalled()
    mocks.upsertDraft.mockClear()
    expect((await saveRecruitmentDraft(initial, form({ reason: "replacement", hiringTarget: "1", stance: "accept" }))).error).toBeNull()
    expect(mocks.upsertDraft).toHaveBeenCalled()
    expect(mocks.insertApproved).not.toHaveBeenCalled()
  })

  it("requires an explicit confirmation before approval", async () => {
    expect(await approveRecruitmentStrategy(initial, form({ reason: "growth", stance: "accept" }))).toEqual({
      error: RECRUIT_CONFIRM_MESSAGE,
      savedAt: null,
    })
    expect(mocks.insertApproved).not.toHaveBeenCalled()
  })

  it("approves only after the owner confirms", async () => {
    const before = Date.now()
    const result = await approveRecruitmentStrategy(
      initial,
      form({ reason: "capacity", hiringTarget: "2", stance: "accept", confirmApproval: "1" }),
    )
    expect(result.error).toBeNull()
    expect(result.savedAt).toBeGreaterThanOrEqual(before)
    expect(mocks.insertApproved).toHaveBeenCalledWith(
      {},
      "company-a",
      expect.objectContaining({
        inputs: expect.objectContaining({ reason: "capacity", hiringTarget: 2 }),
      }),
    )
  })

  it("rejects a fractional hiring target without writing", async () => {
    expect(await saveRecruitmentInputs(initial, form({ reason: "growth", hiringTarget: "1.5" }))).toMatchObject({
      savedAt: null,
    })
    expect(mocks.upsertDraft).not.toHaveBeenCalled()
  })
})
