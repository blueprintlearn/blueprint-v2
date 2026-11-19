import { currentHiredOutcome, isHiringOutcome } from "@/lib/blueprint/hiring-workflow"
import {
  TRAINING_PREP_MISSING_DRAFT,
  TRAINING_PREP_NOT_HIRED,
  TRAINING_PREP_REVERSED,
  canPrepareTraining,
  captureTrainingEvidence,
  currentApproved,
  currentDraft,
  defaultsForNewDraft,
  evidenceFromUnknown,
  isTrainingApproach,
  isTrainingExperienceLevel,
  isTrainingPrepStatus,
  missingTrainingInformation,
  nextPreparationVersion,
  suggestedApproachFromExperience,
  trainingItemListFromUnknown,
  trainingReadinessFromFacts,
  type TrainingPrepDraftInput,
  type TrainingPreparationRecord,
  type TrainingReadiness,
} from "@/lib/blueprint/training-preparation"
import type { ApplicantProfile } from "@/lib/blueprint/applicants"
import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

type Client = Awaited<ReturnType<typeof createClient>>
type JsonValue = NonNullable<Json>

const COLUMNS =
  "id, company_id, application_id, applicant_id, version, status, source_outcome_id, intended_role, experience_level, training_approach, suggested_approach, skills_demonstrated, skills_needing_development, skills_needing_verification, starting_goals, planned_start_date, owner_notes, evidence, missing_information, created_by, updated_by, approved_by, approved_at, created_at, updated_at" as const

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505"
}

