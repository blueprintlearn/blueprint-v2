/**
 * Owner-entered candidate review. Ratings, decisions, and follow-ups are
 * recorded by a person. Blueprint does not score, rank, message, hire, or
 * convert applicants into staff accounts.
 */

import type { ApplicantStage } from "@/lib/blueprint/applicants"
import { isValidSlug } from "@/lib/blueprint/recruiting-engine"

const PIPELINE_STAGES: readonly ApplicantStage[] = [
  "new_application",
  "screening",
  "interview",
  "decision",
  "hired",
  "rejected",
]

export const COMPANY_EVALUATION_SLUG = "company-default"
export const EVALUATION_CATEGORY_MIN = 3
export const EVALUATION_CATEGORY_MAX = 8
export const EVALUATION_CATEGORY_LABEL_MAX = 80
export const EVALUATION_NOTE_MAX = 400
export const DECISION_REASON_MAX = 400

export const DEFAULT_EVALUATION_CATEGORIES = [
  "Communication",
  "Relevant experience",
  "Availability",
  "Job-related skills",
  "Evidence from application and interview",
] as const

export const OWNER_DECISIONS = ["advance", "hold", "reject", "hired"] as const
export type OwnerDecisionCode = (typeof OWNER_DECISIONS)[number]

export const OWNER_DECISION_LABELS: Record<OwnerDecisionCode, string> = {
  advance: "Advance to next step",
  hold: "Hold for later review",
  reject: "Reject",
  hired: "Mark hired",
}

export const FOLLOW_UP_ACTIONS = [
  "schedule_conversation",
  "request_info",
  "review_video",
  "discuss_manager",
  "make_decision",
] as const
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number]

export const FOLLOW_UP_ACTION_LABELS: Record<FollowUpAction, string> = {
  schedule_conversation: "Schedule a conversation",
  request_info: "Request additional information",
  review_video: "Review video",
  discuss_manager: "Discuss with another manager",
  make_decision: "Make final decision",
}

export const FOLLOW_UP_STATUSES = ["pending", "done"] as const
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

export const APPLICANT_REVIEW_STATUSES = ["needs_review", "reviewed"] as const
export type ApplicantReviewStatus = (typeof APPLICANT_REVIEW_STATUSES)[number]

export const APPLICANT_REVIEW_STATUS_LABELS: Record<ApplicantReviewStatus, string> = {
  needs_review: "Needs review",
  reviewed: "Reviewed",
}

export const EVALUATION_STATUSES = ["not_started", "incomplete", "complete"] as const
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number]

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  not_started: "Evaluation not started",
  incomplete: "Evaluation incomplete",
  complete: "Human evaluation complete",
}

export const HUMAN_EVALUATION_TITLE = "Human evaluation"
export const HUMAN_EVALUATION_HELP =
  "You enter each rating. Blueprint does not add them up, rank this person, or recommend a hire or rejection."
export const HUMAN_EVALUATION_SAVED = "Evaluation saved."
export const DECISION_HELP =
  "You record this decision. Blueprint does not email the applicant, send an offer, or create a staff account."
export const DECISION_SAVED = "Decision recorded."
export const FOLLOW_UP_HELP =
  "Record a next step for yourself. Blueprint does not schedule, remind, or message anyone."
export const FOLLOW_UP_SAVED = "Follow-up saved."
export const SCORECARD_TITLE = "Evaluation categories"
export const SCORECARD_OPENING =
  "Choose the categories you rate when you review an applicant. Ratings stay human-entered. Do not add protected characteristics or personality labels."
export const FORBIDDEN_CATEGORY_MESSAGE =
  "Use job-related categories. Do not rate personality, protected characteristics, or similar personal traits."
export const EVALUATION_CATEGORIES_INVALID = "Enter 3 to 8 job-related categories."
export const EVALUATION_FROZEN_HELP =
  "These categories were saved with this evaluation. Changing the company list later will not rewrite them."

export const FORBIDDEN_EVALUATION_CATEGORY =
  /\b(race|racial|ethnicity|ethnic|national origin|nationality|religion|religious|\bsex\b|gender|age\b|disability|disabilities|sexual orientation|marital status|pregnancy|pregnant|genetic information|citizenship|immigration status|personality(?: type| trait)?|protected characteristic|skin color)\b/i

export type EvaluationRatingValue = 1 | 2 | 3 | 4 | 5

export type EvaluationRating = {
  category: string
  rating: EvaluationRatingValue | null
  notes: string | null
}

export type EvaluationTemplate = {
  slug: string
  categories: string[]
}

export type HumanEvaluation = {
  categories: string[]
  ratings: EvaluationRating[]
  completedAt: string | null
  updatedAt: string
  updatedBy: string
}

