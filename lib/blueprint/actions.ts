"use server"

import { revalidatePath } from "next/cache"

import { parseOwnerGoal } from "@/lib/blueprint/goals"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveOwnerGoalState = {
  error: string | null
}

export async function saveOwnerGoal(
  _prevState: SaveOwnerGoalState,
  formData: FormData,
): Promise<SaveOwnerGoalState> {
  const parsed = parseOwnerGoal({
    ownerGoal: formData.get("ownerGoal"),
    ownerGoalOther: formData.get("ownerGoalOther"),
  })

  if (!parsed) {
    return { error: "Choose a valid owner goal." }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: "Only a company owner can save the owner goal." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("company_blueprints").upsert(
    {
      company_id: membership.companyId,
      owner_goal: parsed.ownerGoal,
      owner_goal_other: parsed.ownerGoalOther,
    },
    { onConflict: "company_id" },
  )

  if (error) {
    return { error: "The owner goal could not be saved." }
  }

  revalidatePath("/")
  return { error: null }
}
