import { createHash, randomBytes } from "node:crypto"

import {
  INTERVIEW_BUCKET,
  INTERVIEW_SIGNED_URL_SECONDS,
  INTERVIEW_STUCK_MS,
  INTERVIEW_VIDEO_MAX_BYTES,
  applicantSessionFromUnknown,
  displayInterviewStatus,
  freezeInterviewQuestions,
  questionsFromUnknown,
  type ApplicantInterviewSession,
  type DisplayInterviewStatus,
  type InterviewQuestion,
  type InterviewStatus,
  type InterviewTemplate,
  type OwnerInterviewReview,
} from "@/lib/blueprint/interviews"
import {
  interviewTranscribeMode,
  processInterviewAnswers,
  type TranscribeMode,
} from "@/lib/blueprint/interview-process"
import type { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"

type Client = Awaited<ReturnType<typeof createClient>>
type JsonValue = NonNullable<Json>

export function hashInterviewToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function createInterviewToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashInterviewToken(token) }
}

export function interviewInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/interview/${token}`
}

export async function loadInterviewTemplate(
  client: Client,
  companyId: string,
  slug: string,
): Promise<InterviewTemplate | null> {
  const { data, error } = await client
    .from("company_interview_templates")
    .select("slug, questions, deadline_days, retention_days")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) return null
  const questions = questionsFromUnknown(data.questions)
  if (!questions) return null
  return {
    slug: data.slug,
    questions,
    deadlineDays: data.deadline_days,
    retentionDays: data.retention_days,
  }
}

export async function saveInterviewTemplate(
  client: Client,
  companyId: string,
  template: InterviewTemplate,
): Promise<{ error: string | null }> {
  const { data: existing } = await client
    .from("company_interview_templates")
    .select("id")
    .eq("company_id", companyId)
    .eq("slug", template.slug)
    .maybeSingle()
  const payload = {
    company_id: companyId,
    slug: template.slug,
    questions: freezeInterviewQuestions(template.questions) as unknown as JsonValue,
    deadline_days: template.deadlineDays,
    retention_days: template.retentionDays,
  }
  const result = existing
    ? await client.from("company_interview_templates").update(payload).eq("id", existing.id).eq("company_id", companyId)
    : await client.from("company_interview_templates").insert(payload)
  return { error: result.error?.message ?? null }
}

type InterviewRow = {
  id: string
  application_id: string
  status: string
  questions: unknown
  invited_at: string
  opened_at: string | null
  started_at: string | null
  submitted_at: string | null
  deadline_at: string
  processed_at: string | null
  processing_started_at: string | null
  processing_error: string | null
  overall_summary: string | null
}

export async function expireStaleInterviews(client: Client, companyId: string): Promise<void> {
  await client.rpc("expire_stale_video_interviews", { p_company_id: companyId })
}

export async function loadInterviewStatusByApplication(
  client: Client,
  companyId: string,
): Promise<Map<string, DisplayInterviewStatus>> {
  await expireStaleInterviews(client, companyId)
  const { data, error } = await client
    .from("company_video_interviews")
    .select("application_id, status, deadline_at")
    .eq("company_id", companyId)
  const map = new Map<string, DisplayInterviewStatus>()
  if (error || !data) return map
  for (const row of data) {
    map.set(row.application_id, displayInterviewStatus(row.status as InterviewStatus, row.deadline_at))
  }
  return map
}

export async function inviteVideoInterview(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    recruitingPageId: string
    slug: string
    questions: InterviewQuestion[]
    deadlineDays: number
    retentionDays: number
  },
): Promise<{ error: string | null; token: string | null }> {
  const frozen = freezeInterviewQuestions(input.questions)
  const { token, tokenHash } = createInterviewToken()
  const now = Date.now()
  const deadlineAt = new Date(now + input.deadlineDays * 24 * 60 * 60 * 1000).toISOString()
  const retentionUntil = new Date(now + input.retentionDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: existing } = await client
    .from("company_video_interviews")
    .select("id, status")
    .eq("company_id", input.companyId)
    .eq("application_id", input.applicationId)
    .maybeSingle()

  if (existing) {
    if (
      existing.status === "submitted" ||
      existing.status === "transcribing" ||
      existing.status === "ready" ||
      existing.status === "failed"
    ) {
      return { error: "This interview is already submitted.", token: null }
    }
    const keepProgress = existing.status === "opened" || existing.status === "in_progress"
    const { error } = await client
      .from("company_video_interviews")
      .update({
        token_hash: tokenHash,
        status: keepProgress ? existing.status : "invited",
        deadline_at: deadlineAt,
        retention_until: retentionUntil,
        invited_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("id", existing.id)
      .eq("company_id", input.companyId)
    return { error: error?.message ?? null, token: error ? null : token }
  }

  const { error } = await client.from("company_video_interviews").insert({
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    recruiting_page_id: input.recruitingPageId,
    slug: input.slug,
    token_hash: tokenHash,
    questions: frozen as unknown as JsonValue,
    status: "invited",
    deadline_at: deadlineAt,
    retention_until: retentionUntil,
  })
  return { error: error?.message ?? null, token: error ? null : token }
}

async function signedUrl(client: Client, path: string): Promise<string | null> {
  const { data, error } = await client.storage.from(INTERVIEW_BUCKET).createSignedUrl(path, INTERVIEW_SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function loadOwnerInterview(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<OwnerInterviewReview | null> {
  await expireStaleInterviews(client, companyId)
  const { data: interview, error } = await client
    .from("company_video_interviews")
    .select(
      "id, application_id, status, questions, invited_at, opened_at, started_at, submitted_at, deadline_at, processed_at, processing_started_at, processing_error, overall_summary",
    )
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .maybeSingle()
  if (error || !interview) return null
  const questions = questionsFromUnknown(interview.questions)
  if (!questions) return null
  const { data: answers } = await client
    .from("company_video_interview_answers")
    .select(
      "question_index, prompt, time_limit_seconds, storage_path, transcript, summary, processing_status, processing_error, accepted_at",
    )
    .eq("company_id", companyId)
    .eq("interview_id", interview.id)
    .order("question_index")

  const byIndex = new Map((answers ?? []).map((row) => [row.question_index, row]))
  const reviewAnswers = await Promise.all(
    questions.map(async (question, index) => {
      const row = byIndex.get(index)
      const playbackUrl = row?.storage_path ? await signedUrl(client, row.storage_path) : null
      return {
        questionIndex: index,
        prompt: row?.prompt ?? question.prompt,
        timeLimitSeconds: row?.time_limit_seconds ?? question.timeLimitSeconds,
        storagePath: row?.storage_path ?? null,
        playbackUrl,
        transcript: row?.transcript ?? null,
        summary: row?.summary ?? null,
        processingStatus: row
          ? (row.processing_status as "pending" | "ready" | "failed")
          : ("missing" as const),
        processingError: row?.processing_error ?? null,
        acceptedAt: row?.accepted_at ?? null,
      }
    }),
  )

  return {
    id: interview.id,
    applicationId: interview.application_id,
    status: displayInterviewStatus(interview.status as InterviewStatus, interview.deadline_at),
    invitedAt: interview.invited_at,
    openedAt: interview.opened_at,
    startedAt: interview.started_at,
    submittedAt: interview.submitted_at,
    deadlineAt: interview.deadline_at,
    processedAt: interview.processed_at,
    processingStartedAt: interview.processing_started_at,
    processingError: interview.processing_error,
    overallSummary: interview.overall_summary,
    questions,
    answers: reviewAnswers,
  }
}

export function shouldProcessInterview(interview: OwnerInterviewReview, now = Date.now()): boolean {
  if (interview.status === "submitted") return true
  if (interview.status === "transcribing") return isProcessingStuck(interview.processingStartedAt, now)
  return false
}

export function isProcessingStuck(startedAt: string | null, now = Date.now()): boolean {
  if (!startedAt) return true
  return now - new Date(startedAt).getTime() > INTERVIEW_STUCK_MS
}

async function writeInterviewUpdate(
  client: Client,
  companyId: string,
  interviewId: string,
  values: Database["public"]["Tables"]["company_video_interviews"]["Update"],
): Promise<string | null> {
  const { error } = await client
    .from("company_video_interviews")
    .update(values)
    .eq("id", interviewId)
    .eq("company_id", companyId)
  if (error) {
    console.error("interview process update", error)
    return error.message
  }
  return null
}

export async function processOwnerInterview(
  client: Client,
  companyId: string,
  interviewId: string,
  mode: TranscribeMode = interviewTranscribeMode(),
): Promise<{ error: string | null }> {
  const { data: interview, error } = await client
    .from("company_video_interviews")
    .select("id, status, questions, processing_started_at")
    .eq("company_id", companyId)
    .eq("id", interviewId)
    .maybeSingle()
  if (error || !interview) return { error: "missing" }
  if (interview.status === "ready") return { error: null }
  if (
    interview.status !== "submitted" &&
    interview.status !== "transcribing" &&
    interview.status !== "failed"
  ) {
    return { error: "not_ready" }
  }
  if (
    interview.status === "transcribing" &&
    !isProcessingStuck(interview.processing_started_at)
  ) {
    return { error: null }
  }

  const { data: answers, error: answerError } = await client
    .from("company_video_interview_answers")
    .select("question_index, prompt, storage_path")
    .eq("company_id", companyId)
    .eq("interview_id", interviewId)
    .order("question_index")
  if (answerError) console.error("interview process answers", answerError)
  const stored = (answers ?? []).filter((row) => row.storage_path)
  if (stored.length !== 3) {
    await writeInterviewUpdate(client, companyId, interviewId, {
      processing_error: "Accepted recordings are incomplete. The videos are kept.",
    })
    return { error: "incomplete" }
  }

  const started = await writeInterviewUpdate(client, companyId, interviewId, {
    status: "transcribing",
    processing_started_at: new Date().toISOString(),
    processing_error: null,
  })
  if (started) return { error: started }

  const playback = await Promise.all(
    stored.map(async (row) => ({
      questionIndex: row.question_index,
      prompt: row.prompt,
      playbackUrl: mode === "stub" ? row.storage_path : ((await signedUrl(client, row.storage_path)) ?? ""),
    })),
  )

  const result = await processInterviewAnswers(playback, mode)
  if (!result.ok) {
    for (const answer of result.answers) {
      const { error: readyError } = await client
        .from("company_video_interview_answers")
        .update({
          transcript: answer.transcript,
          summary: answer.summary,
          processing_status: "ready",
          processing_error: null,
        })
        .eq("interview_id", interviewId)
        .eq("question_index", answer.questionIndex)
        .eq("company_id", companyId)
      if (readyError) console.error("interview process answer", readyError)
    }
    const failedIndexes = stored
      .map((row) => row.question_index)
      .filter((index) => !result.answers.some((answer) => answer.questionIndex === index))
    for (const index of failedIndexes) {
      const { error: failedError } = await client
        .from("company_video_interview_answers")
        .update({
          processing_status: "failed",
          processing_error: result.error.slice(0, 500),
        })
        .eq("interview_id", interviewId)
        .eq("question_index", index)
        .eq("company_id", companyId)
      if (failedError) console.error("interview process answer", failedError)
    }
    await writeInterviewUpdate(client, companyId, interviewId, {
      status: "failed",
      processing_error: result.error.slice(0, 500),
      processed_at: null,
    })
    return { error: result.error }
  }

  for (const answer of result.answers) {
    const { error: readyError } = await client
      .from("company_video_interview_answers")
      .update({
        transcript: answer.transcript,
        summary: answer.summary,
        processing_status: "ready",
        processing_error: null,
      })
      .eq("interview_id", interviewId)
      .eq("question_index", answer.questionIndex)
      .eq("company_id", companyId)
    if (readyError) {
      console.error("interview process answer", readyError)
      await writeInterviewUpdate(client, companyId, interviewId, {
        status: "failed",
        processing_error: readyError.message.slice(0, 500),
        processed_at: null,
      })
      return { error: readyError.message }
    }
  }
  const finished = await writeInterviewUpdate(client, companyId, interviewId, {
    status: "ready",
    overall_summary: result.overallSummary,
    processing_error: null,
    processed_at: new Date().toISOString(),
  })
  return { error: finished }
}

export async function cleanupAbandonedUploads(
  client: Client,
  companyId: string,
  interviewId: string,
): Promise<void> {
  const { data: interview } = await client
    .from("company_video_interviews")
    .select("token_hash")
    .eq("company_id", companyId)
    .eq("id", interviewId)
    .maybeSingle()
  if (!interview) return
  const { data: answers } = await client
    .from("company_video_interview_answers")
    .select("storage_path")
    .eq("company_id", companyId)
    .eq("interview_id", interviewId)
  const keep = new Set((answers ?? []).map((row) => row.storage_path))
  const { data: objects } = await client.storage.from(INTERVIEW_BUCKET).list(`invites/${interview.token_hash}`, {
    limit: 100,
  })
  const stale = (objects ?? [])
    .map((object) => `invites/${interview.token_hash}/${object.name}`)
    .filter((path) => !keep.has(path))
  if (stale.length) await client.storage.from(INTERVIEW_BUCKET).remove(stale)
}

export async function purgeExpiredInterviewMedia(
  client: Client,
  companyId: string,
): Promise<void> {
  const { data: expired } = await client
    .from("company_video_interviews")
    .select("id")
    .eq("company_id", companyId)
    .lt("retention_until", new Date().toISOString())
  for (const interview of expired ?? []) {
    const { data: answers } = await client
      .from("company_video_interview_answers")
      .select("id, storage_path")
      .eq("company_id", companyId)
      .eq("interview_id", interview.id)
    const paths = (answers ?? []).map((row) => row.storage_path).filter(Boolean)
    if (paths.length) await client.storage.from(INTERVIEW_BUCKET).remove(paths)
    await client
      .from("company_video_interview_answers")
      .delete()
      .eq("company_id", companyId)
      .eq("interview_id", interview.id)
    await client
      .from("company_video_interviews")
      .update({
        overall_summary: null,
        processing_error: "Videos were removed after the retention period.",
      })
      .eq("id", interview.id)
      .eq("company_id", companyId)
  }
}

export async function openApplicantInterview(
  client: Client,
  token: string,
  ipHash: string,
): Promise<{ ok: true; session: ApplicantInterviewSession } | { ok: false; error: string }> {
  const { data, error } = await client.rpc("open_video_interview", {
    p_token: token,
    p_ip_hash: ipHash,
  })
  if (error) return { ok: false, error: "unavailable" }
  const session = applicantSessionFromUnknown(data)
  if (!session) {
    const record = data && typeof data === "object" ? (data as { error?: unknown }) : null
    return { ok: false, error: typeof record?.error === "string" ? record.error : "invalid" }
  }
  return { ok: true, session }
}

export async function registerApplicantAnswer(
  client: Client,
  input: {
    token: string
    ipHash: string
    questionIndex: number
    storagePath: string
    contentType: string
    byteSize: number
    durationMs: number
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.byteSize <= 0 || input.byteSize > INTERVIEW_VIDEO_MAX_BYTES) {
    return { ok: false, error: "invalid" }
  }
  const { data, error } = await client.rpc("register_video_answer", {
    p_token: input.token,
    p_ip_hash: input.ipHash,
    p_question_index: input.questionIndex,
    p_storage_path: input.storagePath,
    p_content_type: input.contentType,
    p_byte_size: input.byteSize,
    p_duration_ms: input.durationMs,
  })
  if (error) return { ok: false, error: "unavailable" }
  if (data && typeof data === "object" && (data as { ok?: unknown }).ok === true) return { ok: true }
  const record = data && typeof data === "object" ? (data as { error?: unknown }) : null
  return { ok: false, error: typeof record?.error === "string" ? record.error : "invalid" }
}

export async function completeApplicantInterview(
  client: Client,
  token: string,
  ipHash: string,
): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const { data, error } = await client.rpc("complete_video_interview", {
    p_token: token,
    p_ip_hash: ipHash,
  })
  if (error) return { ok: false, error: "unavailable" }
  if (data && typeof data === "object" && (data as { ok?: unknown }).ok === true) {
    return { ok: true, already: (data as { already?: unknown }).already === true }
  }
  const record = data && typeof data === "object" ? (data as { error?: unknown }) : null
  return { ok: false, error: typeof record?.error === "string" ? record.error : "invalid" }
}

export function requestIpHashFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || headerList.get("x-real-ip") || "unknown"
  return createHash("sha256").update(ip).digest("hex")
}

export type { InterviewRow }