export type OwnerDecisionRecord = {
  id: string
  decision: OwnerDecisionCode
  reason: string | null
  fromStage: ApplicantStage | null
  toStage: ApplicantStage
  createdBy: string
  createdAt: string
}

export type ApplicantFollowUp = {
  action: FollowUpAction
  dueOn: string | null
  status: FollowUpStatus
  updatedAt: string
  updatedBy: string
}

export type ApplicantReviewIndicators = {
  reviewStatus: ApplicantReviewStatus
  evaluationStatus: EvaluationStatus
  latestDecision: OwnerDecisionCode | null
  followUp: ApplicantFollowUp | null
}

export type ApplicantReviewFilters = {
  query: string
  campaignId: string
  stage: ApplicantStage | ""
  review: ApplicantReviewStatus | ""
  followUp: boolean
}

export type SaveReviewState = { error: string | null; savedAt: number | null }

function asTrimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text.length < min || text.length > max) return null
  return text
}

function asStage(value: unknown): ApplicantStage | null {
  return typeof value === "string" && (PIPELINE_STAGES as readonly string[]).includes(value)
    ? (value as ApplicantStage)
    : null
}

export function isOwnerDecision(value: unknown): value is OwnerDecisionCode {
  return typeof value === "string" && (OWNER_DECISIONS as readonly string[]).includes(value)
}

export function isFollowUpAction(value: unknown): value is FollowUpAction {
  return typeof value === "string" && (FOLLOW_UP_ACTIONS as readonly string[]).includes(value)
}

export function isFollowUpStatus(value: unknown): value is FollowUpStatus {
  return typeof value === "string" && (FOLLOW_UP_STATUSES as readonly string[]).includes(value)
}

export function isEvaluationTemplateSlug(value: string): boolean {
  if (value === COMPANY_EVALUATION_SLUG) return true
  return isValidSlug(value)
}

export function containsForbiddenEvaluationCategory(label: string): boolean {
  return FORBIDDEN_EVALUATION_CATEGORY.test(label)
}

export function categoriesFromUnknown(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < EVALUATION_CATEGORY_MIN || value.length > EVALUATION_CATEGORY_MAX) {
    return null
  }
  const categories: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const label = asTrimmed(item, 1, EVALUATION_CATEGORY_LABEL_MAX)
    if (!label || containsForbiddenEvaluationCategory(label)) return null
    const key = label.toLowerCase()
    if (seen.has(key)) return null
    seen.add(key)
    categories.push(label)
  }
  return categories
}

export function ratingsFromUnknown(value: unknown, categories: string[]): EvaluationRating[] | null {
  if (!Array.isArray(value) || value.length !== categories.length) return null
  const ratings: EvaluationRating[] = []
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") return null
    const row = item as { category?: unknown; rating?: unknown; notes?: unknown }
    const category = asTrimmed(row.category, 1, EVALUATION_CATEGORY_LABEL_MAX)
    if (!category || category !== categories[index]) return null
    let rating: EvaluationRatingValue | null = null
    if (row.rating !== null && row.rating !== undefined && row.rating !== "") {
      const n = typeof row.rating === "number" ? row.rating : Number(row.rating)
      if (!Number.isInteger(n) || n < 1 || n > 5) return null
      rating = n as EvaluationRatingValue
    }
    let notes: string | null = null
    if (row.notes != null && row.notes !== "") {
      notes = asTrimmed(row.notes, 1, EVALUATION_NOTE_MAX)
      if (!notes) return null
    }
    ratings.push({ category, rating, notes })
  }
  return ratings
}

export function evaluationStatusFromRatings(ratings: EvaluationRating[] | null | undefined): EvaluationStatus {
  if (!ratings || ratings.length === 0) return "not_started"
  return ratings.every((row) => row.rating !== null) ? "complete" : "incomplete"
}

export function reviewStatusFromFacts(input: {
  stage: ApplicantStage
  evaluationStatus: EvaluationStatus
  latestDecision: OwnerDecisionCode | null
}): ApplicantReviewStatus {
  if (input.evaluationStatus === "complete" || input.latestDecision || input.stage !== "new_application") {
    return "reviewed"
  }
  return "needs_review"
}

export function emptyRatings(categories: string[]): EvaluationRating[] {
  return categories.map((category) => ({ category, rating: null, notes: null }))
}

export function freezeEvaluationCategories(categories: string[]): string[] {
  return categories.map((category) => category.trim())
}

export function nextStageForAdvance(stage: ApplicantStage): ApplicantStage {
  if (stage === "new_application") return "screening"
  if (stage === "screening") return "interview"
  if (stage === "interview") return "decision"
  if (stage === "hired" || stage === "rejected") return "decision"
  return "decision"
}

export function stageAfterDecision(stage: ApplicantStage, decision: OwnerDecisionCode): ApplicantStage {
  if (decision === "hold") return stage
  if (decision === "reject") return "rejected"
  if (decision === "hired") return "hired"
  return nextStageForAdvance(stage)
}

