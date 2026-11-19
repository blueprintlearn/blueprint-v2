/**
 * One-way video interviews. Owners configure questions, freeze them on invite,
 * and review recordings. Blueprint never scores, ranks, or decides.
 */

export const INTERVIEW_QUESTION_COUNT = 3
export const INTERVIEW_PROMPT_MAX = 200
export const INTERVIEW_TIME_MIN = 15
export const INTERVIEW_TIME_MAX = 180
export const INTERVIEW_DEADLINE_MIN = 1
export const INTERVIEW_DEADLINE_MAX = 30
export const INTERVIEW_RETENTION_MIN = 30
export const INTERVIEW_RETENTION_MAX = 730
export const INTERVIEW_RETENTION_DEFAULT = 365
export const INTERVIEW_DEADLINE_DEFAULT = 7
export const INTERVIEW_VIDEO_MAX_BYTES = 26_214_400
export const INTERVIEW_SIGNED_URL_SECONDS = 120
export const INTERVIEW_STUCK_MS = 10 * 60 * 1000
export const INTERVIEW_BUCKET = "interview-videos"

export const INTERVIEW_TIME_OPTIONS = [15, 30, 45, 60, 90, 120] as const

export const INTERVIEW_STATUSES = [
  "invited",
  "opened",
  "in_progress",
  "submitted",
  "transcribing",
  "ready",
  "failed",
  "expired",
] as const

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]
export type DisplayInterviewStatus = InterviewStatus | "not_sent"

export const INTERVIEW_STATUS_LABELS: Record<DisplayInterviewStatus, string> = {
  not_sent: "Interview Not Sent",
  invited: "Invited",
  opened: "Opened",
  in_progress: "In Progress",
  submitted: "Submitted",
  transcribing: "Transcribing",
  ready: "Ready for Review",
  failed: "Processing Failed",
  expired: "Expired",
}

export const DEFAULT_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    prompt: "Why do you want to DJ with this company?",
    timeLimitSeconds: 60,
  },
  {
    prompt: "Tell us about a recent event you worked or attended, and what you did there.",
    timeLimitSeconds: 90,
  },
  {
    prompt: "What would you do if you were running late to a gig?",
    timeLimitSeconds: 60,
  },
]

export const INTERVIEW_SETUP_TITLE = "Video interview"
export const INTERVIEW_SETUP_OPENING =
  "Invite applicants to record answers to three questions. You send each invitation yourself. Blueprint does not score, rank, or reject anyone from the video."
export const INTERVIEW_INVITE_HELP =
  "Copy this link and send it yourself. Blueprint does not email applicants. Editing questions later will not change interviews that already have a link."
export const INTERVIEW_LIVE_DISABLED =
  "Live applicant interviews are not enabled on hosted environments until storage, privacy, retention, and security controls are verified."
export const INTERVIEW_UNSUPPORTED =
  "This browser cannot record video. Try the latest Chrome, Safari, or Edge, and allow camera and microphone access."
export const INTERVIEW_PERMISSION =
  "Blueprint needs camera and microphone access to record your answers. Allow both when the browser asks. Nothing is uploaded until you accept a take."
export const INTERVIEW_EXPIRED = "This interview link has expired. The company can send a new invitation if they still want your answers."
export const INTERVIEW_INVALID = "This interview link is not valid."
export const INTERVIEW_SUBMITTED = "Your interview is submitted. You can close this page."
export const INTERVIEW_INCOMPLETE = "Record an accepted answer for every question before submitting."
export const INTERVIEW_UPLOAD_FAILED = "That recording did not upload. Check your connection and try again."
export const INTERVIEW_RESUME = "Welcome back. Your accepted answers are saved. Continue from the next question."
export const INTERVIEW_CONFIRM =
  "Use this take to save it, or record again. The time limit stops the recording automatically."
export const INTERVIEW_NO_SCORE =
  "These are the applicant’s words and the original video. AI summaries are labeled separately. Blueprint does not score, rank, or recommend a hire or rejection."

