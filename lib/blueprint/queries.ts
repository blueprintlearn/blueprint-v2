import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import {
  OWNER_GOAL_CODES,
  type OwnerGoalCode,
  type OwnerGoalInput,
} from "@/lib/blueprint/goals"
import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
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

export type CurrentTeamToday = {
  companyId: string
  currentDjCount: number
}

function asCurrentDjCount(value: number): number | null {
  return Number.isInteger(value) &&
    value >= CURRENT_DJ_COUNT_MIN &&
    value <= CURRENT_DJ_COUNT_MAX
    ? value
    : null
}

export async function getCurrentTeamToday(): Promise<CurrentTeamToday | null> {
  const membership = await getCurrentMembership()
  if (!membership) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_team_today")
    .select("company_id, current_dj_count")
    .eq("company_id", membership.companyId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const currentDjCount = asCurrentDjCount(data.current_dj_count)
  if (currentDjCount === null) {
    return null
  }

  return {
    companyId: data.company_id,
    currentDjCount,
  }
}
