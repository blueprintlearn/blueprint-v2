import type {
  ApplicantFollowUp,
  ApplicantReviewStatus,
  EvaluationStatus,
  OwnerDecisionCode,
  OwnerDecisionRecord,
  HumanEvaluation,
} from "@/lib/blueprint/candidate-review"
import {
  followUpIsOutstanding,
  type ApplicantReviewFilters,
} from "@/lib/blueprint/candidate-review"
import type {
  ApplicantAudition,
  ApplicantConversation,
  AuditionStatus,
  ConversationStatus,
  HiringActivity,
  HiringOutcomeRecord,
  HiringPathKind,
} from "@/lib/blueprint/hiring-workflow"
import type { DisplayInterviewStatus, OwnerInterviewReview } from "@/lib/blueprint/interviews"
import {
  APPLICATION_ANSWER_MAX,
  APPLICATION_QUESTION_MAX,
  EMAIL_MAX,
  LIST_ITEM_MAX,
  LOCATION_MAX,
  NAME_MAX,
  PHONE_MAX,
  isValidSlug,
} from "@/lib/blueprint/recruiting-engine"

export const APPLICANT_STAGES = [
  "new_application",
  "screening",
  "interview",
  "decision",
  "hired",
  "rejected",
] as const

export type ApplicantStage = (typeof APPLICANT_STAGES)[number]

export const APPLICANT_STAGE_LABELS: Record<ApplicantStage, string> = {
  new_application: "New Application",
  screening: "Screening",
  interview: "Interview",
  decision: "Decision",
  hired: "Hired",
  rejected: "Rejected",
}

export const APPLICANTS_PAGE_TITLE = "Applicants"
export const APPLICANTS_OPENING =
  "People who apply on your recruiting page land here. Move them when you have reviewed their application. Blueprint does not screen, reject, or message anyone for you."
export const APPLICANTS_EMPTY =
  "No applications yet. When a candidate applies on your published recruiting page, they will show up in New Application."
export const APPLICATION_RECEIVED =
  "We received your application. The company will review it. You do not need a Blueprint account."
export const APPLICATION_NOT_ACCEPTING = "This page is not accepting applications."
export const APPLICATION_INVALID = "Check the application and try again."
export const APPLICATION_UNAVAILABLE = "This application could not be submitted. Try again in a little while."
export const APPLICATION_CONSENT_REQUIRED = "Confirm that you have read the privacy notice before applying."
export const NOTE_EMPTY = "Write a private note before saving."
export const NOTE_SAVED = "Note saved."
export const STAGE_MOVED = "Stage updated."
export const PRIVACY_NOTICE_HREF = "/privacy"
export const PRIVACY_NOTICE_LABEL = "privacy notice"

export type OwnerQuestionAnswer = {
  prompt: string
  answer: string
}

export type ApplicationAnswers = {
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  availability: string
  experience: string
  motivation: string
  consentAccepted: boolean
  ownerQuestions: OwnerQuestionAnswer[]
}

export type ApplicantNote = {
  id: string
  body: string
  createdBy: string
  createdAt: string
  applicationId: string | null
}

export type ApplicantStageEvent = {
  id: string
  fromStage: ApplicantStage | null
  toStage: ApplicantStage
  changedBy: string | null
  changedAt: string
}

export type ApplicantCard = {
  applicationId: string
  applicantId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  roleTitle: string
  slug: string
  recruitingPageId: string
  pageVersion: number
  strategyId: string | null
  strategyVersion: number | null
  stage: ApplicantStage
  submittedAt: string
  answers: ApplicationAnswers
  interviewStatus: DisplayInterviewStatus
  reviewStatus: ApplicantReviewStatus
  evaluationStatus: EvaluationStatus
  latestDecision: OwnerDecisionCode | null
  followUp: ApplicantFollowUp | null
  hiringPath: HiringPathKind
  nextActivityTitle: string | null
  conversationStatus: ConversationStatus | "none"
  auditionStatus: AuditionStatus | "none"
  checklistComplete: number
  checklistTotal: number
}

export type ApplicantProfile = ApplicantCard & {
  notes: ApplicantNote[]
  history: ApplicantStageEvent[]
  interview: OwnerInterviewReview | null
  evaluation: HumanEvaluation | null
  evaluationCategories: string[]
  decisions: OwnerDecisionRecord[]
  hiringActivities: HiringActivity[]
  conversations: ApplicantConversation[]
  auditions: ApplicantAudition[]
  hiringOutcomes: HiringOutcomeRecord[]
}

