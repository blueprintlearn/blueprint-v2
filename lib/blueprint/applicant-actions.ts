"use server"

import { createHash } from "node:crypto"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import {
  insertApplicantNote,
  loadApplicantProfile,
  submitPublishedApplication,
  updateApplicationStage,
} from "@/lib/blueprint/applicant-store"
import {
  APPLICATION_NOT_ACCEPTING,
  mapSubmitError,
  parseApplicantNote,
  parseApplicantStage,
  parseApplicationForm,
  type SaveApplicantState,
  type SubmitApplicationState,
} from "@/lib/blueprint/applicants"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { pageContentFromUnknown } from "@/lib/blueprint/recruiting"
import { isValidSlug } from "@/lib/blueprint/recruiting-engine"
import { loadPublishedPageBySlug } from "@/lib/blueprint/recruiting-store"
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

function requestIpHash(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || headerList.get("x-real-ip") || "unknown"
  return createHash("sha256").update(ip).digest("hex")
}

export async function submitJoinApplication(
  _prev: SubmitApplicationState,
  formData: FormData,
): Promise<SubmitApplicationState> {
  const slug = String(formData.get("slug") ?? "").trim()
  if (!isValidSlug(slug)) return { error: APPLICATION_NOT_ACCEPTING, submitted: false }
  const supabase = await createClient()
  const published = await loadPublishedPageBySlug(supabase, slug)
  const page = published ? pageContentFromUnknown(published.page_content) : null
  if (!published || !page) return { error: APPLICATION_NOT_ACCEPTING, submitted: false }
  const parsed = parseApplicationForm(formData, page.applicationQuestions)
  if (!parsed.ok) return { error: parsed.error, submitted: false }
  const headerList = await headers()
  const submitted = await submitPublishedApplication(supabase, {
    slug,
    idempotencyKey: parsed.idempotencyKey,
    payload: parsed.payload,
    ipHash: requestIpHash(headerList),
  })
  if (!submitted.ok) return { error: mapSubmitError(submitted.error), submitted: false }
  revalidatePath("/blueprint/applicants")
  revalidatePath(`/join/${slug}`)
  return { error: null, submitted: true }
}

export async function moveApplicantStage(
  _prev: SaveApplicantState,
  formData: FormData,
): Promise<SaveApplicantState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseApplicantStage(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const supabase = await createClient()
  const profile = await loadApplicantProfile(supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await updateApplicationStage(supabase, auth.membership.companyId, applicationId, parsed.stage)
  if (saved.error) {
    console.error("applicant stage", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/applicants")
  revalidatePath(`/blueprint/applicants/${applicationId}`)
  return { error: null, savedAt: Date.now() }
}

export async function addApplicantNote(
  _prev: SaveApplicantState,
  formData: FormData,
): Promise<SaveApplicantState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseApplicantNote(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const supabase = await createClient()
  const profile = await loadApplicantProfile(supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || typeof userId !== "string" || !userId) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  const saved = await insertApplicantNote(supabase, {
    companyId: auth.membership.companyId,
    applicantId: profile.applicantId,
    applicationId,
    body: parsed.body,
    createdBy: userId,
  })
  if (saved.error) {
    console.error("applicant note", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath(`/blueprint/applicants/${applicationId}`)
  return { error: null, savedAt: Date.now() }
}
