import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  getCurrentMembership: vi.fn(),
  revalidatePath: vi.fn(),
  claims: { sub: "00000000-0000-4000-8000-0000000000a2" } as { sub?: string } | null,
  loadProfile: vi.fn(),
  ensure: vi.fn(),
  updateActivity: vi.fn(),
  addCustom: vi.fn(),
  saveConversation: vi.fn(),
  saveAudition: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/applicant-store", () => ({
  loadApplicantProfile: mocks.loadProfile,
}))
vi.mock("@/lib/blueprint/hiring-workflow-store", () => ({
  ensureHiringWorkflow: mocks.ensure,
  updateHiringActivityStatus: mocks.updateActivity,
  insertCustomHiringActivity: mocks.addCustom,
  saveApplicantConversation: mocks.saveConversation,
  saveApplicantAudition: mocks.saveAudition,
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: mocks.claims }, error: null }) },
  }),
}))

import {
  addCustomHiringActivityAction,
  saveApplicantAuditionAction,
  saveApplicantConversationAction,
  saveApplicantHiringPath,
  updateApplicantHiringActivity,
} from "@/lib/blueprint/hiring-workflow-actions"
import { OWNER_ONLY_MESSAGE as OWNER_ONLY } from "@/lib/blueprint/questions"

const initial = { error: null, savedAt: null }

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

describe("hiring workflow actions", () => {
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
    mocks.ensure.mockResolvedValue({ error: null, path: "experienced", activities: [] })
    mocks.updateActivity.mockResolvedValue({ error: null })
    mocks.addCustom.mockResolvedValue({ error: null })
    mocks.saveConversation.mockResolvedValue({ error: null })
    mocks.saveAudition.mockResolvedValue({ error: null })
  })

  it("rejects non-owners", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await saveApplicantHiringPath(initial, form({ applicationId: "app-1", path: "beginner" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(mocks.ensure).not.toHaveBeenCalled()
    expect(
      await updateApplicantHiringActivity(
        initial,
        form({
          applicationId: "app-1",
          activityId: "virtual:review_application",
          activityKey: "review_application",
          title: "Review application",
          intent: "complete",
        }),
      ),
    ).toEqual({ error: OWNER_ONLY, savedAt: null })
    expect(
      await saveApplicantConversationAction(
        initial,
        form({ applicationId: "app-1", conversationType: "phone", status: "planned" }),
      ),
    ).toEqual({ error: OWNER_ONLY, savedAt: null })
  })

  it("saves path, activity, conversation, and audition for the owner", async () => {
    expect((await saveApplicantHiringPath(initial, form({ applicationId: "app-1", path: "experienced" }))).error).toBeNull()
    expect(mocks.ensure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: "experienced", applicationId: "app-1" }),
    )
    expect(
      (
        await updateApplicantHiringActivity(
          initial,
          form({
            applicationId: "app-1",
            activityId: "virtual:review_application",
            activityKey: "review_application",
            title: "Review application",
            intent: "complete",
          }),
        )
      ).error,
    ).toBeNull()
    expect(mocks.updateActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ intent: "complete", activityKey: "review_application" }),
    )
    expect((await addCustomHiringActivityAction(initial, form({ applicationId: "app-1", title: "Shadow a wedding" }))).error).toBeNull()
    expect(
      (
        await saveApplicantConversationAction(
          initial,
          form({
            applicationId: "app-1",
            conversationType: "video_call",
            status: "completed",
            notes: "Talked through weekend coverage.",
          }),
        )
      ).error,
    ).toBeNull()
    expect(mocks.saveConversation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ conversationType: "video_call", status: "completed" }),
    )
    const audition = await saveApplicantAuditionAction(
      initial,
      form({
        applicationId: "app-1",
        title: "Setup check",
        status: "planned",
        "skill-0": "Equipment setup",
        "skill-1": "Microphone technique",
        "skill-2": "Music programming",
      }),
    )
    expect(audition.error).toBeNull()
    expect(mocks.saveAudition).toHaveBeenCalled()
    expect(JSON.stringify(mocks.saveAudition.mock.calls[0]?.[1])).not.toMatch(/createUser|enroll|payroll/i)
  })
})
