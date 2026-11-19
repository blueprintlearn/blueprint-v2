"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { loadApplicantProfile } from "@/lib/blueprint/applicant-store"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { interviewTranscribeMode } from "@/lib/blueprint/interview-process"
import {
  completeApplicantInterview,
  hashInterviewToken,
  inviteVideoInterview,
  interviewInviteUrl,
  loadInterviewTemplate,
  loadOwnerInterview,
  openApplicantInterview,
  processOwnerInterview,
  registerApplicantAnswer,
  requestIpHashFromHeaders,
  saveInterviewTemplate,
} from "@/lib/blueprint/interview-store"
import {
  DEFAULT_INTERVIEW_QUESTIONS,
  INTERVIEW_DEADLINE_DEFAULT,
  INTERVIEW_RETENTION_DEFAULT,
  INTERVIEW_VIDEO_MAX_BYTES,
  allowedInterviewContentType,
  interviewStoragePath,
  mapInterviewRpcError,
  parseInterviewTemplateForm,
  type InviteInterviewState,
  type SaveInterviewState,
} from "@/lib/blueprint/interviews"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

async function requireGuidedOwnerMembership() {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { ok: false as const, error: OWNER_ONLY_MESSAGE }
  }
  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  return { ok: true as const, membership }
}

function requestOrigin(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-host")
  const host = forwarded || headerList.get("host") || "127.0.0.1:3000"
  const proto = headerList.get("x-forwarded-proto") || "http"
  return `${proto}://${host}`
}

export async function saveInterviewQuestions(
  _prev: SaveInterviewState,
  formData: FormData,
): Promise<SaveInterviewState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const parsed = parseInterviewTemplateForm(formData)
  if (!parsed.ok) return { error: parsed.error, savedAt: null }
  const supabase = await createClient()
  const saved = await saveInterviewTemplate(supabase, auth.membership.companyId, parsed.template)
  if (saved.error) {
    console.error("interview template", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruiting/interview")
  revalidatePath("/blueprint/applicants")
  return { error: null, savedAt: Date.now() }
}

export async function sendInterviewInvite(
  _prev: InviteInterviewState,
  formData: FormData,
): Promise<InviteInterviewState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null, inviteUrl: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  if (!applicationId) return { error: SAVE_FAILED_MESSAGE, savedAt: null, inviteUrl: null }
  const supabase = await createClient()
  const profile = await loadApplicantProfile(supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null, inviteUrl: null }
  const template = await loadInterviewTemplate(supabase, auth.membership.companyId, profile.slug)
  const questions = template?.questions ?? DEFAULT_INTERVIEW_QUESTIONS
  const invited = await inviteVideoInterview(supabase, {
    companyId: auth.membership.companyId,
    applicationId: profile.applicationId,
    applicantId: profile.applicantId,
    recruitingPageId: profile.recruitingPageId,
    slug: profile.slug,
    questions,
    deadlineDays: template?.deadlineDays ?? INTERVIEW_DEADLINE_DEFAULT,
    retentionDays: template?.retentionDays ?? INTERVIEW_RETENTION_DEFAULT,
  })
  if (invited.error || !invited.token) {
    console.error("interview invite", invited.error)
    const message =
      invited.error === "This interview is already submitted." ? invited.error : SAVE_FAILED_MESSAGE
    return { error: message, savedAt: null, inviteUrl: null }
  }
  const headerList = await headers()
  revalidatePath("/blueprint/applicants")
  revalidatePath(`/blueprint/applicants/${applicationId}`)
  return {
    error: null,
    savedAt: Date.now(),
    inviteUrl: interviewInviteUrl(requestOrigin(headerList), invited.token),
  }
}

export async function retryInterviewProcessing(
  _prev: SaveInterviewState,
  formData: FormData,
): Promise<SaveInterviewState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  if (!applicationId) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const supabase = await createClient()
  const interview = await loadOwnerInterview(supabase, auth.membership.companyId, applicationId)
  if (!interview) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const processed = await processOwnerInterview(
    supabase,
    auth.membership.companyId,
    interview.id,
    interviewTranscribeMode(),
  )
  if (processed.error && processed.error !== "not_ready") {
    revalidatePath(`/blueprint/applicants/${applicationId}`)
    return { error: processed.error, savedAt: null }
  }
  revalidatePath("/blueprint/applicants")
  revalidatePath(`/blueprint/applicants/${applicationId}`)
  return { error: null, savedAt: Date.now() }
}

export async function loadPublicInterview(token: string) {
  const supabase = await createClient()
  const headerList = await headers()
  return openApplicantInterview(supabase, token, requestIpHashFromHeaders(headerList))
}

export async function savePublicInterviewAnswer(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = String(formData.get("token") ?? "")
  const answerId = String(formData.get("answerId") ?? "")
  const questionIndex = Number(formData.get("questionIndex"))
  const durationMs = Number(formData.get("durationMs"))
  const file = formData.get("file")
  if (!(file instanceof File) || file.size <= 0 || file.size > INTERVIEW_VIDEO_MAX_BYTES) {
    return { ok: false, error: "upload" }
  }
  const contentType = allowedInterviewContentType(file.type || String(formData.get("contentType") ?? ""))
  if (!contentType) return { ok: false, error: "invalid" }
  const storagePath = interviewStoragePath(hashInterviewToken(token), answerId, contentType)
  if (!storagePath) return { ok: false, error: "invalid" }
  const supabase = await createClient()
  const bytes = Buffer.from(await file.arrayBuffer())
  const uploaded = await supabase.storage.from("interview-videos").upload(storagePath, bytes, {
    contentType,
    upsert: false,
  })
  if (uploaded.error) return { ok: false, error: "upload" }
  const headerList = await headers()
  return registerApplicantAnswer(supabase, {
    token,
    ipHash: requestIpHashFromHeaders(headerList),
    questionIndex,
    storagePath,
    contentType,
    byteSize: bytes.byteLength,
    durationMs,
  })
}

export async function submitPublicInterview(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const headerList = await headers()
  const completed = await completeApplicantInterview(supabase, token, requestIpHashFromHeaders(headerList))
  if (!completed.ok) return { ok: false, error: mapInterviewRpcError(completed.error) }
  return { ok: true }
}