export type ApplicantBoard = {
  cards: ApplicantCard[]
  campaigns: { pageId: string; label: string }[]
}

export type SubmitApplicationState = {
  error: string | null
  submitted: boolean
}

export type SaveApplicantState = { error: string | null; savedAt: number | null }

function asStage(value: unknown): ApplicantStage | null {
  return typeof value === "string" && (APPLICANT_STAGES as readonly string[]).includes(value)
    ? (value as ApplicantStage)
    : null
}

function asTrimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text.length < min || text.length > max) return null
  return text
}

export function isValidApplicantEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= EMAIL_MAX
}

export function applicantDisplayName(card: { firstName: string; lastName: string }): string {
  return `${card.firstName} ${card.lastName}`.trim()
}

export function answersFromUnknown(value: unknown): ApplicationAnswers | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const firstName = asTrimmed(record.firstName, 1, NAME_MAX)
  const lastName = asTrimmed(record.lastName, 1, NAME_MAX)
  const email = asTrimmed(record.email, 3, EMAIL_MAX)
  const phone = asTrimmed(record.phone, 7, PHONE_MAX)
  const location = asTrimmed(record.location, 1, LOCATION_MAX)
  const availability = asTrimmed(record.availability, 1, APPLICATION_ANSWER_MAX)
  const experience = asTrimmed(record.experience, 1, APPLICATION_ANSWER_MAX)
  const motivation = asTrimmed(record.motivation, 1, APPLICATION_ANSWER_MAX)
  if (
    !firstName ||
    !lastName ||
    !email ||
    !isValidApplicantEmail(email) ||
    !phone ||
    !location ||
    !availability ||
    !experience ||
    !motivation
  ) {
    return null
  }
  const ownerQuestions: OwnerQuestionAnswer[] = []
  if (record.ownerQuestions != null) {
    if (!Array.isArray(record.ownerQuestions) || record.ownerQuestions.length > APPLICATION_QUESTION_MAX) {
      return null
    }
    for (const item of record.ownerQuestions) {
      if (!item || typeof item !== "object") return null
      const row = item as { prompt?: unknown; answer?: unknown }
      const prompt = asTrimmed(row.prompt, 1, LIST_ITEM_MAX)
      const answer = asTrimmed(row.answer, 1, APPLICATION_ANSWER_MAX)
      if (!prompt || !answer) return null
      ownerQuestions.push({ prompt, answer })
    }
  }
  return {
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    location,
    availability,
    experience,
    motivation,
    consentAccepted: record.consentAccepted === true,
    ownerQuestions,
  }
}

export function parseApplicationForm(
  formData: FormData,
  ownerQuestions: string[],
): { ok: true; payload: Record<string, unknown>; idempotencyKey: string } | { ok: false; error: string } {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return { ok: false, error: APPLICATION_INVALID }
  }
  if (formData.get("consent") !== "1") return { ok: false, error: APPLICATION_CONSENT_REQUIRED }
  const firstName = asTrimmed(formData.get("firstName"), 1, NAME_MAX)
  const lastName = asTrimmed(formData.get("lastName"), 1, NAME_MAX)
  const email = asTrimmed(formData.get("email"), 3, EMAIL_MAX)
  const phone = asTrimmed(formData.get("phone"), 7, PHONE_MAX)
  const location = asTrimmed(formData.get("location"), 1, LOCATION_MAX)
  const availability = asTrimmed(formData.get("availability"), 1, APPLICATION_ANSWER_MAX)
  const experience = asTrimmed(formData.get("experience"), 1, APPLICATION_ANSWER_MAX)
  const motivation = asTrimmed(formData.get("motivation"), 1, APPLICATION_ANSWER_MAX)
  if (!firstName) return { ok: false, error: "Enter your first name." }
  if (!lastName) return { ok: false, error: "Enter your last name." }
  if (!email || !isValidApplicantEmail(email)) return { ok: false, error: "Enter a valid email address." }
  if (!phone) return { ok: false, error: "Enter a phone number." }
  if (!location) return { ok: false, error: "Enter your general location or service area." }
  if (!availability) return { ok: false, error: "Tell us about your availability, especially weekends." }
  if (!experience) return { ok: false, error: "Tell us about your DJ or event experience." }
  if (!motivation) return { ok: false, error: "Tell us why you want to work with this company." }
  if (ownerQuestions.length > APPLICATION_QUESTION_MAX) return { ok: false, error: APPLICATION_INVALID }
  const ownerAnswers: string[] = []
  for (const [index, prompt] of ownerQuestions.entries()) {
    const answer = asTrimmed(formData.get(`ownerAnswer-${index}`), 1, APPLICATION_ANSWER_MAX)
    if (!prompt.trim() || !answer) {
      return { ok: false, error: "Answer every question before submitting." }
    }
    ownerAnswers.push(answer)
  }
  return {
    ok: true,
    idempotencyKey,
    payload: {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      location,
      availability,
      experience,
      motivation,
      consent: "1",
      ownerAnswers,
      website: String(formData.get("website") ?? ""),
    },
  }
}

