import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import {
  goalDisplayLabel,
  sortGoals,
  type CompanyGoalEntry,
  type CurrentCompanyGoals,
} from "@/lib/blueprint/company-goals"
import {
  OWNER_GOAL_CODES,
  type OwnerGoalCode,
  type OwnerGoalInput,
} from "@/lib/blueprint/goals"
import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
  DESIRED_DJ_COUNT_MAX,
  DESIRED_DJ_COUNT_MIN,
  OWNER_DJ_FREQUENCIES,
  TEAM_COUNT_BASES,
  emptyTeamToday,
  type AnswerTeamToday,
  type OwnerDjFrequency,
  type TeamCountBasis,
} from "@/lib/blueprint/team-today"

export type CurrentOwnerGoal = OwnerGoalInput & {
  companyId: string
}

function asOwnerGoalCode(value: string): OwnerGoalCode | null {
  return (OWNER_GOAL_CODES as readonly string[]).includes(value)
    ? (value as OwnerGoalCode)
    : null
}

export async function getCurrentOwnerGoal(): Promise<CurrentOwnerGoal | null> {
  const membership = await getCurrentMembership()
  if (!membership) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_blueprints")
    .select("company_id, owner_goal, owner_goal_other")
    .eq("company_id", membership.companyId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const ownerGoal = asOwnerGoalCode(data.owner_goal)
  if (!ownerGoal) {
    return null
  }

  return {
    companyId: data.company_id,
    ownerGoal,
    ownerGoalOther: ownerGoal === "other" ? data.owner_goal_other : null,
  }
}

export type { CompanyGoalEntry, CurrentCompanyGoals }

function toGoalEntry(row: { goal: string; other_text: string | null }): CompanyGoalEntry | null {
  const goal = asOwnerGoalCode(row.goal)
  if (!goal) return null
  return {
    goal,
    otherText: goal === "other" ? row.other_text : null,
  }
}

/**
 * Owner pages with the switch on. RLS applies: owners see every row;
 * other members would only see the primary row if this were ever called for them.
 */
export async function getCurrentCompanyGoals(): Promise<CurrentCompanyGoals | null> {
  const membership = await getCurrentMembership()
  if (!membership) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_goals")
    .select("company_id, goal, other_text, is_primary")
    .eq("company_id", membership.companyId)

  if (error || !data || data.length === 0) {
    return null
  }

  const entries = data
    .map((row) => {
      const entry = toGoalEntry(row)
      return entry ? { ...entry, isPrimary: row.is_primary } : null
    })
    .filter((row): row is CompanyGoalEntry & { isPrimary: boolean } => row !== null)

  const primary = entries.find((row) => row.isPrimary)
  if (!primary) {
    return null
  }

  const others = sortGoals(entries.filter((row) => !row.isPrimary)).map(({ goal, otherText }) => ({
    goal,
    otherText,
  }))

  return {
    companyId: membership.companyId,
    primary: { goal: primary.goal, otherText: primary.otherText },
    others,
  }
}

export function companyGoalsAlsoLine(goals: CurrentCompanyGoals | null): string | null {
  if (!goals) return null
  return goals.others.length === 0 ? null : `Also: ${goals.others.map(goalDisplayLabel).join(", ")}`
}

export type CurrentTeamToday = AnswerTeamToday & {
  companyId: string
}

function asDjCount(value: number | null, min: number, max: number): number | null {
  return value !== null && Number.isInteger(value) && value >= min && value <= max ? value : null
}

function asCurrentDjCount(value: number | null): number | null {
  return asDjCount(value, CURRENT_DJ_COUNT_MIN, CURRENT_DJ_COUNT_MAX)
}

function asDesiredDjCount(value: number | null): number | null {
  return asDjCount(value, DESIRED_DJ_COUNT_MIN, DESIRED_DJ_COUNT_MAX)
}

function asBasis(value: string | null | undefined): TeamCountBasis {
  return value && (TEAM_COUNT_BASES as readonly string[]).includes(value)
    ? (value as TeamCountBasis)
    : "unknown"
}

function asFrequency(value: string | null | undefined): OwnerDjFrequency | null {
  return value && (OWNER_DJ_FREQUENCIES as readonly string[]).includes(value)
    ? (value as OwnerDjFrequency)
    : null
}

export type StoredBlueprintAnswer = {
  questionKey: string
  state: "answered" | "estimated" | "skipped"
  value: unknown
}

export type CurrentBlueprintProgress = {
  lastSection: string
  lastQuestionKey: string | null
}

export async function getCurrentBlueprintAnswers(): Promise<StoredBlueprintAnswer[]> {
  const membership = await getCurrentMembership()
  if (!membership) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_blueprint_answers")
    .select("question_key, state, value")
    .eq("company_id", membership.companyId)

  if (error || !data) return []

  return data.map((row) => ({
    questionKey: row.question_key,
    state: row.state,
    value: row.value,
  }))
}

export async function getCurrentBlueprintProgress(): Promise<CurrentBlueprintProgress | null> {
  const membership = await getCurrentMembership()
  if (!membership) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_blueprint_progress")
    .select("last_section, last_question_key")
    .eq("company_id", membership.companyId)
    .maybeSingle()

  if (error || !data) return null

  return {
    lastSection: data.last_section,
    lastQuestionKey: data.last_question_key,
  }
}

export async function getCurrentTeamToday(): Promise<CurrentTeamToday | null> {
  const membership = await getCurrentMembership()
  if (!membership) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_team_today")
    .select(
      "company_id, current_dj_count, desired_dj_count, count_basis, desired_count_basis, assistant_only_count, owner_dj_frequency, lead_capable_count, earlier_dj_count, earlier_desired_dj_count",
    )
    .eq("company_id", membership.companyId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    companyId: data.company_id,
    ...emptyTeamToday(),
    currentDjCount: asCurrentDjCount(data.current_dj_count),
    desiredDjCount: asDesiredDjCount(data.desired_dj_count),
    countBasis: asBasis(data.count_basis),
    desiredCountBasis: asBasis(data.desired_count_basis),
    assistantOnlyCount: asDesiredDjCount(data.assistant_only_count),
    ownerDjFrequency: asFrequency(data.owner_dj_frequency),
    leadCapableCount: asDesiredDjCount(data.lead_capable_count),
    earlierDjCount: asCurrentDjCount(data.earlier_dj_count),
    earlierDesiredDjCount: asDesiredDjCount(data.earlier_desired_dj_count),
  }
}
