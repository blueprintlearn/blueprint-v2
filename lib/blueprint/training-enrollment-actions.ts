"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import {
  ENROLLMENT_TARGET_KINDS,
  OWNER_ONLY_ENROLL_MESSAGE,
  TRAINING_ENROLLMENT_CONFIRM_MESSAGE,
  trainingInviteUrl,
  type EnrollmentSource,
  type EnrollmentTargetKind,
  type SaveEnrollmentState,
} from "@/lib/blueprint/training-enrollment"
import {
  acceptTrainingInvitation,
  cancelCompanyTrainingEnrollment,
  enrollCompanyTraining,
  regenerateTrainingInvitation,
} from "@/lib/blueprint/training-enrollment-store"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

async function requireOwnerUser() {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { ok: false as const, error: OWNER_ONLY_ENROLL_MESSAGE }
  }
  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  const supabase = await createClient()
  return { ok: true as const, membership, supabase }
}

function fail(error: string, inviteUrl: string | null = null): SaveEnrollmentState {
  if (error === OWNER_ONLY_ENROLL_MESSAGE || error === TRAINING_ENROLLMENT_CONFIRM_MESSAGE) {
    return { error, savedAt: null, inviteUrl }
  }
  return { error, savedAt: null, inviteUrl }
}

function parseTarget(formData: FormData): { kind: EnrollmentTargetKind; courseId: string | null; pathId: string | null } | string {
  const raw = String(formData.get("target") ?? "")
  const [kind, id] = raw.split(":")
  if (!id || !(ENROLLMENT_TARGET_KINDS as readonly string[]).includes(kind)) return "Choose a published course or path."
  return kind === "course"
    ? { kind: "course", courseId: id, pathId: null }
    : { kind: "path", courseId: null, pathId: id }
}

async function originFromHeaders() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "127.0.0.1:3000"
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

async function enroll(source: EnrollmentSource, formData: FormData): Promise<SaveEnrollmentState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return fail(auth.error)
  if (formData.get("confirmed") !== "1") return fail(TRAINING_ENROLLMENT_CONFIRM_MESSAGE)
  const target = parseTarget(formData)
  if (typeof target === "string") return fail(target)
  const result = await enrollCompanyTraining(auth.supabase, {
    companyId: auth.membership.companyId,
    source,
    targetKind: target.kind,
    courseId: target.courseId,
    pathId: target.pathId,
    traineeUserId: source === "staff" ? String(formData.get("traineeUserId") ?? "") || null : null,
    inviteEmail: source === "invitation" ? String(formData.get("inviteEmail") ?? "").trim() || null : null,
    preparationId: source === "recruitment" ? String(formData.get("preparationId") ?? "") || null : null,
    confirmed: true,
  })
  if (result.error) return fail(result.error)
  const inviteUrl = result.token ? trainingInviteUrl(await originFromHeaders(), result.token) : null
  if (!inviteUrl) {
    revalidatePath("/blueprint/training")
    revalidatePath("/blueprint/training/enrollments")
    revalidatePath("/blueprint/applicants")
    revalidatePath("/training")
  }
  return { error: null, savedAt: Date.now(), inviteUrl }
}

export async function enrollFromHandoffAction(
  _prev: SaveEnrollmentState,
  formData: FormData,
): Promise<SaveEnrollmentState> {
  return enroll("recruitment", formData)
}

export async function enrollStaffAction(_prev: SaveEnrollmentState, formData: FormData): Promise<SaveEnrollmentState> {
  return enroll("staff", formData)
}

export async function inviteTraineeAction(_prev: SaveEnrollmentState, formData: FormData): Promise<SaveEnrollmentState> {
  return enroll("invitation", formData)
}

export async function cancelEnrollmentAction(
  _prev: SaveEnrollmentState,
  formData: FormData,
): Promise<SaveEnrollmentState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return fail(auth.error)
  const enrollmentId = String(formData.get("enrollmentId") ?? "")
  if (!enrollmentId) return fail("Choose an enrollment to cancel.")
  const result = await cancelCompanyTrainingEnrollment(auth.supabase, enrollmentId)
  if (result.error) return fail(result.error)
  revalidatePath("/blueprint/training/enrollments")
  revalidatePath("/training")
  return { error: null, savedAt: Date.now(), inviteUrl: null }
}

export async function regenerateInviteAction(
  _prev: SaveEnrollmentState,
  formData: FormData,
): Promise<SaveEnrollmentState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return fail(auth.error)
  const enrollmentId = String(formData.get("enrollmentId") ?? "")
  if (!enrollmentId) return fail("Choose an invitation to copy a new link for.")
  const result = await regenerateTrainingInvitation(auth.supabase, enrollmentId)
  if (result.error) return fail(result.error)
  const inviteUrl = result.token ? trainingInviteUrl(await originFromHeaders(), result.token) : null
  if (!inviteUrl) return fail("Could not create a new invite link.")
  return { error: null, savedAt: Date.now(), inviteUrl }
}

export async function acceptTrainingInviteAction(
  _prev: { error: string | null; savedAt: number | null },
  formData: FormData,
): Promise<{ error: string | null; savedAt: number | null }> {
  const membership = await getCurrentMembership()
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: "Sign in to accept this invitation.", savedAt: null }
  const token = String(formData.get("token") ?? "")
  const result = await acceptTrainingInvitation(supabase, token)
  if (result.error) return { error: result.error, savedAt: null }
  revalidatePath("/training")
  revalidatePath("/")
  if (membership) revalidatePath("/blueprint/training/enrollments")
  return { error: null, savedAt: Date.now() }
}
