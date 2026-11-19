import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  getCurrentMembership: vi.fn(),
  revalidatePath: vi.fn(),
  claims: { sub: "00000000-0000-4000-8000-0000000000a2" } as { sub?: string } | null,
  loadProfile: vi.fn(),
  loadEvaluation: vi.fn(),
  resolveCategories: vi.fn(),
  saveEvaluation: vi.fn(),
  saveTemplate: vi.fn(),
  insertDecision: vi.fn(),
  saveFollowUp: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/applicant-store", () => ({
  loadApplicantProfile: mocks.loadProfile,
}))
vi.mock("@/lib/blueprint/candidate-review-store", () => ({
  loadHumanEvaluation: mocks.loadEvaluation,
  resolveEvaluationCategories: mocks.resolveCategories,
  saveHumanEvaluation: mocks.saveEvaluation,
  saveEvaluationTemplate: mocks.saveTemplate,
  insertOwnerDecision: mocks.insertDecision,
  saveApplicantFollowUp: mocks.saveFollowUp,
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: mocks.claims }, error: null }) },
  }),
}))

import {
  recordApplicantDecision,
  saveApplicantEvaluation,
  saveApplicantFollowUpAction,
  saveEvaluationCategories,
} from "@/lib/blueprint/candidate-review-actions"
import { DEFAULT_EVALUATION_CATEGORIES } from "@/lib/blueprint/candidate-review"
import { OWNER_ONLY_MESSAGE as OWNER_ONLY } from "@/lib/blueprint/questions"

const initial = { error: null, savedAt: null }

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

describe("candidate review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
    mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
    mocks.guided = true
    mocks.claims = { sub: "00000000-0000-4000-8000-0000000000a2" }
    mocks.loadProfile.mockResolvedValue({
      applicationId: "app-1",
      applicantId: "person-1",
      slug: "company-a",
      stage: "new_application",
    })
    mocks.loadEvaluation.mockResolvedValue(null)
    mocks.resolveCategories.mockResolvedValue([...DEFAULT_EVALUATION_CATEGORIES])
    mocks.saveEvaluation.mockResolvedValue({ error: null })
    mocks.saveTemplate.mockResolvedValue({ error: null })
    mocks.insertDecision.mockResolvedValue({ error: null, toStage: "screening" })
    mocks.saveFollowUp.mockResolvedValue({ error: null })
  })

  it("rejects non-owners", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await saveEvaluationCategories(initial, form({ slug: "company-default", "category-0": "A", "category-1": "B", "category-2": "C" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(mocks.saveTemplate).not.toHaveBeenCalled()
    expect(await saveApplicantEvaluation(initial, form({ applicationId: "app-1" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(await recordApplicantDecision(initial, form({ applicationId: "app-1", decision: "advance" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(await saveApplicantFollowUpAction(initial, form({ applicationId: "app-1", action: "review_video" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
  })

  it("saves a human evaluation, decision, and follow-up for the owner", async () => {
    const evaluation = await saveApplicantEvaluation(
      initial,
      form({
        applicationId: "app-1",
        "rating-0": "4",
        "rating-1": "4",
        "rating-2": "5",
        "rating-3": "3",
        "rating-4": "4",
      }),
    )
    expect(evaluation.error).toBeNull()
    expect(mocks.saveEvaluation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-a",
        applicationId: "app-1",
        applicantId: "person-1",
        updatedBy: "00000000-0000-4000-8000-0000000000a2",
      }),
    )
    const payload = mocks.saveEvaluation.mock.calls[0]?.[1] as { ratings: { rating: number | null }[] }
    expect(payload.ratings.every((row) => row.rating !== null)).toBe(true)
    expect(JSON.stringify(payload)).not.toMatch(/overallScore|rank/i)

    expect((await recordApplicantDecision(initial, form({ applicationId: "app-1", decision: "advance", reason: "Strong weekends." }))).error).toBeNull()
    expect(mocks.insertDecision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        decision: "advance",
        reason: "Strong weekends.",
        fromStage: "new_application",
        createdBy: "00000000-0000-4000-8000-0000000000a2",
      }),
    )

    expect(
      (await saveApplicantFollowUpAction(initial, form({ applicationId: "app-1", action: "review_video", dueOn: "2026-04-01", status: "pending" }))).error,
    ).toBeNull()
    expect(mocks.saveFollowUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "review_video",
        dueOn: "2026-04-01",
        status: "pending",
      }),
    )
  })
})
