import { createHash, randomBytes } from "node:crypto"

import {
  enrollmentIssueFromMessage,
  isEnrollmentSource,
  isEnrollmentStatus,
  type AwaitingHandoff,
  type EnrollmentSource,
  type EnrollmentStatus,
  type EnrollmentTargetKind,
  type StoredTrainingEnrollment,
  type TrainingInvitationView,
  type TrainingStaffMember,
} from "@/lib/blueprint/training-enrollment"
import type { createClient } from "@/lib/supabase/server"

type Client = Awaited<ReturnType<typeof createClient>>

export function hashTrainingInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function createTrainingInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashTrainingInviteToken(token) }
}

function asEnrollment(row: {
  id: string
  company_id: string
  trainee_user_id: string | null
  invite_email: string | null
  source: string
  target_kind: string
  course_id: string | null
  path_id: string | null
  content_version: number
  content_title: string
  assigned_by: string
  assigned_at: string
  status: string
  accepted_at: string | null
  cancelled_at: string | null
  preparation_id: string | null
  applicant_id: string | null
  application_id: string | null
}): StoredTrainingEnrollment | null {
  if (!isEnrollmentSource(row.source) || !isEnrollmentStatus(row.status)) return null
  if (row.target_kind !== "course" && row.target_kind !== "path") return null
  return {
    id: row.id,
    companyId: row.company_id,
    traineeUserId: row.trainee_user_id,
    inviteEmail: row.invite_email,
    source: row.source,
    targetKind: row.target_kind,
    courseId: row.course_id,
    pathId: row.path_id,
    contentVersion: row.content_version,
    contentTitle: row.content_title,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    status: row.status,
    acceptedAt: row.accepted_at,
    cancelledAt: row.cancelled_at,
    preparationId: row.preparation_id,
    applicantId: row.applicant_id,
    applicationId: row.application_id,
  }
}

export async function loadCompanyEnrollments(client: Client, companyId: string): Promise<StoredTrainingEnrollment[]> {
  const { data, error } = await client
    .from("company_training_enrollments")
    .select(
      "id, company_id, trainee_user_id, invite_email, source, target_kind, course_id, path_id, content_version, content_title, assigned_by, assigned_at, status, accepted_at, cancelled_at, preparation_id, applicant_id, application_id",
    )
    .eq("company_id", companyId)
    .order("assigned_at", { ascending: false })
  if (error || !data) return []
  return data.map(asEnrollment).filter((row): row is StoredTrainingEnrollment => row != null)
}

export async function loadTraineeEnrollments(client: Client): Promise<StoredTrainingEnrollment[]> {
  const { data, error } = await client
    .from("company_training_enrollments")
    .select(
      "id, company_id, trainee_user_id, invite_email, source, target_kind, course_id, path_id, content_version, content_title, assigned_by, assigned_at, status, accepted_at, cancelled_at, preparation_id, applicant_id, application_id",
    )
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
  if (error || !data) return []
  return data.map(asEnrollment).filter((row): row is StoredTrainingEnrollment => row != null)
}

export async function loadCompanyStaffForTraining(client: Client, companyId: string): Promise<TrainingStaffMember[]> {
  const { data, error } = await client.rpc("list_company_staff_for_training", { p_company_id: companyId })
  if (error || !data) return []
  return data.map((row) => ({
    userId: row.user_id,
    email: row.email ?? "",
    role: row.role,
    status: row.status,
  }))
}

