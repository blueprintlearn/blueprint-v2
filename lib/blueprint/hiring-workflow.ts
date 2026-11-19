/**
 * Owner-recorded hiring activities. Conversations, optional auditions, and
 * hiring outcomes are entered by a person. Blueprint does not score auditions,
 * classify workers as W-2 or 1099, hire, message, or enroll anyone in training.
 */

import {
  containsForbiddenEvaluationCategory,
  ratingsFromUnknown,
  type EvaluationRating,
} from "@/lib/blueprint/candidate-review"

export const HIRING_PATHS = ["beginner", "experienced", "custom"] as const
export type HiringPathKind = (typeof HIRING_PATHS)[number]

export const HIRING_PATH_LABELS: Record<HiringPathKind, string> = {
  beginner: "Beginner / Train from scratch",
  experienced: "Experienced DJ / Subcontractor",
  custom: "Custom / Flexible",
}

export const DEFAULT_HIRING_PATH: HiringPathKind = "beginner"

export const HIRING_ACTIVITY_KEYS = [
  "review_application",
  "video_interview",
  "owner_conversation",
  "practical_audition",
  "hiring_decision",
  "training_handoff",
  "custom",
] as const
export type HiringActivityKey = (typeof HIRING_ACTIVITY_KEYS)[number]

export const HIRING_ACTIVITY_LABELS: Record<Exclude<HiringActivityKey, "custom">, string> = {
  review_application: "Review application",
  video_interview: "Video interview",
  owner_conversation: "Owner conversation",
  practical_audition: "Practical audition",
  hiring_decision: "Hiring decision",
  training_handoff: "Training handoff",
}

export const HIRING_ACTIVITY_STATUSES = ["pending", "complete", "skipped"] as const
export type HiringActivityStatus = (typeof HIRING_ACTIVITY_STATUSES)[number]

export const CONVERSATION_TYPES = ["phone", "video_call", "in_person", "other"] as const
export type ConversationType = (typeof CONVERSATION_TYPES)[number]

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  phone: "Phone",
  video_call: "Video call",
  in_person: "In person",
  other: "Other",
}

export const CONVERSATION_STATUSES = ["planned", "completed", "canceled", "no_show"] as const
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  planned: "Planned",
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No-show",
}

export const AUDITION_STATUSES = ["planned", "completed", "canceled"] as const
export type AuditionStatus = (typeof AUDITION_STATUSES)[number]

export const AUDITION_STATUS_LABELS: Record<AuditionStatus, string> = {
  planned: "Planned",
  completed: "Completed",
  canceled: "Canceled",
}

export const DEFAULT_AUDITION_SKILLS = [
  "Equipment setup",
  "Microphone technique",
  "Music programming",
  "Mixing fundamentals",
  "Event professionalism",
] as const

export const ENGAGEMENT_MODELS = ["w2", "1099", "not_specified"] as const
export type EngagementModel = (typeof ENGAGEMENT_MODELS)[number]

export const ENGAGEMENT_MODEL_LABELS: Record<EngagementModel, string> = {
  w2: "Intended W-2 (owner-provided)",
  "1099": "Intended 1099 (owner-provided)",
  not_specified: "Not specified",
}

export const HIRING_OUTCOMES = ["hired", "reversed", "corrected"] as const
export type HiringOutcomeCode = (typeof HIRING_OUTCOMES)[number]

export const HIRING_OUTCOME_LABELS: Record<HiringOutcomeCode, string> = {
  hired: "Hired (decision recorded)",
  reversed: "Hiring decision reversed",
  corrected: "Hiring details updated",
}

export const HIRING_PATH_HELP =
  "Choose a starting path. You can skip, reopen, or add activities. Blueprint does not force every company through the same process."
export const HIRING_PATH_SAVED = "Hiring path saved."
export const HIRING_CHECKLIST_HELP =
  "This is a reminder list for you. Checking an item does not email the applicant, hire them, or start training."
export const HIRING_ACTIVITY_SAVED = "Hiring activity updated."
export const CONVERSATION_HELP =
  "Record conversations you already planned or completed. Blueprint does not book a calendar or start a video call."
export const CONVERSATION_SAVED = "Conversation saved."
export const AUDITION_HELP =
  "Auditions are optional. You enter observations and ratings. Blueprint does not grade the audition or advance or reject anyone."
export const AUDITION_SAVED = "Audition saved."
export const HIRING_OUTCOME_HELP =
  "Marking hired records your decision. It does not create an employee account, contract, payroll record, or training enrollment. Employment paperwork is a separate step."
