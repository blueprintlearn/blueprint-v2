import {
  APPLICANT_STAGES,
  cardFromRows,
  type ApplicantCard,
  type ApplicantProfile,
  type ApplicantStage,
  type ApplicantStageEvent,
} from "@/lib/blueprint/applicants"
import { evaluationStatusFromRatings, reviewStatusFromFacts } from "@/lib/blueprint/candidate-review"
import { candidateReviewHandoffFromProfile } from "@/lib/blueprint/candidate-review-handoff"
import {
  indicatorsForCard,
  loadApplicantFollowUp,
  loadHumanEvaluation,
  loadOwnerDecisions,
  loadReviewIndicatorsByApplication,
  resolveEvaluationCategories,
} from "@/lib/blueprint/candidate-review-store"
import { hiringIndicatorsFromFacts } from "@/lib/blueprint/hiring-workflow"
import { hiringWorkflowHandoffFromProfile } from "@/lib/blueprint/hiring-workflow-handoff"
import {
  hiringIndicatorsForCard,
  loadHiringIndicatorsByApplication,
  loadHiringWorkflow,
} from "@/lib/blueprint/hiring-workflow-store"
import { trainingPreparationHandoffFromApproved } from "@/lib/blueprint/training-preparation-handoff"
import { canPrepareTraining, currentApproved, trainingReadinessFromFacts } from "@/lib/blueprint/training-preparation"
import {
  loadTrainingPreparations,
  loadTrainingReadinessByApplication,
} from "@/lib/blueprint/training-preparation-store"
import { loadInterviewStatusByApplication, loadOwnerInterview, purgeExpiredInterviewMedia } from "@/lib/blueprint/interview-store"
import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

type Client = Awaited<ReturnType<typeof createClient>>
type JsonValue = NonNullable<Json>

const APPLICATION_COLUMNS =
  "id, company_id, applicant_id, recruiting_page_id, page_version, slug, source_strategy_id, source_strategy_version, role_title, stage, answers, submitted_at" as const

