import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  goals: { primary: { goal: "scale" as const }, others: [] } as { primary: { goal: string }; others: unknown[] } | null,
  team: null as null | object,
  answers: [] as { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[],
  planning: null as { inputs: unknown; recommendation_response: unknown } | null,
  fingerprint: "fingerprint-1",
  proposed: {
    summary: {
      staffing: "",
      demand: "",
      training: "",
      primaryObstacle: { kind: "demand", label: "Increase booking demand before hiring", explanation: "", status: "calculated" },
    },
    hiring: {
      recommendedTarget: { status: "calculated", value: 0, explanation: "", missing: [] },
      recommendedProfile: "unspecified",
      explanation: "",
    },
    recruiting: { kind: "demand", approach: "", notes: [] },
    training: { canSupportBeginners: true, limitations: "", preparation: "" },
    nextSteps: [],
  } as object,
  analysisWarnings: [] as { title: string; explanation: string }[],
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
}))
vi.mock("@/lib/blueprint/answers", () => ({
  resolveAll: () => [],
}))
vi.mock("@/lib/blueprint/findings", () => ({
  findingsGate: () => "current",
}))
vi.mock("@/lib/blueprint/growth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blueprint/growth")>("@/lib/blueprint/growth")
  return {
    ...actual,
    storedGrowthFromRow: () => null,
  }
})
vi.mock("@/lib/blueprint/growth-plan", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blueprint/growth-plan")>("@/lib/blueprint/growth-plan")
  return {
    ...actual,
    composeProposedPlan: () =>
      mocks.fingerprint
        ? {
            fingerprint: mocks.fingerprint,
            proposed: mocks.proposed,
            analysisWarnings: mocks.analysisWarnings,
          }
        : null,
  }
})
vi.mock("@/lib/blueprint/growth-plan-store", () => ({
  insertApprovedPlan: mocks.insertApproved,
  upsertDraftPlan: mocks.upsertDraft,
  syncApprovedPlansToFingerprint: mocks.sync,
  loadGrowthPlanRows: mocks.loadRows,
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }))

import { approveGrowthPlan, saveGrowthPlanDraft } from "@/lib/blueprint/growth-plan-actions"
import { GROWTH_PLAN_CONFIRM_MESSAGE } from "@/lib/blueprint/growth-plan"
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
  mocks.fingerprint = "fingerprint-1"
  mocks.insertApproved.mockResolvedValue({ error: null })
  mocks.upsertDraft.mockResolvedValue({ error: null })
  mocks.sync.mockResolvedValue(undefined)
  mocks.loadRows.mockResolvedValue([])
})

describe("growth plan actions", () => {
  it("rejects non-owners before writing", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await approveGrowthPlan(initial, form({ stance: "accept", confirmApproval: "1" }))).toEqual({
      error: OWNER_ONLY_MESSAGE,
      savedAt: null,
    })
    expect(mocks.insertApproved).not.toHaveBeenCalled()
  })

  it("does not approve from a draft save", async () => {
    const result = await saveGrowthPlanDraft(initial, form({ stance: "accept" }))
    expect(result.error).toBeNull()
    expect(mocks.upsertDraft).toHaveBeenCalled()
    expect(mocks.insertApproved).not.toHaveBeenCalled()
  })

  it("requires an explicit confirmation before approval", async () => {
    expect(await approveGrowthPlan(initial, form({ stance: "accept" }))).toEqual({
      error: GROWTH_PLAN_CONFIRM_MESSAGE,
      savedAt: null,
    })
    expect(mocks.insertApproved).not.toHaveBeenCalled()
  })

  it("approves only after the owner confirms", async () => {
    const before = Date.now()
    const result = await approveGrowthPlan(initial, form({ stance: "accept", confirmApproval: "1" }))
    expect(result.error).toBeNull()
    expect(result.savedAt).toBeGreaterThanOrEqual(before)
    expect(mocks.insertApproved).toHaveBeenCalledWith(
      {},
      "company-a",
      expect.objectContaining({ fingerprint: "fingerprint-1" }),
    )
  })

  it("rejects a fractional hiring target without writing", async () => {
    expect(
      await saveGrowthPlanDraft(
        initial,
        form({ stance: "modify", hiringTarget: "1.5", hireProfile: "experienced", recruitingKind: "recruit" }),
      ),
    ).toMatchObject({ savedAt: null })
    expect(mocks.upsertDraft).not.toHaveBeenCalled()
  })
})
