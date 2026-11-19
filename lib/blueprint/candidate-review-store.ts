import {
  APPLICANT_STAGES,
  type ApplicantStage,
} from "@/lib/blueprint/applicants"
import {
  COMPANY_EVALUATION_SLUG,
  DEFAULT_EVALUATION_CATEGORIES,
  categoriesFromUnknown,
  evaluationStatusFromRatings,
  freezeEvaluationCategories,
  ratingsFromUnknown,
  reviewStatusFromFacts,
  stageAfterDecision,
  type ApplicantFollowUp,
  type ApplicantReviewIndicators,
  type EvaluationStatus,
  type EvaluationTemplate,
  type FollowUpAction,
  type FollowUpStatus,
  type HumanEvaluation,
  type OwnerDecisionCode,
  type OwnerDecisionRecord,
} from "@/lib/blueprint/candidate-review"
import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

type Client = Awaited<ReturnType<typeof createClient>>
type JsonValue = NonNullable<Json>

export async function loadEvaluationTemplate(
  client: Client,
  companyId: string,
  slug: string,
): Promise<EvaluationTemplate | null> {
  const { data, error } = await client
    .from("company_evaluation_templates")
    .select("slug, categories")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) return null
  const categories = categoriesFromUnknown(data.categories)
  if (!categories) return null
  return { slug: data.slug, categories }
}

export async function resolveEvaluationCategories(
  client: Client,
  companyId: string,
  slug: string,
): Promise<string[]> {
  const campaign = await loadEvaluationTemplate(client, companyId, slug)
  if (campaign) return campaign.categories
  if (slug !== COMPANY_EVALUATION_SLUG) {
    const company = await loadEvaluationTemplate(client, companyId, COMPANY_EVALUATION_SLUG)
    if (company) return company.categories
  }
  return freezeEvaluationCategories([...DEFAULT_EVALUATION_CATEGORIES])
}

export async function saveEvaluationTemplate(
  client: Client,
  companyId: string,
  template: EvaluationTemplate,
): Promise<{ error: string | null }> {
  const { data: existing } = await client
    .from("company_evaluation_templates")
    .select("id")
    .eq("company_id", companyId)
    .eq("slug", template.slug)
    .maybeSingle()
  const payload = {
    company_id: companyId,
    slug: template.slug,
    categories: freezeEvaluationCategories(template.categories) as unknown as JsonValue,
  }
  const result = existing
    ? await client
        .from("company_evaluation_templates")
        .update(payload)
        .eq("id", existing.id)
        .eq("company_id", companyId)
    : await client.from("company_evaluation_templates").insert(payload)
  return { error: result.error?.message ?? null }
}

