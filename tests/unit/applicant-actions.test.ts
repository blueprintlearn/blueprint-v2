import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  submit: vi.fn(),
  loadProfile: vi.fn(),
  updateStage: vi.fn(),
  insertNote: vi.fn(),
  loadPublished: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentMembership: vi.fn(),
  headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
  claims: { sub: "00000000-0000-4000-8000-0000000000a2" } as { sub?: string } | null,
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/headers", () => ({ headers: async () => mocks.headers }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/applicant-store", () => ({
  submitPublishedApplication: mocks.submit,
  loadApplicantProfile: mocks.loadProfile,
  updateApplicationStage: mocks.updateStage,
  insertApplicantNote: mocks.insertNote,
}))
vi.mock("@/lib/blueprint/recruiting-store", () => ({
  loadPublishedPageBySlug: mocks.loadPublished,
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: mocks.claims }, error: null }) },
  }),
}))

import { addApplicantNote, moveApplicantStage, submitJoinApplication } from "@/lib/blueprint/applicant-actions"
import {
  APPLICATION_CONSENT_REQUIRED,
  APPLICATION_NOT_ACCEPTING as APPLY_CLOSED,
} from "@/lib/blueprint/applicants"
import { OWNER_ONLY_MESSAGE as OWNER_ONLY } from "@/lib/blueprint/questions"

const KEY = "11111111-1111-4111-8111-111111111111"
const initialSubmit = { error: null, submitted: false }
const initialSave = { error: null, savedAt: null }

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const applyFields = {
  slug: "company-a",
  idempotencyKey: KEY,
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consent: "1",
}

const publishedPage = {
  id: "page-1",
  company_id: "company-a",
  version: 2,
  slug: "company-a",
  page_content: {
    companyName: "Company A",
    headline: "Company A is hiring DJs",
    introduction: "This page describes the role.",
    roleTitle: "DJ",
    roleDescription: "This search is for DJs.",
    responsibilities: ["Run events."],
    required: ["Weekends."],
    preferred: [],
    compensation: null,
    showCompensation: false,
    values: [],
    arrangement: null,
    availability: null,
    travel: null,
    primaryColor: null,
    accentColor: null,
    applicationQuestions: [],
  },
  published_at: "2026-03-01T12:00:00.000Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
  mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
  mocks.guided = true
  mocks.submit.mockResolvedValue({ ok: true })
  mocks.loadPublished.mockResolvedValue(publishedPage)
  mocks.loadProfile.mockResolvedValue({
    applicationId: "app-1",
    applicantId: "person-1",
    stage: "new_application",
  })
  mocks.updateStage.mockResolvedValue({ error: null })
  mocks.insertNote.mockResolvedValue({ error: null })
  mocks.claims = { sub: "00000000-0000-4000-8000-0000000000a2" }
})

describe("submitJoinApplication", () => {
  it("saves a published-page application", async () => {
    const result = await submitJoinApplication(initialSubmit, form(applyFields))
    expect(result).toEqual({ error: null, submitted: true })
    expect(mocks.submit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        slug: "company-a",
        idempotencyKey: KEY,
      }),
    )
  })

  it("treats a repeated idempotency key as success", async () => {
    mocks.submit.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true })
    expect(await submitJoinApplication(initialSubmit, form(applyFields))).toEqual({
      error: null,
      submitted: true,
    })
    expect(await submitJoinApplication(initialSubmit, form(applyFields))).toEqual({
      error: null,
      submitted: true,
    })
  })

  it("refuses unpublished or missing pages without creating a record", async () => {
    mocks.loadPublished.mockResolvedValue(null)
    expect(await submitJoinApplication(initialSubmit, form(applyFields))).toEqual({
      error: APPLY_CLOSED,
      submitted: false,
    })
    expect(mocks.submit).not.toHaveBeenCalled()
  })

  it("requires consent", async () => {
    expect(await submitJoinApplication(initialSubmit, form({ ...applyFields, consent: "" }))).toEqual({
      error: APPLICATION_CONSENT_REQUIRED,
      submitted: false,
    })
    expect(mocks.submit).not.toHaveBeenCalled()
  })
})

describe("owner applicant actions", () => {
  it("rejects non-owners", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await moveApplicantStage(initialSave, form({ applicationId: "app-1", stage: "screening" }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(mocks.updateStage).not.toHaveBeenCalled()
    expect(await addApplicantNote(initialSave, form({ applicationId: "app-1", body: "Call her." }))).toEqual({
      error: OWNER_ONLY,
      savedAt: null,
    })
    expect(mocks.insertNote).not.toHaveBeenCalled()
  })

  it("moves a stage and adds a note for the owner", async () => {
    expect((await moveApplicantStage(initialSave, form({ applicationId: "app-1", stage: "interview" }))).error).toBeNull()
    expect(mocks.updateStage).toHaveBeenCalledWith(expect.anything(), "company-a", "app-1", "interview")
    expect((await addApplicantNote(initialSave, form({ applicationId: "app-1", body: "Strong weekends." }))).error).toBeNull()
    expect(mocks.insertNote).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-a",
        applicantId: "person-1",
        applicationId: "app-1",
        body: "Strong weekends.",
        createdBy: "00000000-0000-4000-8000-0000000000a2",
      }),
    )
  })
})