export function parseEvaluationTemplateForm(
  formData: FormData,
): { ok: true; template: EvaluationTemplate } | { ok: false; error: string } {
  const slug = asTrimmed(formData.get("slug"), 3, 48)
  if (!slug || !isEvaluationTemplateSlug(slug)) {
    return { ok: false, error: "Choose a recruiting campaign, or the company default." }
  }
  const categories: string[] = []
  for (let index = 0; index < EVALUATION_CATEGORY_MAX; index += 1) {
    const raw = String(formData.get(`category-${index}`) ?? "").trim()
    if (!raw) continue
    const label = asTrimmed(raw, 1, EVALUATION_CATEGORY_LABEL_MAX)
    if (!label) return { ok: false, error: EVALUATION_CATEGORIES_INVALID }
    if (containsForbiddenEvaluationCategory(label)) {
      return { ok: false, error: FORBIDDEN_CATEGORY_MESSAGE }
    }
    categories.push(label)
  }
  const parsed = categoriesFromUnknown(categories)
  if (!parsed) return { ok: false, error: EVALUATION_CATEGORIES_INVALID }
  return { ok: true, template: { slug, categories: freezeEvaluationCategories(parsed) } }
}

export function parseEvaluationForm(
  formData: FormData,
  categories: string[],
): { ok: true; ratings: EvaluationRating[] } | { ok: false; error: string } {
  const frozen = categoriesFromUnknown(categories)
  if (!frozen) return { ok: false, error: EVALUATION_CATEGORIES_INVALID }
  const ratings: EvaluationRating[] = []
  for (const [index, category] of frozen.entries()) {
    const ratingRaw = String(formData.get(`rating-${index}`) ?? "").trim()
    let rating: EvaluationRatingValue | null = null
    if (ratingRaw) {
      const n = Number(ratingRaw)
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return { ok: false, error: "Choose a rating from 1 to 5, or Not evaluated." }
      }
      rating = n as EvaluationRatingValue
    }
    const notesRaw = String(formData.get(`notes-${index}`) ?? "").trim()
    let notes: string | null = null
    if (notesRaw) {
      notes = asTrimmed(notesRaw, 1, EVALUATION_NOTE_MAX)
      if (!notes) return { ok: false, error: "Shorten the evaluation notes." }
    }
    ratings.push({ category, rating, notes })
  }
  return { ok: true, ratings }
}

export function parseDecisionForm(
  formData: FormData,
): { ok: true; decision: OwnerDecisionCode; reason: string | null } | { ok: false; error: string } {
  const decision = formData.get("decision")
  if (!isOwnerDecision(decision)) return { ok: false, error: "Choose a decision." }
  const reasonRaw = String(formData.get("reason") ?? "").trim()
  if (!reasonRaw) return { ok: true, decision, reason: null }
  const reason = asTrimmed(reasonRaw, 1, DECISION_REASON_MAX)
  if (!reason) return { ok: false, error: "Shorten the decision reason." }
  return { ok: true, decision, reason }
}

export function parseFollowUpForm(formData: FormData):
  | { ok: true; action: FollowUpAction; dueOn: string | null; status: FollowUpStatus }
  | { ok: false; error: string } {
  const action = formData.get("action")
  if (!isFollowUpAction(action)) return { ok: false, error: "Choose a follow-up action." }
  const statusRaw = formData.get("status")
  const status = statusRaw == null || statusRaw === "" ? "pending" : statusRaw
  if (!isFollowUpStatus(status)) return { ok: false, error: "Choose pending or done." }
  const dueRaw = String(formData.get("dueOn") ?? "").trim()
  if (!dueRaw) return { ok: true, action, dueOn: null, status }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) return { ok: false, error: "Enter a due date, or leave it blank." }
  return { ok: true, action, dueOn: dueRaw, status }
}

export function parseApplicantReviewFilters(params: {
  q?: string
  campaign?: string
  stage?: string
  review?: string
  followup?: string
}): ApplicantReviewFilters {
  const stage = asStage(params.stage) ?? ""
  const review =
    typeof params.review === "string" && (APPLICANT_REVIEW_STATUSES as readonly string[]).includes(params.review)
      ? (params.review as ApplicantReviewStatus)
      : ""
  return {
    query: typeof params.q === "string" ? params.q : "",
    campaignId: typeof params.campaign === "string" ? params.campaign : "",
    stage,
    review,
    followUp: params.followup === "1",
  }
}

export function followUpIsOutstanding(followUp: ApplicantFollowUp | null | undefined): boolean {
  return followUp?.status === "pending"
}

export function ratingSelectOptions(): { value: string; label: string }[] {
  return [
    { value: "", label: "Not evaluated" },
    { value: "1", label: "1 — low" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5 — high" },
  ]
}