export type InterviewQuestion = {
  prompt: string
  timeLimitSeconds: number
}

export type InterviewTemplate = {
  slug: string
  questions: InterviewQuestion[]
  deadlineDays: number
  retentionDays: number
}

export type InterviewAnswerReview = {
  questionIndex: number
  prompt: string
  timeLimitSeconds: number
  storagePath: string | null
  playbackUrl: string | null
  transcript: string | null
  summary: string | null
  processingStatus: "pending" | "ready" | "failed" | "missing"
  processingError: string | null
  acceptedAt: string | null
}

export type OwnerInterviewReview = {
  id: string
  applicationId: string
  status: DisplayInterviewStatus
  invitedAt: string
  openedAt: string | null
  startedAt: string | null
  submittedAt: string | null
  deadlineAt: string
  processedAt: string | null
  processingStartedAt: string | null
  processingError: string | null
  overallSummary: string | null
  questions: InterviewQuestion[]
  answers: InterviewAnswerReview[]
}

export type ApplicantInterviewSession = {
  interviewId: string
  tokenHash: string
  status: InterviewStatus
  companyName: string
  roleTitle: string
  deadlineAt: string
  submittedAt: string | null
  questions: InterviewQuestion[]
  acceptedIndexes: number[]
}

export type InviteInterviewState = {
  error: string | null
  savedAt: number | null
  inviteUrl: string | null
}

export type SaveInterviewState = { error: string | null; savedAt: number | null }

function asTrimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text.length < min || text.length > max) return null
  return text
}

function asInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}

export function isInterviewStatus(value: unknown): value is InterviewStatus {
  return typeof value === "string" && (INTERVIEW_STATUSES as readonly string[]).includes(value)
}

export function questionsFromUnknown(value: unknown): InterviewQuestion[] | null {
  if (!Array.isArray(value) || value.length !== INTERVIEW_QUESTION_COUNT) return null
  const questions: InterviewQuestion[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const row = item as { prompt?: unknown; timeLimitSeconds?: unknown }
    const prompt = asTrimmed(row.prompt, 1, INTERVIEW_PROMPT_MAX)
    const timeLimitSeconds = asInt(row.timeLimitSeconds, INTERVIEW_TIME_MIN, INTERVIEW_TIME_MAX)
    if (!prompt || timeLimitSeconds === null) return null
    questions.push({ prompt, timeLimitSeconds })
  }
  return questions
}

export function parseInterviewTemplateForm(formData: FormData):
  | { ok: true; template: InterviewTemplate }
  | { ok: false; error: string } {
  const slug = asTrimmed(formData.get("slug"), 3, 48)
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: "Choose a recruiting campaign." }
  }
  const questions: InterviewQuestion[] = []
  for (let index = 0; index < INTERVIEW_QUESTION_COUNT; index += 1) {
    const prompt = asTrimmed(formData.get(`prompt-${index}`), 1, INTERVIEW_PROMPT_MAX)
    const timeLimitSeconds = asInt(formData.get(`timeLimit-${index}`), INTERVIEW_TIME_MIN, INTERVIEW_TIME_MAX)
    if (!prompt) return { ok: false, error: "Write all three interview questions." }
    if (timeLimitSeconds === null) return { ok: false, error: "Choose a time limit between 15 and 180 seconds." }
    questions.push({ prompt, timeLimitSeconds })
  }
  const deadlineDays = asInt(formData.get("deadlineDays"), INTERVIEW_DEADLINE_MIN, INTERVIEW_DEADLINE_MAX)
  const retentionDays = asInt(formData.get("retentionDays"), INTERVIEW_RETENTION_MIN, INTERVIEW_RETENTION_MAX)
  if (deadlineDays === null) return { ok: false, error: "Choose an invitation deadline between 1 and 30 days." }
  if (retentionDays === null) {
    return { ok: false, error: "Choose how long to keep videos, between 30 and 730 days." }
  }
  return {
    ok: true,
    template: { slug, questions, deadlineDays, retentionDays },
  }
}