export async function loadAwaitingHandoffs(client: Client, companyId: string): Promise<AwaitingHandoff[]> {
  const { data: preparations, error } = await client
    .from("company_applicant_training_preparations")
    .select("id, application_id, applicant_id, intended_role, training_approach, version, status")
    .eq("company_id", companyId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
  if (error || !preparations) return []
  const enrollments = await loadCompanyEnrollments(client, companyId)
  const openPrepIds = new Set(
    enrollments.filter((row) => row.status === "pending" || row.status === "active").map((row) => row.preparationId),
  )
  const applicantIds = [...new Set(preparations.map((row) => row.applicant_id))]
  const { data: applicants } = await client
    .from("company_applicants")
    .select("id, first_name, last_name, email")
    .eq("company_id", companyId)
    .in("id", applicantIds.length ? applicantIds : ["00000000-0000-4000-8000-000000000000"])
  const names = new Map((applicants ?? []).map((row) => [row.id, row]))
  return preparations.flatMap((row) => {
    if (openPrepIds.has(row.id)) return []
    const applicant = names.get(row.applicant_id)
    if (!applicant) return []
    return [
      {
        preparationId: row.id,
        applicationId: row.application_id,
        applicantId: row.applicant_id,
        applicantName: `${applicant.first_name} ${applicant.last_name}`.trim(),
        applicantEmail: applicant.email,
        intendedRole: row.intended_role,
        trainingApproach: row.training_approach,
        approvedVersion: row.version,
      },
    ]
  })
}

export async function enrollCompanyTraining(
  client: Client,
  input: {
    companyId: string
    source: EnrollmentSource
    targetKind: EnrollmentTargetKind
    courseId: string | null
    pathId: string | null
    traineeUserId: string | null
    inviteEmail: string | null
    preparationId: string | null
    confirmed: boolean
  },
): Promise<{ error: string | null; enrollmentId: string | null; status: EnrollmentStatus | null; token: string | null; existing: boolean }> {
  const { token, tokenHash } = createTrainingInviteToken()
  const { data, error } = await client.rpc("enroll_company_training", {
    p_company_id: input.companyId,
    p_source: input.source,
    p_target_kind: input.targetKind,
    p_course_id: input.courseId ?? undefined,
    p_path_id: input.pathId ?? undefined,
    p_trainee_user_id: input.traineeUserId ?? undefined,
    p_invite_email: input.inviteEmail ?? undefined,
    p_preparation_id: input.preparationId ?? undefined,
    p_confirmed: input.confirmed,
    p_token_hash: tokenHash,
  })
  if (error) return { error: enrollmentIssueFromMessage(error.message), enrollmentId: null, status: null, token: null, existing: false }
  const payload = data as { ok?: boolean; enrollmentId?: string; status?: string; existing?: boolean } | null
  const status = payload?.status && isEnrollmentStatus(payload.status) ? payload.status : null
  if (!payload?.ok || !payload.enrollmentId || !status) {
    return { error: "Could not save the training enrollment.", enrollmentId: null, status: null, token: null, existing: false }
  }
  return {
    error: null,
    enrollmentId: payload.enrollmentId,
    status,
    token: status === "pending" && !payload.existing ? token : null,
    existing: Boolean(payload.existing),
  }
}

export async function cancelCompanyTrainingEnrollment(client: Client, enrollmentId: string): Promise<{ error: string | null }> {
  const { error } = await client.rpc("cancel_company_training_enrollment", { p_enrollment_id: enrollmentId })
  if (error) return { error: enrollmentIssueFromMessage(error.message) }
  return { error: null }
}

export async function regenerateTrainingInvitation(
  client: Client,
  enrollmentId: string,
): Promise<{ error: string | null; token: string | null }> {
  const { token, tokenHash } = createTrainingInviteToken()
  const { data, error } = await client.rpc("regenerate_training_invitation", {
    p_enrollment_id: enrollmentId,
    p_token_hash: tokenHash,
  })
  if (error) return { error: enrollmentIssueFromMessage(error.message), token: null }
  const payload = data as { ok?: boolean; status?: string } | null
  if (!payload?.ok || payload.status !== "pending") {
    return { error: "Could not create a new invite link.", token: null }
  }
  return { error: null, token }
}

export async function loadTrainingInvitation(client: Client, token: string): Promise<TrainingInvitationView | { error: string }> {
  const { data, error } = await client.rpc("get_training_invitation", { p_token_hash: hashTrainingInviteToken(token) })
  if (error) return { error: enrollmentIssueFromMessage(error.message) }
  const payload = data as { ok?: boolean; code?: string; status?: string; inviteEmail?: string; contentTitle?: string; companyName?: string; targetKind?: string } | null
  if (!payload?.ok) return { error: enrollmentIssueFromMessage(`training-enrollment:${payload?.code ?? "not-found"}`) }
  if (!payload.inviteEmail || !payload.contentTitle || !payload.companyName) return { error: "That invitation was not found." }
  if (payload.targetKind !== "course" && payload.targetKind !== "path") return { error: "That invitation was not found." }
  if (!isEnrollmentStatus(payload.status ?? "")) return { error: "That invitation was not found." }
  return {
    status: payload.status as EnrollmentStatus,
    inviteEmail: payload.inviteEmail,
    contentTitle: payload.contentTitle,
    companyName: payload.companyName,
    targetKind: payload.targetKind,
  }
}

export async function acceptTrainingInvitation(client: Client, token: string): Promise<{ error: string | null }> {
  const { error } = await client.rpc("accept_training_invitation", { p_token_hash: hashTrainingInviteToken(token) })
  if (error) return { error: enrollmentIssueFromMessage(error.message) }
  return { error: null }
}