export const HIRING_OUTCOME_ENGAGEMENT_HELP =
  "This is what you intend to use. Blueprint does not classify this person as an employee or contractor."
export const TRAINING_HANDOFF_HELP =
  "Training is not enabled yet. Completing this only records that you are ready to hand them to training later."
export const AUDITION_SKILLS_INVALID = "Enter 1 to 8 job-related skills."
export const FORBIDDEN_AUDITION_SKILL_MESSAGE =
  "Use job-related skills. Do not rate personality, protected characteristics, or similar personal traits."

export const ACTIVITY_TITLE_MAX = 80
export const ACTIVITY_SKIP_REASON_MAX = 400
export const CONVERSATION_NOTES_MAX = 4000
export const CONVERSATION_NEXT_ACTION_MAX = 200
export const PERSON_RESPONSIBLE_MAX = 80
export const AUDITION_TITLE_MAX = 80
export const AUDITION_DESCRIPTION_MAX = 800
export const AUDITION_LOCATION_MAX = 200
export const AUDITION_NOTES_MAX = 4000
export const AUDITION_SKILL_MIN = 1
export const AUDITION_SKILL_MAX = 8
export const INTENDED_ROLE_MAX = 80

export type HiringActivity = {
  id: string
  activityKey: HiringActivityKey
  title: string
  required: boolean
  sortOrder: number
  status: HiringActivityStatus
  skipReason: string | null
  completedAt: string | null
  completedBy: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export type ApplicantConversation = {
  id: string
  conversationType: ConversationType
  plannedAt: string | null
  status: ConversationStatus
  notes: string | null
  nextAction: string | null
  personResponsible: string | null
  completedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type ApplicantAudition = {
  id: string
  title: string
  description: string | null
  skills: string[]
  scheduledAt: string | null
  locationOrFormat: string | null
  evaluatorName: string | null
  status: AuditionStatus
  notes: string | null
  skillRatings: EvaluationRating[]
  completedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type HiringOutcomeRecord = {
  id: string
  decisionId: string | null
  outcome: HiringOutcomeCode
  intendedRole: string
  plannedStartDate: string | null
  engagementModel: EngagementModel
  notes: string | null
  createdBy: string
  createdAt: string
}

export type HiringChecklistProgress = {
  complete: number
  skipped: number
  pending: number
  total: number
}

export type HiringWorkflowIndicators = {
  hiringPath: HiringPathKind
  nextActivityTitle: string | null
  conversationStatus: ConversationStatus | "none"
  auditionStatus: AuditionStatus | "none"
  checklistComplete: number
  checklistTotal: number
}

export type SaveHiringState = { error: string | null; savedAt: number | null }

type ActivityTemplate = { key: Exclude<HiringActivityKey, "custom">; required: boolean }

const BEGINNER_ACTIVITIES: readonly ActivityTemplate[] = [
  { key: "review_application", required: true },
  { key: "video_interview", required: false },
  { key: "owner_conversation", required: true },
  { key: "hiring_decision", required: true },
  { key: "training_handoff", required: true },
]

const EXPERIENCED_ACTIVITIES: readonly ActivityTemplate[] = [
  { key: "review_application", required: true },
  { key: "video_interview", required: false },
  { key: "owner_conversation", required: true },
  { key: "practical_audition", required: false },
  { key: "hiring_decision", required: true },
  { key: "training_handoff", required: true },
]

const CUSTOM_ACTIVITIES: readonly ActivityTemplate[] = [
  { key: "review_application", required: false },
  { key: "video_interview", required: false },
  { key: "owner_conversation", required: false },
  { key: "practical_audition", required: false },
  { key: "hiring_decision", required: false },
  { key: "training_handoff", required: false },
]

function asTrimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text.length < min || text.length > max) return null
  return text
}

export function isHiringPath(value: unknown): value is HiringPathKind {
  return typeof value === "string" && (HIRING_PATHS as readonly string[]).includes(value)
}

export function isHiringActivityKey(value: unknown): value is HiringActivityKey {
  return typeof value === "string" && (HIRING_ACTIVITY_KEYS as readonly string[]).includes(value)
}

export function isHiringActivityStatus(value: unknown): value is HiringActivityStatus {
  return typeof value === "string" && (HIRING_ACTIVITY_STATUSES as readonly string[]).includes(value)
}

export function isConversationType(value: unknown): value is ConversationType {
  return typeof value === "string" && (CONVERSATION_TYPES as readonly string[]).includes(value)
}

export function isConversationStatus(value: unknown): value is ConversationStatus {
  return typeof value === "string" && (CONVERSATION_STATUSES as readonly string[]).includes(value)
}

export function isAuditionStatus(value: unknown): value is AuditionStatus {
  return typeof value === "string" && (AUDITION_STATUSES as readonly string[]).includes(value)
}

export function isEngagementModel(value: unknown): value is EngagementModel {
  return typeof value === "string" && (ENGAGEMENT_MODELS as readonly string[]).includes(value)
}

export function isHiringOutcome(value: unknown): value is HiringOutcomeCode {
  return typeof value === "string" && (HIRING_OUTCOMES as readonly string[]).includes(value)
}

export function isVirtualActivityId(id: string): boolean {
  return id.startsWith("virtual:")
}

export function virtualActivityId(key: HiringActivityKey): string {
  return `virtual:${key}`
}

export function activityTemplatesForPath(path: HiringPathKind): readonly ActivityTemplate[] {
  if (path === "experienced") return EXPERIENCED_ACTIVITIES
  if (path === "custom") return CUSTOM_ACTIVITIES
  return BEGINNER_ACTIVITIES
}

export function defaultHiringActivities(path: HiringPathKind = DEFAULT_HIRING_PATH): HiringActivity[] {
  return activityTemplatesForPath(path).map((item, index) => ({
    id: virtualActivityId(item.key),
    activityKey: item.key,
    title: HIRING_ACTIVITY_LABELS[item.key],
    required: item.required,
    sortOrder: index,
    status: "pending",
    skipReason: null,
    completedAt: null,
    completedBy: null,
    updatedAt: null,
    updatedBy: null,
  }))
}

export function mergeHiringActivities(existing: HiringActivity[], path: HiringPathKind): HiringActivity[] {
  const kept = [...existing].sort((left, right) => left.sortOrder - right.sortOrder)
  const seen = new Set(kept.filter((row) => row.activityKey !== "custom").map((row) => row.activityKey))
  let sortOrder = kept.reduce((max, row) => Math.max(max, row.sortOrder), -1)
  for (const item of activityTemplatesForPath(path)) {
    if (seen.has(item.key)) continue
    sortOrder += 1
    kept.push({
      id: virtualActivityId(item.key),
      activityKey: item.key,
      title: HIRING_ACTIVITY_LABELS[item.key],
      required: item.required,
      sortOrder,
      status: "pending",
      skipReason: null,
      completedAt: null,
      completedBy: null,
      updatedAt: null,
      updatedBy: null,
    })
  }
  return kept.sort((left, right) => left.sortOrder - right.sortOrder)
}

export function checklistProgress(activities: HiringActivity[]): HiringChecklistProgress {
  return {
    complete: activities.filter((row) => row.status === "complete").length,
    skipped: activities.filter((row) => row.status === "skipped").length,
    pending: activities.filter((row) => row.status === "pending").length,
    total: activities.length,
  }
}

export function nextHiringActivity(activities: HiringActivity[]): HiringActivity | null {
  const pending = activities
    .filter((row) => row.status === "pending")
    .sort((left, right) => left.sortOrder - right.sortOrder)
  return pending.find((row) => row.required) ?? pending[0] ?? null
}

export function summarizeConversationStatus(rows: ApplicantConversation[]): ConversationStatus | "none" {
  if (rows.length === 0) return "none"
  if (rows.some((row) => row.status === "planned")) return "planned"
  const latest = [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
  return latest?.status ?? "none"
}

export function summarizeAuditionStatus(rows: ApplicantAudition[]): AuditionStatus | "none" {
  if (rows.length === 0) return "none"
  if (rows.some((row) => row.status === "planned")) return "planned"
  const latest = [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
  return latest?.status ?? "none"
}

export function hiringIndicatorsFromFacts(input: {
  path: HiringPathKind
  activities: HiringActivity[]
  conversations: ApplicantConversation[]
  auditions: ApplicantAudition[]
}): HiringWorkflowIndicators {
  const progress = checklistProgress(input.activities)
  return {
    hiringPath: input.path,
    nextActivityTitle: nextHiringActivity(input.activities)?.title ?? null,
    conversationStatus: summarizeConversationStatus(input.conversations),
    auditionStatus: summarizeAuditionStatus(input.auditions),
    checklistComplete: progress.complete,
    checklistTotal: progress.total,
  }
}

export function emptyHiringIndicators(): HiringWorkflowIndicators {
  return hiringIndicatorsFromFacts({
    path: DEFAULT_HIRING_PATH,
    activities: defaultHiringActivities(DEFAULT_HIRING_PATH),
    conversations: [],
    auditions: [],
  })
}

export function conversationCompletedAt(
  status: ConversationStatus,
  existing: string | null,
  now = new Date().toISOString(),
): string | null {
  if (status === "planned" || status === "canceled") return null
  return existing ?? now
}

export function auditionCompletedAt(
  status: AuditionStatus,
  existing: string | null,
  now = new Date().toISOString(),
): string | null {
  if (status !== "completed") return null
  return existing ?? now
}

export function nextHiringOutcomeCode(
  decision: "advance" | "hold" | "reject" | "hired",
  latest: HiringOutcomeCode | null,
): HiringOutcomeCode | null {
  if (decision === "hired") {
    return latest === "hired" || latest === "corrected" ? "corrected" : "hired"
  }
  if (latest === "hired" || latest === "corrected") return "reversed"
  return null
}

export function skillsFromUnknown(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < AUDITION_SKILL_MIN || value.length > AUDITION_SKILL_MAX) return null
  const skills: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const label = asTrimmed(item, 1, ACTIVITY_TITLE_MAX)
    if (!label || containsForbiddenEvaluationCategory(label)) return null
    const key = label.toLowerCase()
    if (seen.has(key)) return null
    seen.add(key)
    skills.push(label)
  }
  return skills
}

export function emptyAuditionRatings(skills: string[]): EvaluationRating[] {
  return skills.map((category) => ({ category, rating: null, notes: null }))
}

export function parseDateTimeLocal(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return null
  const iso = trimmed.length === 16 ? `${trimmed}:00` : trimmed
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseOptionalDate(value: unknown): string | null | undefined {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined
  return raw
}

export function parseHiringPathForm(
  formData: FormData,
): { ok: true; path: HiringPathKind } | { ok: false; error: string } {
  const path = formData.get("path")
  if (!isHiringPath(path)) return { ok: false, error: "Choose a hiring path." }
  return { ok: true, path }
}

export function parseHiringActivityActionForm(formData: FormData):
  | {
      ok: true
      activityId: string
      activityKey: HiringActivityKey
      title: string
      intent: "complete" | "skip" | "reopen"
      skipReason: string | null
    }
  | { ok: false; error: string } {
  const activityId = asTrimmed(formData.get("activityId"), 1, 80)
  const activityKey = formData.get("activityKey")
  const intent = formData.get("intent")
  if (!activityId) return { ok: false, error: "Choose a hiring activity." }
  if (!isHiringActivityKey(activityKey)) return { ok: false, error: "Choose a hiring activity." }
  if (intent !== "complete" && intent !== "skip" && intent !== "reopen") {
    return { ok: false, error: "Choose complete, skip, or reopen." }
  }
  const title =
    asTrimmed(formData.get("title"), 1, ACTIVITY_TITLE_MAX) ??
    (activityKey === "custom" ? null : HIRING_ACTIVITY_LABELS[activityKey])
  if (!title) return { ok: false, error: "Enter an activity name." }
  if (intent === "skip") {
    const skipRaw = String(formData.get("skipReason") ?? "").trim()
    if (!skipRaw) return { ok: true, activityId, activityKey, title, intent, skipReason: null }
    const skipReason = asTrimmed(skipRaw, 1, ACTIVITY_SKIP_REASON_MAX)
    if (!skipReason) return { ok: false, error: "Shorten the skip reason." }
    return { ok: true, activityId, activityKey, title, intent, skipReason }
  }
  return { ok: true, activityId, activityKey, title, intent, skipReason: null }
}

export function parseCustomHiringActivityForm(
  formData: FormData,
): { ok: true; title: string } | { ok: false; error: string } {
  const title = asTrimmed(formData.get("title"), 1, ACTIVITY_TITLE_MAX)
  if (!title) return { ok: false, error: "Enter a custom activity name." }
  if (containsForbiddenEvaluationCategory(title)) return { ok: false, error: FORBIDDEN_AUDITION_SKILL_MESSAGE }
  return { ok: true, title }
}

export function parseConversationForm(formData: FormData):
  | {
      ok: true
      conversationId: string | null
      conversationType: ConversationType
      plannedAt: string | null
      status: ConversationStatus
      notes: string | null
      nextAction: string | null
      personResponsible: string | null
    }
  | { ok: false; error: string } {
  const conversationIdRaw = String(formData.get("conversationId") ?? "").trim()
  const conversationId = conversationIdRaw || null
  const conversationType = formData.get("conversationType")
  if (!isConversationType(conversationType)) return { ok: false, error: "Choose a conversation type." }
  const status = formData.get("status")
  if (!isConversationStatus(status)) return { ok: false, error: "Choose a conversation status." }
  const plannedRaw = String(formData.get("plannedAt") ?? "").trim()
  let plannedAt: string | null = null
  if (plannedRaw) {
    plannedAt = parseDateTimeLocal(plannedRaw)
    if (!plannedAt) return { ok: false, error: "Enter a planned date and time, or leave it blank." }
  }
  const notesRaw = String(formData.get("notes") ?? "").trim()
  let notes: string | null = null
  if (notesRaw) {
    notes = asTrimmed(notesRaw, 1, CONVERSATION_NOTES_MAX)
    if (!notes) return { ok: false, error: "Shorten the conversation notes." }
  }
  const nextRaw = String(formData.get("nextAction") ?? "").trim()
  let nextAction: string | null = null
  if (nextRaw) {
    nextAction = asTrimmed(nextRaw, 1, CONVERSATION_NEXT_ACTION_MAX)
    if (!nextAction) return { ok: false, error: "Shorten the next action." }
  }
  const personRaw = String(formData.get("personResponsible") ?? "").trim()
  let personResponsible: string | null = null
  if (personRaw) {
    personResponsible = asTrimmed(personRaw, 1, PERSON_RESPONSIBLE_MAX)
    if (!personResponsible) return { ok: false, error: "Shorten the person responsible." }
  }
  return {
    ok: true,
    conversationId,
    conversationType,
    plannedAt,
    status,
    notes,
    nextAction,
    personResponsible,
  }
}

export function parseAuditionSkillsForm(formData: FormData): { ok: true; skills: string[] } | { ok: false; error: string } {
  const skills: string[] = []
  for (let index = 0; index < AUDITION_SKILL_MAX; index += 1) {
    const raw = String(formData.get(`skill-${index}`) ?? "").trim()
    if (!raw) continue
    const label = asTrimmed(raw, 1, ACTIVITY_TITLE_MAX)
    if (!label) return { ok: false, error: AUDITION_SKILLS_INVALID }
    if (containsForbiddenEvaluationCategory(label)) {
      return { ok: false, error: FORBIDDEN_AUDITION_SKILL_MESSAGE }
    }
    skills.push(label)
  }
  const parsed = skillsFromUnknown(skills)
  if (!parsed) return { ok: false, error: AUDITION_SKILLS_INVALID }
  return { ok: true, skills: parsed }
}

export function parseAuditionForm(formData: FormData):
  | {
      ok: true
      auditionId: string | null
      title: string
      description: string | null
      skills: string[]
      scheduledAt: string | null
      locationOrFormat: string | null
      evaluatorName: string | null
      status: AuditionStatus
      notes: string | null
      skillRatings: EvaluationRating[]
    }
  | { ok: false; error: string } {
  const auditionIdRaw = String(formData.get("auditionId") ?? "").trim()
  const auditionId = auditionIdRaw || null
  const title = asTrimmed(formData.get("title"), 1, AUDITION_TITLE_MAX)
  if (!title) return { ok: false, error: "Enter an audition title." }
  const status = formData.get("status")
  if (!isAuditionStatus(status)) return { ok: false, error: "Choose an audition status." }
  const skills: string[] = []
  const ratingRows: { category: string; rating: number | null; notes: string | null }[] = []
  for (let index = 0; index < AUDITION_SKILL_MAX; index += 1) {
    const raw = String(formData.get(`skill-${index}`) ?? "").trim()
    if (!raw) continue
    const label = asTrimmed(raw, 1, ACTIVITY_TITLE_MAX)
    if (!label) return { ok: false, error: AUDITION_SKILLS_INVALID }
    if (containsForbiddenEvaluationCategory(label)) {
      return { ok: false, error: FORBIDDEN_AUDITION_SKILL_MESSAGE }
    }
    const ratingRaw = String(formData.get(`rating-${index}`) ?? "").trim()
    const notesRaw = String(formData.get(`rating-notes-${index}`) ?? "").trim()
    skills.push(label)
    ratingRows.push({
      category: label,
      rating: ratingRaw ? Number(ratingRaw) : null,
      notes: notesRaw || null,
    })
  }
  const skillsParsed = skillsFromUnknown(skills)
  if (!skillsParsed) return { ok: false, error: AUDITION_SKILLS_INVALID }
  const ratings = ratingsFromUnknown(ratingRows, skillsParsed)
  if (!ratings) return { ok: false, error: "Choose a rating from 1 to 5, or Not evaluated." }
  const descriptionRaw = String(formData.get("description") ?? "").trim()
  let description: string | null = null
  if (descriptionRaw) {
    description = asTrimmed(descriptionRaw, 1, AUDITION_DESCRIPTION_MAX)
    if (!description) return { ok: false, error: "Shorten the audition description." }
  }
  const scheduledRaw = String(formData.get("scheduledAt") ?? "").trim()
  let scheduledAt: string | null = null
  if (scheduledRaw) {
    scheduledAt = parseDateTimeLocal(scheduledRaw)
    if (!scheduledAt) return { ok: false, error: "Enter a date and time, or leave it blank." }
  }
  const locationRaw = String(formData.get("locationOrFormat") ?? "").trim()
  let locationOrFormat: string | null = null
  if (locationRaw) {
    locationOrFormat = asTrimmed(locationRaw, 1, AUDITION_LOCATION_MAX)
    if (!locationOrFormat) return { ok: false, error: "Shorten the location or format." }
  }
  const evaluatorRaw = String(formData.get("evaluatorName") ?? "").trim()
  let evaluatorName: string | null = null
  if (evaluatorRaw) {
    evaluatorName = asTrimmed(evaluatorRaw, 1, PERSON_RESPONSIBLE_MAX)
    if (!evaluatorName) return { ok: false, error: "Shorten the evaluator name." }
  }
  const notesRaw = String(formData.get("notes") ?? "").trim()
  let notes: string | null = null
  if (notesRaw) {
    notes = asTrimmed(notesRaw, 1, AUDITION_NOTES_MAX)
    if (!notes) return { ok: false, error: "Shorten the audition notes." }
  }
  return {
    ok: true,
    auditionId,
    title,
    description,
    skills: skillsParsed,
    scheduledAt,
    locationOrFormat,
    evaluatorName,
    status,
    notes,
    skillRatings: ratings,
  }
}

export function parseHiringOutcomeFields(
  formData: FormData,
  defaultRole: string,
):
  | {
      ok: true
      intendedRole: string
      plannedStartDate: string | null
      engagementModel: EngagementModel
      notes: string | null
    }
  | { ok: false; error: string } {
  const roleRaw = String(formData.get("intendedRole") ?? "").trim()
  const intendedRole = asTrimmed(roleRaw || defaultRole, 1, INTENDED_ROLE_MAX)
  if (!intendedRole) return { ok: false, error: "Enter the intended role." }
  const plannedStartDate = parseOptionalDate(formData.get("plannedStartDate"))
  if (plannedStartDate === undefined) return { ok: false, error: "Enter a planned start date, or leave it blank." }
  const engagementRaw = formData.get("engagementModel")
  const engagementModel =
    engagementRaw == null || engagementRaw === "" ? "not_specified" : engagementRaw
  if (!isEngagementModel(engagementModel)) {
    return { ok: false, error: "Choose an intended W-2 or 1099 engagement, or Not specified." }
  }
  const notesRaw = String(formData.get("outcomeNotes") ?? "").trim()
  let notes: string | null = null
  if (notesRaw) {
    notes = asTrimmed(notesRaw, 1, 400)
    if (!notes) return { ok: false, error: "Shorten the hiring notes." }
  }
  return { ok: true, intendedRole, plannedStartDate, engagementModel, notes }
}

export function hiringPathChipLabel(path: HiringPathKind): string {
  if (path === "beginner") return "Beginner path"
  if (path === "experienced") return "Experienced path"
  return "Custom path"
}

export function conversationStatusChipLabel(status: ConversationStatus | "none"): string {
  if (status === "none") return "No conversation"
  return CONVERSATION_STATUS_LABELS[status]
}

export function auditionStatusChipLabel(status: AuditionStatus | "none"): string {
  if (status === "none") return "No audition"
  return `Audition: ${AUDITION_STATUS_LABELS[status]}`
}

export function checklistChipLabel(complete: number, total: number): string {
  return `Hiring ${complete}/${total}`
}