export function freezeInterviewQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
  return questions.map((question) => ({
    prompt: question.prompt.trim(),
    timeLimitSeconds: question.timeLimitSeconds,
  }))
}

export function displayInterviewStatus(
  status: InterviewStatus | null | undefined,
  deadlineAt: string | null | undefined,
  now = new Date(),
): DisplayInterviewStatus {
  if (!status) return "not_sent"
  if (
    (status === "invited" || status === "opened" || status === "in_progress") &&
    deadlineAt &&
    new Date(deadlineAt).getTime() < now.getTime()
  ) {
    return "expired"
  }
  return status
}

export function interviewStatusTone(
  status: DisplayInterviewStatus,
): "neutral" | "sky" | "butter" | "lavender" | "mint" | "danger" {
  if (status === "not_sent") return "neutral"
  if (status === "invited" || status === "opened") return "sky"
  if (status === "in_progress" || status === "submitted" || status === "transcribing") return "butter"
  if (status === "ready") return "mint"
  if (status === "failed" || status === "expired") return "danger"
  return "lavender"
}

export function hasCompleteAnswers(acceptedIndexes: Iterable<number>): boolean {
  const set = new Set(acceptedIndexes)
  return set.has(0) && set.has(1) && set.has(2)
}

export function interviewStoragePath(tokenHash: string, answerId: string, contentType: string): string | null {
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) return null
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(answerId)) {
    return null
  }
  const extension = contentType === "video/mp4" ? "mp4" : contentType === "video/webm" ? "webm" : null
  if (!extension) return null
  return `invites/${tokenHash}/${answerId.toLowerCase()}.${extension}`
}

export function allowedInterviewContentType(value: string): "video/webm" | "video/mp4" | null {
  if (value === "video/webm" || value.startsWith("video/webm")) return "video/webm"
  if (value === "video/mp4" || value.startsWith("video/mp4")) return "video/mp4"
  return null
}

export function mapInterviewRpcError(code: string | null | undefined): string {
  if (code === "expired") return INTERVIEW_EXPIRED
  if (code === "unavailable") return "This interview could not be opened. Try again in a little while."
  if (code === "submitted") return INTERVIEW_SUBMITTED
  if (code === "incomplete") return INTERVIEW_INCOMPLETE
  if (code === "upload") return INTERVIEW_UPLOAD_FAILED
  return INTERVIEW_INVALID
}

export function applicantSessionFromUnknown(value: unknown): ApplicantInterviewSession | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (record.ok !== true) return null
  const questions = questionsFromUnknown(record.questions)
  if (!questions) return null
  if (typeof record.interviewId !== "string" || typeof record.tokenHash !== "string") return null
  if (!isInterviewStatus(record.status)) return null
  if (typeof record.companyName !== "string" || typeof record.roleTitle !== "string") return null
  if (typeof record.deadlineAt !== "string") return null
  const accepted = Array.isArray(record.accepted)
    ? record.accepted
        .map((row) => {
          if (!row || typeof row !== "object") return null
          const index = (row as { questionIndex?: unknown }).questionIndex
          return typeof index === "number" ? index : null
        })
        .filter((index): index is number => index !== null)
    : []
  return {
    interviewId: record.interviewId,
    tokenHash: record.tokenHash,
    status: record.status,
    companyName: record.companyName,
    roleTitle: record.roleTitle,
    deadlineAt: record.deadlineAt,
    submittedAt: typeof record.submittedAt === "string" ? record.submittedAt : null,
    questions,
    acceptedIndexes: accepted,
  }
}

export function containsForbiddenEvaluation(text: string): boolean {
  return /\b(score(?:d|s)?|rating|rank(?:ing|ed)?|pass\/fail|recommend(?:ed|s)? (?:hiring|rejecting)|personality (?:type|trait)|protected characteristic)\b/i.test(
    text,
  )
}
