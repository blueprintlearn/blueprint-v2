import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  profile: {
    applicationId: "app-1",
    applicantId: "person-1",
    recruitingPageId: "page-1",
    slug: "company-c",
  },
  template: {
    slug: "company-c",
    questions: [{ prompt: "Why?", timeLimitSeconds: 60 }],
    deadlineDays: 7,
    retentionDays: 365,
  },
  invite: vi.fn(),
  saveTemplate: vi.fn(),
  loadTemplate: vi.fn(),
  loadProfile: vi.fn(),
  loadInterview: vi.fn(),
  process: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentMembership: vi.fn(),
  headers: new Headers({ host: "127.0.0.1:3000" }),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/headers", () => ({ headers: async () => mocks.headers }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/applicant-store", () => ({
  loadApplicantProfile: mocks.loadProfile,
}))
vi.mock("@/lib/blueprint/interview-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blueprint/interview-store")>(
    "@/lib/blueprint/interview-store",
  )
  return {
    ...actual,
    saveInterviewTemplate: mocks.saveTemplate,
    loadInterviewTemplate: mocks.loadTemplate,
    inviteVideoInterview: mocks.invite,
    loadOwnerInterview: mocks.loadInterview,
    processOwnerInterview: mocks.process,
  }
})
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}))

import { retryInterviewProcessing, saveInterviewQuestions, sendInterviewInvite } from "@/lib/blueprint/interview-actions"
import { OWNER_ONLY_MESSAGE as OWNER_ONLY } from "@/lib/blueprint/questions"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const questions = {
  slug: "company-c",
  "prompt-0": "Why this company?",
  "timeLimit-0": "60",
  "prompt-1": "Tell us about a recent event.",
  "timeLimit-1": "90",
  "prompt-2": "What if you were late?",
  "timeLimit-2": "60",
  deadlineDays: "7",
  retentionDays: "365",
}

describe("interview owner actions", () => {
  beforeEach(() => {
    mocks.membership = { companyId: "company-c", companyName: "Company C", role: "owner_admin" }
    mocks.guided = true
    mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
    mocks.saveTemplate.mockReset().mockResolvedValue({ error: null })
    mocks.loadTemplate.mockReset().mockResolvedValue(mocks.template)
    mocks.loadProfile.mockReset().mockResolvedValue(mocks.profile)
    mocks.invite.mockReset().mockResolvedValue({ error: null, token: "tok_abc" })
    mocks.loadInterview.mockReset().mockResolvedValue({ id: "int-1", status: "failed" })
    mocks.process.mockReset().mockResolvedValue({ error: null })
    mocks.revalidatePath.mockReset()
  })

  it("lets the owner save questions and send an invitation", async () => {
    expect((await saveInterviewQuestions({ error: null, savedAt: null }, form(questions))).error).toBeNull()
    expect(mocks.saveTemplate).toHaveBeenCalled()
    const invited = await sendInterviewInvite(
      { error: null, savedAt: null, inviteUrl: null },
      form({ applicationId: "app-1" }),
    )
    expect(invited.error).toBeNull()
    expect(invited.inviteUrl).toContain("/interview/tok_abc")
    expect(mocks.invite).toHaveBeenCalled()
  })

  it("does not invite without an owner action and blocks other roles", async () => {
    mocks.membership = { companyId: "company-c", companyName: "Company C", role: "manager" }
    expect((await sendInterviewInvite({ error: null, savedAt: null, inviteUrl: null }, form({ applicationId: "app-1" }))).error).toBe(
      OWNER_ONLY,
    )
    expect(mocks.invite).not.toHaveBeenCalled()
  })

  it("retries failed processing without changing applicant stage", async () => {
    const retried = await retryInterviewProcessing({ error: null, savedAt: null }, form({ applicationId: "app-1" }))
    expect(retried.error).toBeNull()
    expect(mocks.process).toHaveBeenCalled()
  })
})
