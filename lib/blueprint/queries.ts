import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import {
  OWNER_GOAL_CODES,
  type OwnerGoalCode,
  type OwnerGoalInput,
} from "@/lib/blueprint/goals"

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
