"use server"

import { revalidatePath } from "next/cache"

import { loadApplicantProfile } from "@/lib/blueprint/applicant-store"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import {
  TRAINING_PREP_MISSING_DRAFT,
  TRAINING_PREP_NOT_HIRED,
  TRAINING_PREP_REVERSED,
  parseTrainingApprovalForm,
  parseTrainingPrepForm,
  type SaveTrainingState,
} from "@/lib/blueprint/training-preparation"
import {
  approveTrainingPrepDraft,
  ensureTrainingPrepDraft,
  saveTrainingPrepDraft,
  startTrainingPrepRevision,
} from "@/lib/blueprint/training-preparation-store"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
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

async function requireOwnerUser() {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return auth
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || typeof userId !== "string" || !userId) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  return { ok: true as const, membership: auth.membership, supabase, userId }
}

function revalidateApplicant(applicationId: string) {
  revalidatePath("/blueprint/applicants")
  revalidatePath(`/blueprint/applicants/${applicationId}`)
}

function actionError(error: string): SaveTrainingState {
  if (error === TRAINING_PREP_NOT_HIRED || error === TRAINING_PREP_REVERSED || error === TRAINING_PREP_MISSING_DRAFT) {
    return { error, savedAt: null }
  }
  console.error("training preparation", error)
  return { error: SAVE_FAILED_MESSAGE, savedAt: null }
}

export async function startApplicantTrainingPreparation(
  _prev: SaveTrainingState,
  formData: FormData,
): Promise<SaveTrainingState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  if (!applicationId) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const started = await ensureTrainingPrepDraft(auth.supabase, profile, auth.userId, auth.membership.companyId)
  if (started.error) return actionError(started.error)
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function saveApplicantTrainingPreparation(
  _prev: SaveTrainingState,
  formData: FormData,
): Promise<SaveTrainingState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseTrainingPrepForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await saveTrainingPrepDraft(auth.supabase, {
    companyId: auth.membership.companyId,
    profile,
    value: parsed.value,
    actorId: auth.userId,
  })
  if (saved.error) return actionError(saved.error)
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function approveApplicantTrainingPreparation(
  _prev: SaveTrainingState,
  formData: FormData,
): Promise<SaveTrainingState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  const parsed = parseTrainingApprovalForm(formData)
  if (!applicationId || !parsed.ok) return { error: parsed.ok ? SAVE_FAILED_MESSAGE : parsed.error, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const saved = await approveTrainingPrepDraft(auth.supabase, {
    companyId: auth.membership.companyId,
    profile,
    value: parsed.value,
    actorId: auth.userId,
  })
  if (saved.error) return actionError(saved.error)
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}

export async function reviseApplicantTrainingPreparation(
  _prev: SaveTrainingState,
  formData: FormData,
): Promise<SaveTrainingState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const applicationId = String(formData.get("applicationId") ?? "").trim()
  if (!applicationId) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const profile = await loadApplicantProfile(auth.supabase, auth.membership.companyId, applicationId)
  if (!profile) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  const started = await startTrainingPrepRevision(auth.supabase, {
    companyId: auth.membership.companyId,
    profile,
    actorId: auth.userId,
  })
  if (started.error) return actionError(started.error)
  revalidateApplicant(applicationId)
  return { error: null, savedAt: Date.now() }
}