export function parseApplicantNote(formData: FormData): { ok: true; body: string } | { ok: false; error: string } {
  const body = asTrimmed(formData.get("body"), 1, 4000)
  if (!body) return { ok: false, error: NOTE_EMPTY }
  return { ok: true, body }
}

export function parseApplicantStage(formData: FormData): { ok: true; stage: ApplicantStage } | { ok: false; error: string } {
  const stage = asStage(formData.get("stage"))
  if (!stage) return { ok: false, error: "Choose a pipeline stage." }
  return { ok: true, stage }
}

export function cardFromRows(input: {
  application: {
    id: string
    applicant_id: string
    recruiting_page_id: string
    page_version: number
    slug: string
    source_strategy_id: string | null
    source_strategy_version: number | null
    role_title: string
    stage: string
    answers: unknown
    submitted_at: string
  }
  applicant: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    location: string
  }
}): ApplicantCard | null {
  const stage = asStage(input.application.stage)
  const answers = answersFromUnknown(input.application.answers)
  if (!stage || !answers || !isValidSlug(input.application.slug)) return null
  return {
    applicationId: input.application.id,
    applicantId: input.applicant.id,
    firstName: input.applicant.first_name,
    lastName: input.applicant.last_name,
    email: input.applicant.email,
    phone: input.applicant.phone,
    location: input.applicant.location,
    roleTitle: input.application.role_title,
    slug: input.application.slug,
    recruitingPageId: input.application.recruiting_page_id,
    pageVersion: input.application.page_version,
    strategyId: input.application.source_strategy_id,
    strategyVersion: input.application.source_strategy_version,
    stage,
    submittedAt: input.application.submitted_at,
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
  }
}

export function buildApplicantBoard(cards: ApplicantCard[]): ApplicantBoard {
  const seen = new Map<string, string>()
  for (const card of cards) {
    if (!seen.has(card.recruitingPageId)) {
      seen.set(card.recruitingPageId, `${card.roleTitle} · /join/${card.slug}`)
    }
  }
  return {
    cards,
    campaigns: [...seen.entries()].map(([pageId, label]) => ({ pageId, label })),
  }
}

export function filterApplicantCards(
  cards: ApplicantCard[],
  query: string,
  campaignId: string,
  extra: Pick<ApplicantReviewFilters, "stage" | "review" | "followUp"> = {
    stage: "",
    review: "",
    followUp: false,
  },
): ApplicantCard[] {
  const needle = query.trim().toLowerCase()
  return cards.filter((card) => {
    if (campaignId && card.recruitingPageId !== campaignId) return false
    if (extra.stage && card.stage !== extra.stage) return false
    if (extra.review && card.reviewStatus !== extra.review) return false
    if (extra.followUp && !followUpIsOutstanding(card.followUp)) return false
    if (!needle) return true
    const name = applicantDisplayName(card).toLowerCase()
    return name.includes(needle)
  })
}

export function cardsByStage(cards: ApplicantCard[]): Record<ApplicantStage, ApplicantCard[]> {
  const grouped = Object.fromEntries(APPLICANT_STAGES.map((stage) => [stage, [] as ApplicantCard[]])) as Record<
    ApplicantStage,
    ApplicantCard[]
  >
  for (const card of cards) grouped[card.stage].push(card)
  return grouped
}

export function mapSubmitError(code: string | null | undefined): string {
  if (code === "not_accepting") return APPLICATION_NOT_ACCEPTING
  if (code === "unavailable") return APPLICATION_UNAVAILABLE
  return APPLICATION_INVALID
}
