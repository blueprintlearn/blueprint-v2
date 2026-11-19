import { ratingsFromUnknown } from "@/lib/blueprint/candidate-review"
import {
  DEFAULT_HIRING_PATH,
  auditionCompletedAt,
  conversationCompletedAt,
  defaultHiringActivities,
  emptyHiringIndicators,
  hiringIndicatorsFromFacts,
  isAuditionStatus,
  isConversationStatus,
  isConversationType,
  isEngagementModel,
  isHiringActivityKey,
  isHiringActivityStatus,
  isHiringOutcome,
  isHiringPath,
  isVirtualActivityId,
  mergeHiringActivities,
  skillsFromUnknown,
  type ApplicantAudition,
  type ApplicantConversation,
  type EngagementModel,
  type HiringActivity,
  type HiringActivityKey,
  type HiringActivityStatus,
  type HiringOutcomeCode,
  type HiringOutcomeRecord,
  type HiringPathKind,
  type HiringWorkflowIndicators,
} from "@/lib/blueprint/hiring-workflow"
import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

type Client = Awaited<ReturnType<typeof createClient>>
type JsonValue = NonNullable<Json>

function activityFromRow(row: {
  id: string
  activity_key: string
  title: string
  required: boolean
  sort_order: number
  status: string
  skip_reason: string | null
  completed_at: string | null
  completed_by: string | null
  updated_at: string
  updated_by: string
}): HiringActivity | null {
  if (!isHiringActivityKey(row.activity_key) || !isHiringActivityStatus(row.status)) return null
  return {
    id: row.id,
    activityKey: row.activity_key,
    title: row.title,
    required: row.required,
    sortOrder: row.sort_order,
    status: row.status,
    skipReason: row.skip_reason,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

function conversationFromRow(row: {
  id: string
  conversation_type: string
  planned_at: string | null
  status: string
  notes: string | null
  next_action: string | null
  person_responsible: string | null
  completed_at: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}): ApplicantConversation | null {
  if (!isConversationType(row.conversation_type) || !isConversationStatus(row.status)) return null
  return {
    id: row.id,
    conversationType: row.conversation_type,
    plannedAt: row.planned_at,
    status: row.status,
    notes: row.notes,
    nextAction: row.next_action,
    personResponsible: row.person_responsible,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function auditionFromRow(row: {
  id: string
  title: string
  description: string | null
  skills: unknown
  scheduled_at: string | null
  location_or_format: string | null
  evaluator_name: string | null
  status: string
  notes: string | null
  skill_ratings: unknown
  completed_at: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}): ApplicantAudition | null {
  if (!isAuditionStatus(row.status)) return null
  const skills = skillsFromUnknown(row.skills)
  if (!skills) return null
  const skillRatings = ratingsFromUnknown(row.skill_ratings, skills)
  if (!skillRatings) return null
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    skills,
    scheduledAt: row.scheduled_at,
    locationOrFormat: row.location_or_format,
    evaluatorName: row.evaluator_name,
    status: row.status,
    notes: row.notes,
    skillRatings,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function outcomeFromRow(row: {
  id: string
  decision_id: string | null
  outcome: string
  intended_role: string
  planned_start_date: string | null
  engagement_model: string
  notes: string | null
  created_by: string
  created_at: string
}): HiringOutcomeRecord | null {
  if (!isHiringOutcome(row.outcome) || !isEngagementModel(row.engagement_model)) return null
  return {
    id: row.id,
    decisionId: row.decision_id,
    outcome: row.outcome,
    intendedRole: row.intended_role,
    plannedStartDate: row.planned_start_date,
    engagementModel: row.engagement_model,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export async function loadHiringPath(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<HiringPathKind | null> {
  const { data, error } = await client
    .from("company_applicant_hiring_paths")
    .select("path_kind")
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .maybeSingle()
  if (error || !data || !isHiringPath(data.path_kind)) return null
  return data.path_kind
}

export async function loadHiringActivities(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<HiringActivity[]> {
  const { data, error } = await client
    .from("company_applicant_hiring_activities")
    .select(
      "id, activity_key, title, required, sort_order, status, skip_reason, completed_at, completed_by, updated_at, updated_by",
    )
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .order("sort_order", { ascending: true })
  if (error || !data) return []
  return data.map(activityFromRow).filter((row): row is HiringActivity => row !== null)
}

export async function loadApplicantConversations(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<ApplicantConversation[]> {
  const { data, error } = await client
    .from("company_applicant_conversations")
    .select(
      "id, conversation_type, planned_at, status, notes, next_action, person_responsible, completed_at, created_by, updated_by, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
  if (error || !data) return []
  return data.map(conversationFromRow).filter((row): row is ApplicantConversation => row !== null)
}

export async function loadApplicantAuditions(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<ApplicantAudition[]> {
  const { data, error } = await client
    .from("company_applicant_auditions")
    .select(
      "id, title, description, skills, scheduled_at, location_or_format, evaluator_name, status, notes, skill_ratings, completed_at, created_by, updated_by, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
  if (error || !data) return []
  return data.map(auditionFromRow).filter((row): row is ApplicantAudition => row !== null)
}

export async function loadHiringOutcomes(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<HiringOutcomeRecord[]> {
  const { data, error } = await client
    .from("company_applicant_hiring_outcomes")
    .select(
      "id, decision_id, outcome, intended_role, planned_start_date, engagement_model, notes, created_by, created_at",
    )
    .eq("company_id", companyId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
  if (error || !data) return []
  return data.map(outcomeFromRow).filter((row): row is HiringOutcomeRecord => row !== null)
}

export async function loadHiringWorkflow(
  client: Client,
  companyId: string,
  applicationId: string,
): Promise<{
  hiringPath: HiringPathKind
  activities: HiringActivity[]
  conversations: ApplicantConversation[]
  auditions: ApplicantAudition[]
  outcomes: HiringOutcomeRecord[]
}> {
  const [path, storedActivities, conversations, auditions, outcomes] = await Promise.all([
    loadHiringPath(client, companyId, applicationId),
    loadHiringActivities(client, companyId, applicationId),
    loadApplicantConversations(client, companyId, applicationId),
    loadApplicantAuditions(client, companyId, applicationId),
    loadHiringOutcomes(client, companyId, applicationId),
  ])
  const hiringPath = path ?? DEFAULT_HIRING_PATH
  const activities =
    storedActivities.length > 0 ? mergeHiringActivities(storedActivities, hiringPath) : defaultHiringActivities(hiringPath)
  return { hiringPath, activities, conversations, auditions, outcomes }
}

async function insertMissingActivities(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    path: HiringPathKind
    updatedBy: string
    existing: HiringActivity[]
  },
): Promise<{ error: string | null; activities: HiringActivity[] }> {
  const merged = mergeHiringActivities(input.existing, input.path)
  const toInsert = merged.filter((row) => isVirtualActivityId(row.id))
  if (toInsert.length === 0) return { error: null, activities: merged.filter((row) => !isVirtualActivityId(row.id)) }
  const inserted = await client
    .from("company_applicant_hiring_activities")
    .insert(
      toInsert.map((row) => ({
        company_id: input.companyId,
        application_id: input.applicationId,
        applicant_id: input.applicantId,
        activity_key: row.activityKey,
        title: row.title,
        required: row.required,
        sort_order: row.sortOrder,
        status: row.status,
        skip_reason: row.skipReason,
        completed_at: row.completedAt,
        completed_by: row.completedBy,
        updated_by: input.updatedBy,
      })),
    )
  if (inserted.error) return { error: inserted.error.message, activities: input.existing }
  const activities = await loadHiringActivities(client, input.companyId, input.applicationId)
  return { error: null, activities }
}

export async function ensureHiringWorkflow(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    path?: HiringPathKind
    updatedBy: string
  },
): Promise<{ error: string | null; path: HiringPathKind; activities: HiringActivity[] }> {
  const existingPath = await loadHiringPath(client, input.companyId, input.applicationId)
  const path = input.path ?? existingPath ?? DEFAULT_HIRING_PATH
  if (!existingPath) {
    const created = await client.from("company_applicant_hiring_paths").insert({
      company_id: input.companyId,
      application_id: input.applicationId,
      applicant_id: input.applicantId,
      path_kind: path,
      updated_by: input.updatedBy,
    })
    if (created.error) return { error: created.error.message, path, activities: [] }
  } else if (input.path && input.path !== existingPath) {
    const updated = await client
      .from("company_applicant_hiring_paths")
      .update({ path_kind: path, updated_by: input.updatedBy })
      .eq("application_id", input.applicationId)
      .eq("company_id", input.companyId)
    if (updated.error) return { error: updated.error.message, path, activities: [] }
  }
  const existing = await loadHiringActivities(client, input.companyId, input.applicationId)
  const inserted = await insertMissingActivities(client, {
    companyId: input.companyId,
    applicationId: input.applicationId,
    applicantId: input.applicantId,
    path,
    updatedBy: input.updatedBy,
    existing,
  })
  if (inserted.error) return { error: inserted.error, path, activities: existing }
  return { error: null, path, activities: inserted.activities }
}

export async function updateHiringActivityStatus(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    activityId: string
    activityKey: HiringActivityKey
    title: string
    intent: "complete" | "skip" | "reopen"
    skipReason: string | null
    updatedBy: string
  },
): Promise<{ error: string | null }> {
  const ensured = await ensureHiringWorkflow(client, {
    companyId: input.companyId,
    applicationId: input.applicationId,
    applicantId: input.applicantId,
    updatedBy: input.updatedBy,
  })
  if (ensured.error) return { error: ensured.error }
  const match = isVirtualActivityId(input.activityId)
    ? ensured.activities.find((row) => row.activityKey === input.activityKey)
    : ensured.activities.find((row) => row.id === input.activityId)
  if (!match) return { error: "Choose a hiring activity." }
  const now = new Date().toISOString()
  const status: HiringActivityStatus =
    input.intent === "complete" ? "complete" : input.intent === "skip" ? "skipped" : "pending"
  const updated = await client
    .from("company_applicant_hiring_activities")
    .update({
      title: match.activityKey === "custom" ? match.title : input.title,
      status,
      skip_reason: input.intent === "skip" ? input.skipReason : null,
      completed_at: input.intent === "reopen" ? null : now,
      completed_by: input.intent === "reopen" ? null : input.updatedBy,
      updated_by: input.updatedBy,
    })
    .eq("id", match.id)
    .eq("company_id", input.companyId)
  return { error: updated.error?.message ?? null }
}

export async function insertCustomHiringActivity(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    title: string
    updatedBy: string
  },
): Promise<{ error: string | null }> {
  const ensured = await ensureHiringWorkflow(client, {
    companyId: input.companyId,
    applicationId: input.applicationId,
    applicantId: input.applicantId,
    updatedBy: input.updatedBy,
  })
  if (ensured.error) return { error: ensured.error }
  const sortOrder = ensured.activities.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1
  const inserted = await client.from("company_applicant_hiring_activities").insert({
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    activity_key: "custom",
    title: input.title,
    required: false,
    sort_order: sortOrder,
    status: "pending",
    updated_by: input.updatedBy,
  })
  return { error: inserted.error?.message ?? null }
}

export async function saveApplicantConversation(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    conversationId: string | null
    conversationType: ApplicantConversation["conversationType"]
    plannedAt: string | null
    status: ApplicantConversation["status"]
    notes: string | null
    nextAction: string | null
    personResponsible: string | null
    updatedBy: string
  },
): Promise<{ error: string | null }> {
  const existing = input.conversationId
    ? await client
        .from("company_applicant_conversations")
        .select("completed_at")
        .eq("company_id", input.companyId)
        .eq("id", input.conversationId)
        .maybeSingle()
    : { data: null, error: null }
  if (existing.error) return { error: existing.error.message }
  const completedAt = conversationCompletedAt(input.status, existing.data?.completed_at ?? null)
  const payload = {
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    conversation_type: input.conversationType,
    planned_at: input.plannedAt,
    status: input.status,
    notes: input.notes,
    next_action: input.nextAction,
    person_responsible: input.personResponsible,
    completed_at: completedAt,
    created_by: input.updatedBy,
    updated_by: input.updatedBy,
  }
  const result = input.conversationId
    ? await client
        .from("company_applicant_conversations")
        .update({
          conversation_type: payload.conversation_type,
          planned_at: payload.planned_at,
          status: payload.status,
          notes: payload.notes,
          next_action: payload.next_action,
          person_responsible: payload.person_responsible,
          completed_at: payload.completed_at,
          updated_by: payload.updated_by,
        })
        .eq("id", input.conversationId)
        .eq("company_id", input.companyId)
    : await client.from("company_applicant_conversations").insert(payload)
  return { error: result.error?.message ?? null }
}

export async function saveApplicantAudition(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    auditionId: string | null
    title: string
    description: string | null
    skills: string[]
    scheduledAt: string | null
    locationOrFormat: string | null
    evaluatorName: string | null
    status: ApplicantAudition["status"]
    notes: string | null
    skillRatings: ApplicantAudition["skillRatings"]
    updatedBy: string
  },
): Promise<{ error: string | null }> {
  const existing = input.auditionId
    ? await client
        .from("company_applicant_auditions")
        .select("completed_at")
        .eq("company_id", input.companyId)
        .eq("id", input.auditionId)
        .maybeSingle()
    : { data: null, error: null }
  if (existing.error) return { error: existing.error.message }
  const completedAt = auditionCompletedAt(input.status, existing.data?.completed_at ?? null)
  const payload = {
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    title: input.title,
    description: input.description,
    skills: input.skills as unknown as JsonValue,
    scheduled_at: input.scheduledAt,
    location_or_format: input.locationOrFormat,
    evaluator_name: input.evaluatorName,
    status: input.status,
    notes: input.notes,
    skill_ratings: input.skillRatings as unknown as JsonValue,
    completed_at: completedAt,
    created_by: input.updatedBy,
    updated_by: input.updatedBy,
  }
  const result = input.auditionId
    ? await client
        .from("company_applicant_auditions")
        .update({
          title: payload.title,
          description: payload.description,
          skills: payload.skills,
          scheduled_at: payload.scheduled_at,
          location_or_format: payload.location_or_format,
          evaluator_name: payload.evaluator_name,
          status: payload.status,
          notes: payload.notes,
          skill_ratings: payload.skill_ratings,
          completed_at: payload.completed_at,
          updated_by: payload.updated_by,
        })
        .eq("id", input.auditionId)
        .eq("company_id", input.companyId)
    : await client.from("company_applicant_auditions").insert(payload)
  return { error: result.error?.message ?? null }
}

export async function insertHiringOutcome(
  client: Client,
  input: {
    companyId: string
    applicationId: string
    applicantId: string
    decisionId: string | null
    outcome: HiringOutcomeCode
    intendedRole: string
    plannedStartDate: string | null
    engagementModel: EngagementModel
    notes: string | null
    createdBy: string
  },
): Promise<{ error: string | null }> {
  const inserted = await client.from("company_applicant_hiring_outcomes").insert({
    company_id: input.companyId,
    application_id: input.applicationId,
    applicant_id: input.applicantId,
    decision_id: input.decisionId,
    outcome: input.outcome,
    intended_role: input.intendedRole,
    planned_start_date: input.plannedStartDate,
    engagement_model: input.engagementModel,
    notes: input.notes,
    created_by: input.createdBy,
  })
  return { error: inserted.error?.message ?? null }
}

export async function loadHiringIndicatorsByApplication(
  client: Client,
  companyId: string,
): Promise<Map<string, HiringWorkflowIndicators>> {
  const [{ data: paths }, { data: activities }, { data: conversations }, { data: auditions }] = await Promise.all([
    client.from("company_applicant_hiring_paths").select("application_id, path_kind").eq("company_id", companyId),
    client
      .from("company_applicant_hiring_activities")
      .select(
        "id, application_id, activity_key, title, required, sort_order, status, skip_reason, completed_at, completed_by, updated_at, updated_by",
      )
      .eq("company_id", companyId),
    client
      .from("company_applicant_conversations")
      .select(
        "id, application_id, conversation_type, planned_at, status, notes, next_action, person_responsible, completed_at, created_by, updated_by, created_at, updated_at",
      )
      .eq("company_id", companyId),
    client
      .from("company_applicant_auditions")
      .select(
        "id, application_id, title, description, skills, scheduled_at, location_or_format, evaluator_name, status, notes, skill_ratings, completed_at, created_by, updated_by, created_at, updated_at",
      )
      .eq("company_id", companyId),
  ])
  const pathByApp = new Map<string, HiringPathKind>()
  for (const row of paths ?? []) {
    if (isHiringPath(row.path_kind)) pathByApp.set(row.application_id, row.path_kind)
  }
  const activitiesByApp = new Map<string, HiringActivity[]>()
  for (const row of activities ?? []) {
    const parsed = activityFromRow(row)
    if (!parsed) continue
    const list = activitiesByApp.get(row.application_id) ?? []
    list.push(parsed)
    activitiesByApp.set(row.application_id, list)
  }
  const conversationsByApp = new Map<string, ApplicantConversation[]>()
  for (const row of conversations ?? []) {
    const parsed = conversationFromRow(row)
    if (!parsed) continue
    const list = conversationsByApp.get(row.application_id) ?? []
    list.push(parsed)
    conversationsByApp.set(row.application_id, list)
  }
  const auditionsByApp = new Map<string, ApplicantAudition[]>()
  for (const row of auditions ?? []) {
    const parsed = auditionFromRow(row)
    if (!parsed) continue
    const list = auditionsByApp.get(row.application_id) ?? []
    list.push(parsed)
    auditionsByApp.set(row.application_id, list)
  }
  const ids = new Set([
    ...pathByApp.keys(),
    ...activitiesByApp.keys(),
    ...conversationsByApp.keys(),
    ...auditionsByApp.keys(),
  ])
  const map = new Map<string, HiringWorkflowIndicators>()
  for (const applicationId of ids) {
    const path = pathByApp.get(applicationId) ?? DEFAULT_HIRING_PATH
    const stored = activitiesByApp.get(applicationId) ?? []
    map.set(
      applicationId,
      hiringIndicatorsFromFacts({
        path,
        activities: stored.length > 0 ? mergeHiringActivities(stored, path) : defaultHiringActivities(path),
        conversations: conversationsByApp.get(applicationId) ?? [],
        auditions: auditionsByApp.get(applicationId) ?? [],
      }),
    )
  }
  return map
}

export function hiringIndicatorsForCard(
  applicationId: string,
  byApplication: Map<string, HiringWorkflowIndicators>,
): HiringWorkflowIndicators {
  return byApplication.get(applicationId) ?? emptyHiringIndicators()
}
