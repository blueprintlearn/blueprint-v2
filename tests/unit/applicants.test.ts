import { describe, expect, it } from "vitest"

import { applicantScreeningHandoffFromApplication } from "@/lib/blueprint/applicant-screening-handoff"
import {
  APPLICATION_CONSENT_REQUIRED,
  APPLICATION_RECEIVED,
  applicantDisplayName,
  answersFromUnknown,
  buildApplicantBoard,
  cardsByStage,
  filterApplicantCards,
  parseApplicantNote,
  parseApplicantStage,
  parseApplicationForm,
  type ApplicantCard,
  type ApplicationAnswers,
} from "@/lib/blueprint/applicants"
import { parseRecruitingEditor, RECRUITING_SENSITIVE_QUESTION } from "@/lib/blueprint/recruiting"
import { composeRecruitingMaterials } from "@/lib/blueprint/recruiting-engine"
import type { RecruitmentStrategyHandoff } from "@/lib/blueprint/recruitment-strategy-handoff"

const KEY = "11111111-1111-4111-8111-111111111111"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const validApply = {
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

const answers: ApplicationAnswers = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consentAccepted: true,
  ownerQuestions: [{ prompt: "Can you work New Year's Eve?", answer: "Yes." }],
}

function card(overrides: Partial<ApplicantCard> = {}): ApplicantCard {
  return {
    applicationId: "app-1",
    applicantId: "person-1",
    firstName: "Maya",
    lastName: "Chen",
    email: "maya@example.com",
    phone: "555-010-0199",
    location: "Austin, TX",
    roleTitle: "DJ",
    slug: "company-a",
    recruitingPageId: "page-1",
    pageVersion: 2,
    strategyId: "strat-1",
    strategyVersion: 1,
    stage: "new_application",
    submittedAt: "2026-03-01T12:00:00.000Z",
    answers,
    interviewStatus: "not_sent",
    reviewStatus: "needs_review",
    evaluationStatus: "not_started",
    latestDecision: null,
    followUp: null,
    hiringPath: "beginner",
    nextActivityTitle: "Review application",
    conversationStatus: "none",
    auditionStatus: "none",
    checklistComplete: 0,
    checklistTotal: 5,
    ...overrides,
  }
}

