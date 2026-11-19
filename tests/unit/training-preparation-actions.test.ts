import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  getCurrentMembership: vi.fn(),
  revalidatePath: vi.fn(),
  claims: { sub: "00000000-0000-4000-8000-0000000000a2" } as { sub?: string } | null,
  loadProfile: vi.fn(),
  ensure: vi.fn(),
  save: vi.fn(),
  approve: vi.fn(),
  revise: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/applicant-store", () => ({
  loadApplicantProfile: mocks.loadProfile,
}))
vi.mock("@/lib/blueprint/training-preparation-store", () => ({
  ensureTrainingPrepDraft: mocks.ensure,
  saveTrainingPrepDraft: mocks.save,
  approveTrainingPrepDraft: mocks.approve,
  startTrainingPrepRevision: mocks.revise,
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: mocks.claims }, error: null }) },
  }),
}))

import {
  approveApplicantTrainingPreparation,
  reviseApplicantTrainingPreparation,
  saveApplicantTrainingPreparation,
  startApplicantTrainingPreparation,
} from "@/lib/blueprint/training-preparation-actions"
import { OWNER_ONLY_MESSAGE as OWNER_ONLY } from "@/lib/blueprint/questions"
import { TRAINING_PREP_CONFIRM_MESSAGE, TRAINING_PREP_REVERSED } from "@/lib/blueprint/training-preparation"

const initial = { error: null, savedAt: null }

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const draftFields = {
  applicationId: "app-1",
  intendedRole: "Wedding DJ",
  experienceLevel: "beginner",
  trainingApproach: "full",
  plannedStartDate: "2026-05-01",
}

describe("training preparation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
    mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
    mocks.guided = true
    mocks.claims = { sub: "00000000-0000-4000-8000-0000000000a2" }
    mocks.loadProfile.mockResolvedValue({
      applicationId: "app-1",
      applicantId: "person-1",
      roleTitle: "DJ",
    })
    mocks.ensure.mockResolvedValue({ error: null, draft: { id: "prep-1" } })
    mocks.save.mockResolvedValue({ error: null })
    mocks.approve.mockResolvedValue({ error: null })
    mocks.revise.mockResolvedValue({ error: null, draft: { id: "prep-2" } })
  })

  it("rejects non-owners", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await startApplicantTrainingPreparation(initial, form({ applicationId: "app-1" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(mocks.ensure).not.toHaveBeenCalled()
    expect(await saveApplicantTrainingPreparation(initial, form(draftFields))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(
      await approveApplicantTrainingPreparation(initial, form({ ...draftFields, confirmApproval: "1" })),
    ).toEqual({ error: OWNER_ONLY, savedAt: null })
  })

  it("starts, saves, and approves for the owner without creating trainee accounts", async () => {
    expect((await startApplicantTrainingPreparation(initial, form({ applicationId: "app-1" }))).error).toBeNull()
    expect(mocks.ensure).toHaveBeenCalled()
    expect((await saveApplicantTrainingPreparation(initial, form(draftFields))).error).toBeNull()
    expect(mocks.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-a",
        value: expect.objectContaining({ intendedRole: "Wedding DJ", trainingApproach: "full" }),
      }),
    )
    expect(await approveApplicantTrainingPreparation(initial, form(draftFields))).toEqual({
      error: TRAINING_PREP_CONFIRM_MESSAGE,
      savedAt: null,
    })
    expect(mocks.approve).not.toHaveBeenCalled()
    expect(
      (await approveApplicantTrainingPreparation(initial, form({ ...draftFields, confirmApproval: "1" }))).error,
    ).toBeNull()
    expect(mocks.approve).toHaveBeenCalled()
    expect((await reviseApplicantTrainingPreparation(initial, form({ applicationId: "app-1" }))).error).toBeNull()
    expect(JSON.stringify(mocks.approve.mock.calls[0]?.[1])).not.toMatch(/createUser|enroll|invite|certification/i)
  })

  it("surfaces a reversed hiring outcome instead of approving", async () => {
    mocks.approve.mockResolvedValue({ error: TRAINING_PREP_REVERSED })
    expect(
      await approveApplicantTrainingPreparation(initial, form({ ...draftFields, confirmApproval: "1" })),
    ).toEqual({ error: TRAINING_PREP_REVERSED, savedAt: null })
  })
})