function evaluationFromRow(row: {
  categories: unknown
  ratings: unknown
  completed_at: string | null
  updated_at: string
  updated_by: string
}): HumanEvaluation | null {
  const categories = categoriesFromUnknown(row.categories)
  if (!categories) return null
  const ratings = ratingsFromUnknown(row.ratings, categories)
  if (!ratings) return null
  return {
    categories,
    ratings,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function loadHumanEvaluation(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<HumanEvaluation | null> {
  const { data, error } = await client
    .from("company_applicant_evaluations")
    .select("categories, ratings, completed_at, updated_at, updated_by")
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .maybeSingle()
  if (error || !data) return null
  return evaluationFromRow(data)
}

export async function saveHumanEvaluation(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    categories: string[]
    ratings: HumanEvaluation["ratings"]
    updatedBy: string
  },
): Promise<{ error: string | null }> {
  const existing = await loadHumanEvaluation(client, input.companyId, input.applicationId)
  const categories = existing?.categories ?? freezeEvaluationCategories(input.categories)
  const completedAt = evaluationStatusFromRatings(input.ratings) === "complete" ? new Date().toISOString() : null
  const payload = {
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    categories: categories as unknown as JsonValue,
    ratings: input.ratings as unknown as JsonValue,
    completed_at: completedAt,
    updated_by: input.updatedBy,
  }
  const result = existing
    ? await client
        .from("company_applicant_evaluations")
        .update({
          ratings: payload.ratings,
          completed_at: payload.completed_at,
          updated_by: payload.updated_by,
        })
        .eq("application_id", input.applicationId)
        .eq("company_id", input.companyId)
    : await client.from("company_applicant_evaluations").insert(payload)
  return { error: result.error?.message ?? null }
}

function decisionFromRow(row: {
  id: string
  decision: string
  reason: string | null
  from_stage: string | null
  to_stage: string
  created_by: string
  created_at: string
}): OwnerDecisionRecord | null {
  if (!["advance", "hold", "reject", "hired"].includes(row.decision)) return null
  const toStage = APPLICANT_STAGES.includes(row.to_stage as ApplicantStage)
    ? (row.to_stage as ApplicantStage)
    : null
  if (!toStage) return null
  const fromStage =
    row.from_stage && APPLICANT_STAGES.includes(row.from_stage as ApplicantStage)
      ? (row.from_stage as ApplicantStage)
      : null
  return {
    id: row.id,
    decision: row.decision as OwnerDecisionCode,
    reason: row.reason,
    fromStage,
    toStage,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export async function loadOwnerDecisions(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<OwnerDecisionRecord[]> {
  const { data, error } = await client
    .from("company_applicant_decisions")
    .select("id, decision, reason, from_stage, to_stage, created_by, created_at")
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
  if (error || !data) return []
  return data
    .map(decisionFromRow)
    .filter((row): row is OwnerDecisionRecord => row !== null)
}

export async function insertOwnerDecision(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    decision: OwnerDecisionCode
    reason: string | null
    fromStage: ApplicantStage
    createdBy: string
  },
): Promise<{ error: string | null; toStage: ApplicantStage; decisionId: string | null }> {
  const toStage = stageAfterDecision(input.fromStage, input.decision)
  const inserted = await client
    .from("company_applicant_decisions")
    .insert({
      company_id: input.companyId,
      application_id: input.applicationId,
      applicant_id: input.applicantId,
      decision: input.decision,
      reason: input.reason,
      from_stage: input.fromStage,
      to_stage: toStage,
      created_by: input.createdBy,
    })
    .select("id")
    .single()
  if (inserted.error) return { error: inserted.error.message, toStage, decisionId: null }
  if (toStage !== input.fromStage) {
    const moved = await client
      .from("company_applications")
      .update({ stage: toStage })
      .eq("id", input.applicationId)
      .eq("company_id", input.companyId)
    if (moved.error) return { error: moved.error.message, toStage, decisionId: inserted.data.id }
  }
  return { error: null, toStage, decisionId: inserted.data.id }
}

function followUpFromRow(row: {
  action: string
  due_on: string | null
  status: string
  updated_at: string
  updated_by: string
}): ApplicantFollowUp | null {
  if (
    ![
      "schedule_conversation",
      "request_info",
      "review_video",
      "discuss_manager",
      "make_decision",
    ].includes(row.action)
  ) {
    return null
  }
  if (row.status !== "pending" && row.status !== "done") return null
  return {
    action: row.action as FollowUpAction,
    dueOn: row.due_on,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function loadApplicantFollowUp(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<ApplicantFollowUp | null> {
  const { data, error } = await client
    .from("company_applicant_follow_ups")
    .select("action, due_on, status, updated_at, updated_by")
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .maybeSingle()
  if (error || !data) return null
  return followUpFromRow(data)
}

export async function saveApplicantFollowUp(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    action: FollowUpAction
    dueOn: string | null
    status: FollowUpStatus
    updatedBy: string
  },
): Promise<{ error: string | null }> {
  const { data: existing } = await client
    .from("company_applicant_follow_ups")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("application_id", input.applicationId)
    .maybeSingle()
  const payload = {
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    action: input.action,
    due_on: input.dueOn,
    status: input.status,
    updated_by: input.updatedBy,
  }
  const result = existing
    ? await client
        .from("company_applicant_follow_ups")
        .update({
          action: payload.action,
          due_on: payload.due_on,
          status: payload.status,
          updated_by: payload.updated_by,
        })
        .eq("id", existing.id)
        .eq("company_id", input.companyId)
    : await client.from("company_applicant_follow_ups").insert(payload)
  return { error: result.error?.message ?? null }
}

export async function loadReviewIndicatorsByApplication(
  client: Client,
  companyId: string,
): Promise<Map<string, ApplicantReviewIndicators>> {
  const [{ data: evaluations }, { data: decisions }, { data: followUps }] = await Promise.all([
    client
      .from("company_applicant_evaluations")
      .select("application_id, categories, ratings, completed_at, updated_at, updated_by")
      .eq("company_id", companyId),
    client
      .from("company_applicant_decisions")
      .select("application_id, decision, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    client
      .from("company_applicant_follow_ups")
      .select("application_id, action, due_on, status, updated_at, updated_by")
      .eq("company_id", companyId),
  ])
  const evaluationByApp = new Map<string, EvaluationStatus>()
  for (const row of evaluations ?? []) {
    const parsed = evaluationFromRow(row)
    if (parsed) evaluationByApp.set(row.application_id, evaluationStatusFromRatings(parsed.ratings))
  }
  const latestDecision = new Map<string, OwnerDecisionCode>()
  for (const row of decisions ?? []) {
    if (latestDecision.has(row.application_id)) continue
    if (["advance", "hold", "reject", "hired"].includes(row.decision)) {
      latestDecision.set(row.application_id, row.decision as OwnerDecisionCode)
    }
  }
  const followUpByApp = new Map<string, ApplicantFollowUp>()
  for (const row of followUps ?? []) {
    const parsed = followUpFromRow(row)
    if (parsed) followUpByApp.set(row.application_id, parsed)
  }
  const map = new Map<string, ApplicantReviewIndicators>()
  const ids = new Set([...evaluationByApp.keys(), ...latestDecision.keys(), ...followUpByApp.keys()])
  for (const applicationId of ids) {
    const evaluationStatus = evaluationByApp.get(applicationId) ?? "not_started"
    const decision = latestDecision.get(applicationId) ?? null
    map.set(applicationId, {
      reviewStatus: reviewStatusFromFacts({
        stage: "new_application",
        evaluationStatus,
        latestDecision: decision,
      }),
      evaluationStatus,
      latestDecision: decision,
      followUp: followUpByApp.get(applicationId) ?? null,
    })
  }
  return map
}

export function indicatorsForCard(
  applicationId: string,
  stage: ApplicantStage,
  byApplication: Map<string, ApplicantReviewIndicators>,
): ApplicantReviewIndicators {
  const loaded = byApplication.get(applicationId)
  const evaluationStatus = loaded?.evaluationStatus ?? "not_started"
  const latestDecision = loaded?.latestDecision ?? null
  return {
    reviewStatus: reviewStatusFromFacts({ stage, evaluationStatus, latestDecision }),
    evaluationStatus,
    latestDecision,
    followUp: loaded?.followUp ?? null,
  }
}