describe("parseApplicationForm", () => {
  it("accepts a complete public application and ignores a later page question list change at parse time", () => {
    const parsed = parseApplicationForm(form({ ...validApply, "ownerAnswer-0": "Yes." }), [
      "Can you work New Year's Eve?",
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.idempotencyKey).toBe(KEY)
    expect(parsed.payload.email).toBe("maya@example.com")
    expect(parsed.payload.ownerAnswers).toEqual(["Yes."])
    expect(JSON.stringify(parsed.payload)).not.toMatch(/social security|ssn|birth date/i)
  })

  it("requires consent and does not mention whether an email already exists", () => {
    const missing = parseApplicationForm(form({ ...validApply, consent: "" }), [])
    expect(missing).toEqual({ ok: false, error: APPLICATION_CONSENT_REQUIRED })
    expect(JSON.stringify(missing)).not.toMatch(/already|exists/i)
    const badEmail = parseApplicationForm(form({ ...validApply, email: "not-an-email" }), [])
    expect(badEmail.ok).toBe(false)
    if (badEmail.ok) return
    expect(badEmail.error).not.toMatch(/already|exists/i)
  })
})

describe("applicant pipeline helpers", () => {
  it("searches by name, filters by campaign, and groups by stage", () => {
    const maya = card()
    const jordan = card({
      applicationId: "app-2",
      applicantId: "person-2",
      firstName: "Jordan",
      lastName: "Lee",
      stage: "interview",
      recruitingPageId: "page-2",
      slug: "company-a-lead",
      roleTitle: "Lead DJ",
    })
    expect(filterApplicantCards([maya, jordan], "maya", "")).toEqual([maya])
    expect(filterApplicantCards([maya, jordan], "", "page-2")).toEqual([jordan])
    expect(
      filterApplicantCards([maya, jordan], "", "", { stage: "interview", review: "", followUp: false }),
    ).toEqual([jordan])
    expect(
      filterApplicantCards(
        [
          maya,
          card({
            applicationId: "app-3",
            firstName: "Sam",
            lastName: "Ortiz",
            followUp: {
              action: "review_video",
              dueOn: "2026-04-01",
              status: "pending",
              updatedAt: "2026-03-02T12:00:00.000Z",
              updatedBy: "user-a",
            },
          }),
        ],
        "",
        "",
        { stage: "", review: "", followUp: true },
      ),
    ).toHaveLength(1)
    expect(cardsByStage([maya, jordan]).interview).toEqual([jordan])
    expect(cardsByStage([maya, jordan]).new_application).toEqual([maya])
    expect(buildApplicantBoard([maya, jordan]).campaigns).toEqual([
      { pageId: "page-1", label: "DJ · /join/company-a" },
      { pageId: "page-2", label: "Lead DJ · /join/company-a-lead" },
    ])
    expect(applicantDisplayName(maya)).toBe("Maya Chen")
    expect(maya.interviewStatus).toBe("not_sent")
    expect(Object.keys(cardsByStage([maya, jordan]))).toEqual([
      "new_application",
      "screening",
      "interview",
      "decision",
      "hired",
      "rejected",
    ])
  })

  it("keeps frozen answers when later copy differs", () => {
    const stored = answersFromUnknown({
      ...answers,
      ownerQuestions: [{ prompt: "Can you work New Year's Eve?", answer: "Yes." }],
    })
    expect(stored).toEqual(answers)
    expect(stored?.ownerQuestions[0]?.prompt).toBe("Can you work New Year's Eve?")
    expect(stored?.motivation).not.toBe("changed later")
  })

  it("records notes and stage changes without inventing a required path", () => {
    expect(parseApplicantNote(form({ body: "Strong weekend availability." })).ok).toBe(true)
    expect(parseApplicantStage(form({ stage: "rejected" }))).toEqual({ ok: true, stage: "rejected" })
    expect(parseApplicantStage(form({ stage: "hired" })).ok).toBe(true)
    expect(parseApplicantStage(form({ stage: "mystery" })).ok).toBe(false)
  })
})

describe("stage 3.4 screening handoff", () => {
  it("exposes authorized application data and keeps screening closed", () => {
    expect(
      applicantScreeningHandoffFromApplication({
        companyId: "company-a",
        applicantId: "person-1",
        applicationId: "app-1",
        pageId: "page-1",
        pageVersion: 2,
        slug: "company-a",
        strategyId: "strat-1",
        strategyVersion: 1,
        roleTitle: "DJ",
        stage: "new_application",
        submittedAt: "2026-03-01T12:00:00.000Z",
        answers,
      }).screeningDestination,
    ).toBe("not_enabled")
    expect(APPLICATION_RECEIVED).toMatch(/received your application/i)
  })
})

describe("owner application questions", () => {
  it("rejects Social Security or birth-date questions", () => {
    const handoff: RecruitmentStrategyHandoff = {
      companyId: "company-a",
      strategyId: "strat-1",
      version: 1,
      approvedAt: "2026-01-15T12:00:00.000Z",
      approvedBy: "user-a",
      reason: "growth",
      hiringTarget: 2,
      hireProfile: "beginner",
      candidate: { required: ["Run events."], preferred: [], values: [] },
      employment: {
        arrangement: null,
        compensation: "Not provided. Blueprint will not invent a rate or local market price.",
      },
      channels: [],
      budgetApproach: "",
      nextSteps: [],
      ownerNote: null,
    }
    const generated = composeRecruitingMaterials("Company A", handoff, "/join/company-a")
    const fields: Record<string, string> = {
      slug: "company-a",
      companyName: generated.page.companyName,
      headline: generated.page.headline,
      introduction: generated.page.introduction,
      roleTitle: generated.page.roleTitle,
      roleDescription: generated.page.roleDescription,
      responsibilities: generated.page.responsibilities.join("\n"),
      required: generated.page.required.join("\n"),
      preferred: generated.page.preferred.join("\n"),
      indeedTitle: generated.ads.indeed.title,
      indeedBody: generated.ads.indeed.body,
      socialTitle: generated.ads.social.title,
      socialBody: generated.ads.social.body,
      referralTitle: generated.ads.referral.title,
      referralBody: generated.ads.referral.body,
      generalTitle: generated.ads.general.title,
      generalBody: generated.ads.general.body,
      applicationQuestions: "What is your Social Security number?",
    }
    expect(parseRecruitingEditor(form(fields))).toEqual({
      ok: false,
      error: RECRUITING_SENSITIVE_QUESTION,
    })
  })
})