export async function submitPublishedApplication(
  client: Client,
  input: {
    slug: string
    idempotencyKey: string
    payload: Record<string, unknown>
    ipHash: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client.rpc("submit_recruiting_application", {
    p_slug: input.slug,
    p_idempotency_key: input.idempotencyKey,
    p_payload: input.payload as JsonValue,
    p_ip_hash: input.ipHash,
  })
  if (error) return { ok: false, error: "unavailable" }
  if (!data || typeof data !== "object") return { ok: false, error: "unavailable" }
  const record = data as { ok?: unknown; error?: unknown }
  if (record.ok === true) return { ok: true }
  return { ok: false, error: typeof record.error === "string" ? record.error : "unavailable" }
}

export async function loadApplicantCards(client: Client, companyId: string): Promise<ApplicantCard[]> {
  const { data, error } = await client
    .from("company_applications")
    .select(APPLICATION_COLUMNS)
    .eq("company_id", companyId)
    .order("submitted_at", { ascending: false })
  if (error || !data) return []
  const applicantIds = [...new Set(data.map((row) => row.applicant_id))]
  if (applicantIds.length === 0) return []
  const { data: people, error: peopleError } = await client
    .from("company_applicants")
    .select("id, first_name, last_name, email, phone, location")
    .eq("company_id", companyId)
    .in("id", applicantIds)
  if (peopleError || !people) return []
  const byId = new Map(people.map((person) => [person.id, person]))
  const [statuses, indicators, hiring, training] = await Promise.all([
    loadInterviewStatusByApplication(client, companyId),
    loadReviewIndicatorsByApplication(client, companyId),
    loadHiringIndicatorsByApplication(client, companyId),
    loadTrainingReadinessByApplication(client, companyId),
    purgeExpiredInterviewMedia(client, companyId),
  ])
  return data
    .map((application) => {
      const applicant = byId.get(application.applicant_id)
      if (!applicant) return null
      const card = cardFromRows({ application, applicant })
      if (!card) return null
      return {
        ...card,
        interviewStatus: statuses.get(card.applicationId) ?? "not_sent",
        ...indicatorsForCard(card.applicationId, card.stage, indicators),
        ...hiringIndicatorsForCard(card.applicationId, hiring),
        trainingReadiness: training.get(card.applicationId) ?? "not_prepared",
      }
    })
    .filter((card): card is ApplicantCard => card !== null)
}

export async function loadApplicantProfile(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<ApplicantProfile | null> {
  const { data: application, error } = await client
    .from("company_applications")
    .select(APPLICATION_COLUMNS)
    .eq("company_id", companyId)
    .eq("id", applicationId)
    .maybeSingle()
  if (error || !application) return null
  const { data: applicant, error: applicantError } = await client
    .from("company_applicants")
    .select("id, first_name, last_name, email, phone, location")
    .eq("company_id", companyId)
    .eq("id", application.applicant_id)
    .maybeSingle()
  if (applicantError || !applicant) return null
  const card = cardFromRows({ application, applicant })
  if (!card) return null
  const [{ data: notes }, { data: events }] = await Promise.all([
    client
      .from("company_applicant_notes")
      .select("id, body, created_by, created_at, application_id")
      .eq("company_id", companyId)
      .eq("applicant_id", applicant.id)
      .order("created_at", { ascending: true }),
    client
      .from("company_applicant_stage_events")
      .select("id, from_stage, to_stage, changed_by, changed_at")
      .eq("company_id", companyId)
      .eq("application_id", application.id)
      .order("changed_at", { ascending: true }),
  ])
  const [interview, evaluation, decisions, followUp, evaluationCategories, hiring, trainingPreparations] = await Promise.all([
    loadOwnerInterview(client, companyId, application.id),
    loadHumanEvaluation(client, companyId, application.id),
    loadOwnerDecisions(client, companyId, application.id),
    loadApplicantFollowUp(client, companyId, application.id),
    resolveEvaluationCategories(client, companyId, card.slug),
    loadHiringWorkflow(client, companyId, application.id),
    loadTrainingPreparations(client, companyId, application.id),
  ])
  const latestDecision = decisions.at(-1)?.decision ?? null
  const evaluationStatus = evaluationStatusFromRatings(evaluation?.ratings)
  const hiringIndicators = hiringIndicatorsFromFacts({
    path: hiring.hiringPath,
    activities: hiring.activities,
    conversations: hiring.conversations,
    auditions: hiring.auditions,
  })
  return {
    ...card,
    ...hiringIndicators,
    notes: (notes ?? []).map((note) => ({
      id: note.id,
      body: note.body,
      createdBy: note.created_by,
      createdAt: note.created_at,
      applicationId: note.application_id,
    })),
    history: (events ?? [])
      .map((event): ApplicantStageEvent | null => {
        const toStage = APPLICANT_STAGES.includes(event.to_stage as ApplicantStage)
          ? (event.to_stage as ApplicantStage)
          : null
        if (!toStage) return null
        const fromStage =
          event.from_stage && APPLICANT_STAGES.includes(event.from_stage as ApplicantStage)
            ? (event.from_stage as ApplicantStage)
            : null
        return {
          id: event.id,
          fromStage,
          toStage,
          changedBy: event.changed_by,
          changedAt: event.changed_at,
        }
      })
      .filter((event): event is ApplicantStageEvent => event !== null),
    interview,
    interviewStatus: interview?.status ?? "not_sent",
    evaluation,
    evaluationCategories: evaluation?.categories ?? evaluationCategories,
    decisions,
    followUp,
    evaluationStatus,
    latestDecision,
    reviewStatus: reviewStatusFromFacts({ stage: card.stage, evaluationStatus, latestDecision }),
    hiringActivities: hiring.activities,
    conversations: hiring.conversations,
    auditions: hiring.auditions,
    hiringOutcomes: hiring.outcomes,
    trainingPreparations,
    trainingReadiness: trainingReadinessFromFacts(canPrepareTraining(hiring.outcomes), trainingPreparations),
  }
}

export function applicantHandoffFromProfile(
  companyId: string,
  profile: ApplicantProfile,
) {
  return candidateReviewHandoffFromProfile({
    companyId,
    applicantId: profile.applicantId,
    applicationId: profile.applicationId,
    recruitingPageId: profile.recruitingPageId,
    slug: profile.slug,
    roleTitle: profile.roleTitle,
    stage: profile.stage,
    decision: profile.latestDecision,
    followUp: profile.followUp,
    evaluationStatus: profile.evaluationStatus,
    interviewStatus: profile.interviewStatus,
    interviewSubmittedAt: profile.interview?.submittedAt ?? null,
  })
}

export function applicantTrainingHandoffFromProfile(companyId: string, profile: ApplicantProfile) {
  if (!canPrepareTraining(profile.hiringOutcomes)) return null
  const approved = currentApproved(profile.trainingPreparations)
  if (!approved) return null
  return trainingPreparationHandoffFromApproved({ ...approved, companyId })
}

export function applicantHiringHandoffFromProfile(companyId: string, profile: ApplicantProfile) {
  const latestOutcome = profile.hiringOutcomes.at(-1) ?? null
  return hiringWorkflowHandoffFromProfile({
    companyId,
    applicantId: profile.applicantId,
    applicationId: profile.applicationId,
    recruitingPageId: profile.recruitingPageId,
    slug: profile.slug,
    roleTitle: profile.roleTitle,
    hiringPath: profile.hiringPath,
    activities: profile.hiringActivities,
    auditionResults: profile.auditions.map((row) => ({
      title: row.title,
      status: row.status,
      skills: row.skills,
      ratings: row.skillRatings,
      notes: row.notes,
    })),
    hiringOutcome: latestOutcome
      ? {
          outcome: latestOutcome.outcome,
          intendedRole: latestOutcome.intendedRole,
          plannedStartDate: latestOutcome.plannedStartDate,
          engagementModel: latestOutcome.engagementModel,
        }
      : null,
  })
}

export async function updateApplicationStage(
  client: Client,
  companyId: string,
  applicationId: string,
  stage: ApplicantStage,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("company_applications")
    .update({ stage })
    .eq("id", applicationId)
    .eq("company_id", companyId)
  return { error: error?.message ?? null }
}

export async function insertApplicantNote(
  client: Client,
  input: {
    companyId: string
    applicantId: string
    applicationId: string
    body: string
    createdBy: string
  },
): Promise<{ error: string | null }> {
  const { error } = await client.from("company_applicant_notes").insert({
    company_id: input.companyId,
    applicant_id: input.applicantId,
    application_id: input.applicationId,
    body: input.body,
    created_by: input.createdBy,
  })
  return { error: error?.message ?? null }
}