function preparationFromRow(row: {
  id: string
  company_id: string
  application_id: string
  applicant_id: string
  version: number
  status: string
  source_outcome_id: string | null
  intended_role: string
  experience_level: string
  training_approach: string
  suggested_approach: string
  skills_demonstrated: unknown
  skills_needing_development: unknown
  skills_needing_verification: unknown
  starting_goals: unknown
  planned_start_date: string | null
  owner_notes: string | null
  evidence: unknown
  missing_information: unknown
  created_by: string
  updated_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}): TrainingPreparationRecord | null {
  if (!isTrainingPrepStatus(row.status)) return null
  if (!isTrainingExperienceLevel(row.experience_level)) return null
  if (!isTrainingApproach(row.training_approach) || !isTrainingApproach(row.suggested_approach)) return null
  const skillsDemonstrated = trainingItemListFromUnknown(row.skills_demonstrated)
  const skillsNeedingDevelopment = trainingItemListFromUnknown(row.skills_needing_development)
  const skillsNeedingVerification = trainingItemListFromUnknown(row.skills_needing_verification)
  const startingGoals = trainingItemListFromUnknown(row.starting_goals)
  const missingInformation = trainingItemListFromUnknown(row.missing_information)
  const evidence = evidenceFromUnknown(row.evidence)
  if (
    !skillsDemonstrated ||
    !skillsNeedingDevelopment ||
    !skillsNeedingVerification ||
    !startingGoals ||
    !missingInformation ||
    !evidence
  ) {
    return null
  }
  return {
    id: row.id,
    companyId: row.company_id,
    applicationId: row.application_id,
    applicantId: row.applicant_id,
    version: row.version,
    status: row.status,
    sourceOutcomeId: row.source_outcome_id,
    intendedRole: row.intended_role,
    experienceLevel: row.experience_level,
    trainingApproach: row.training_approach,
    suggestedApproach: row.suggested_approach,
    skillsDemonstrated,
    skillsNeedingDevelopment,
    skillsNeedingVerification,
    startingGoals,
    plannedStartDate: row.planned_start_date,
    ownerNotes: row.owner_notes,
    evidence,
    missingInformation,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function loadTrainingPreparations(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<TrainingPreparationRecord[]> {
  const { data, error } = await client
    .from("company_applicant_training_preparations")
    .select(COLUMNS)
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .order("version", { ascending: false })
  if (error || !data) return []
  return data.map(preparationFromRow).filter((row): row is TrainingPreparationRecord => row !== null)
}

export async function loadTrainingReadinessByApplication(
  client: Client,
  companyId: string,
): Promise<Map<string, TrainingReadiness>> {
  const [{ data, error }, { data: outcomes }] = await Promise.all([
    client.from("company_applicant_training_preparations").select("application_id, status").eq("company_id", companyId),
    client
      .from("company_applicant_hiring_outcomes")
      .select("application_id, outcome, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
  ])
  const map = new Map<string, TrainingReadiness>()
  const latestByApp = new Map<string, string>()
  for (const row of outcomes ?? []) {
    if (isHiringOutcome(row.outcome)) latestByApp.set(row.application_id, row.outcome)
  }
  const grouped = new Map<string, { status: TrainingPreparationRecord["status"] }[]>()
  for (const row of data ?? []) {
    if (error || !isTrainingPrepStatus(row.status)) continue
    const list = grouped.get(row.application_id) ?? []
    list.push({ status: row.status })
    grouped.set(row.application_id, list)
  }
  const ids = new Set([...grouped.keys(), ...latestByApp.keys()])
  for (const applicationId of ids) {
    const latest = latestByApp.get(applicationId)
    const canPrepare = latest === "hired" || latest === "corrected"
    map.set(applicationId, trainingReadinessFromFacts(canPrepare, grouped.get(applicationId) ?? []))
  }
  return map
}

function draftPayload(
  profile: ApplicantProfile,
  input: TrainingPrepDraftInput,
  sourceOutcomeId: string | null,
  actorId: string,
) {
  const evidence = captureTrainingEvidence({
    hiringPath: profile.hiringPath,
    intendedRole: input.intendedRole,
    engagementModel: currentHiredOutcome(profile.hiringOutcomes)?.engagementModel ?? null,
    answers: profile.answers,
    activities: profile.hiringActivities,
    auditions: profile.auditions,
  })
  const missingInformation = missingTrainingInformation({
    intendedRole: input.intendedRole,
    trainingApproach: input.trainingApproach,
    startingGoals: input.startingGoals,
    plannedStartDate: input.plannedStartDate,
    evidence,
  })
  return {
    intended_role: input.intendedRole,
    experience_level: input.experienceLevel,
    training_approach: input.trainingApproach,
    suggested_approach: suggestedApproachFromExperience(input.experienceLevel),
    skills_demonstrated: input.skillsDemonstrated as unknown as JsonValue,
    skills_needing_development: input.skillsNeedingDevelopment as unknown as JsonValue,
    skills_needing_verification: input.skillsNeedingVerification as unknown as JsonValue,
    starting_goals: input.startingGoals as unknown as JsonValue,
    planned_start_date: input.plannedStartDate,
    owner_notes: input.ownerNotes,
    evidence: evidence as unknown as JsonValue,
    missing_information: missingInformation as unknown as JsonValue,
    source_outcome_id: sourceOutcomeId,
    updated_by: actorId,
  }
}

export async function ensureTrainingPrepDraft(
  client: Client,
  profile: ApplicantProfile,
  actorId: string,
  companyId: string,
): Promise<{ error: string | null; draft: TrainingPreparationRecord | null }> {
  if (!canPrepareTraining(profile.hiringOutcomes)) {
    return { error: TRAINING_PREP_NOT_HIRED, draft: null }
  }
  const rows = await loadTrainingPreparations(client, companyId, profile.applicationId)
  const draft = currentDraft(rows)
  if (draft) return { error: null, draft }
  const hired = currentHiredOutcome(profile.hiringOutcomes)
  if (!hired) return { error: TRAINING_PREP_NOT_HIRED, draft: null }
  const defaults = defaultsForNewDraft({
    hiringPath: profile.hiringPath,
    hired,
    answers: profile.answers,
    activities: profile.hiringActivities,
    auditions: profile.auditions,
  })
  const inserted = await client.from("company_applicant_training_preparations").insert({
    company_id: companyId,
    application_id: profile.applicationId,
    applicant_id: profile.applicantId,
    version: nextPreparationVersion(rows),
    status: "draft",
    created_by: actorId,
    ...draftPayload(profile, defaults, hired.id, actorId),
  })
  if (inserted.error) {
    if (isUniqueViolation(inserted.error)) {
      const retried = await loadTrainingPreparations(client, companyId, profile.applicationId)
      const existingDraft = currentDraft(retried)
      if (existingDraft) return { error: null, draft: existingDraft }
    }
    return { error: inserted.error.message, draft: null }
  }
  const created = await loadTrainingPreparations(client, companyId, profile.applicationId)
  return { error: null, draft: currentDraft(created) }
}

export async function saveTrainingPrepDraft(
  client: Client,
  input: {
    companyId: string
    profile: ApplicantProfile
    value: TrainingPrepDraftInput
    actorId: string
  },
): Promise<{ error: string | null }> {
  if (!canPrepareTraining(input.profile.hiringOutcomes)) {
    return { error: TRAINING_PREP_REVERSED }
  }
  const rows = await loadTrainingPreparations(client, input.companyId, input.profile.applicationId)
  const draft = currentDraft(rows)
  if (!draft) return { error: TRAINING_PREP_MISSING_DRAFT }
  const hired = currentHiredOutcome(input.profile.hiringOutcomes)
  const updated = await client
    .from("company_applicant_training_preparations")
    .update(draftPayload(input.profile, input.value, hired?.id ?? draft.sourceOutcomeId, input.actorId))
    .eq("id", draft.id)
    .eq("company_id", input.companyId)
    .eq("status", "draft")
  return { error: updated.error?.message ?? null }
}

export async function startTrainingPrepRevision(
  client: Client,
  input: {
    companyId: string
    profile: ApplicantProfile
    actorId: string
  },
): Promise<{ error: string | null; draft: TrainingPreparationRecord | null }> {
  if (!canPrepareTraining(input.profile.hiringOutcomes)) {
    return { error: TRAINING_PREP_REVERSED, draft: null }
  }
  const rows = await loadTrainingPreparations(client, input.companyId, input.profile.applicationId)
  const draft = currentDraft(rows)
  if (draft) return { error: null, draft }
  const approved = currentApproved(rows)
  if (!approved) return ensureTrainingPrepDraft(client, input.profile, input.actorId, input.companyId)
  const hired = currentHiredOutcome(input.profile.hiringOutcomes)
  const inserted = await client.from("company_applicant_training_preparations").insert({
    company_id: input.companyId,
    application_id: input.profile.applicationId,
    applicant_id: input.profile.applicantId,
    version: nextPreparationVersion(rows),
    status: "draft",
    created_by: input.actorId,
    ...draftPayload(
      input.profile,
      {
        intendedRole: approved.intendedRole,
        experienceLevel: approved.experienceLevel,
        trainingApproach: approved.trainingApproach,
        skillsDemonstrated: approved.skillsDemonstrated,
        skillsNeedingDevelopment: approved.skillsNeedingDevelopment,
        skillsNeedingVerification: approved.skillsNeedingVerification,
        startingGoals: approved.startingGoals,
        plannedStartDate: approved.plannedStartDate,
        ownerNotes: approved.ownerNotes,
      },
      hired?.id ?? approved.sourceOutcomeId,
      input.actorId,
    ),
  })
  if (inserted.error) {
    if (isUniqueViolation(inserted.error)) {
      const retried = await loadTrainingPreparations(client, input.companyId, input.profile.applicationId)
      return { error: null, draft: currentDraft(retried) }
    }
    return { error: inserted.error.message, draft: null }
  }
  const created = await loadTrainingPreparations(client, input.companyId, input.profile.applicationId)
  return { error: null, draft: currentDraft(created) }
}

export async function approveTrainingPrepDraft(
  client: Client,
  input: {
    companyId: string
    profile: ApplicantProfile
    value: TrainingPrepDraftInput
    actorId: string
  },
): Promise<{ error: string | null }> {
  if (!canPrepareTraining(input.profile.hiringOutcomes)) {
    return { error: TRAINING_PREP_REVERSED }
  }
  const saved = await saveTrainingPrepDraft(client, input)
  if (saved.error) return saved
  const rows = await loadTrainingPreparations(client, input.companyId, input.profile.applicationId)
  const draft = currentDraft(rows)
  if (!draft) return { error: TRAINING_PREP_MISSING_DRAFT }
  const approved = currentApproved(rows)
  if (approved) {
    const superseded = await client
      .from("company_applicant_training_preparations")
      .update({ status: "superseded", updated_by: input.actorId })
      .eq("id", approved.id)
      .eq("company_id", input.companyId)
      .eq("status", "approved")
    if (superseded.error) return { error: superseded.error.message }
  }
  const updated = await client
    .from("company_applicant_training_preparations")
    .update({ status: "approved", updated_by: input.actorId })
    .eq("id", draft.id)
    .eq("company_id", input.companyId)
    .eq("status", "draft")
  return { error: updated.error?.message ?? null }
}
