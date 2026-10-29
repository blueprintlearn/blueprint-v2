"use server"

import { revalidatePath } from "next/cache"

import { OWNER_GOAL_OTHER_REQUIRED_MESSAGE, parseOwnerGoal } from "@/lib/blueprint/goals"
import { parseCurrentDjCount, parseDesiredDjCount } from "@/lib/blueprint/team-today"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

const OWNER_ONLY_MESSAGE = "Only the company owner can change this."
const SAVE_FAILED_MESSAGE = "That didn’t save. Please try again."

export type SaveOwnerGoalState = {
  error: string | null
  /** Set only when the server confirmed the save. Lets the form tell "just saved" from "never submitted". */
  savedAt: number | null
}

export type SaveTeamTodayState = {
  error: string | null
  /** Set only when the server confirmed the save. Lets the form tell "just saved" from "never submitted". */
  savedAt: number | null
}

export type SaveDesiredDjCountState = {
  error: string | null
  /** Set only when the server confirmed the save. Lets the form tell "just saved" from "never submitted". */
  savedAt: number | null
}

export async function saveTeamToday(
  _prevState: SaveTeamTodayState,
  formData: FormData,
): Promise<SaveTeamTodayState> {
  const currentDjCount = parseCurrentDjCount(formData.get("currentDjCount"))

  if (currentDjCount === null) {
    return { error: "Enter a whole number from 0 to 999.", savedAt: null }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("company_team_today").upsert(
    {
      company_id: membership.companyId,
      current_dj_count: currentDjCount,
    },
    { onConflict: "company_id" },
  )

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveDesiredDjCount(
  _prevState: SaveDesiredDjCountState,
  formData: FormData,
): Promise<SaveDesiredDjCountState> {
  const desiredDjCount = parseDesiredDjCount(formData.get("desiredDjCount"))

  if (desiredDjCount === null) {
    return { error: "Enter a whole number from 0 to 999.", savedAt: null }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_team_today")
    .update({ desired_dj_count: desiredDjCount })
    .eq("company_id", membership.companyId)
    .select("company_id")

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  if (!data || data.length === 0) {
    return { error: "Save your current DJ count first.", savedAt: null }
  }

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
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
    const otherText = formData.get("ownerGoalOther")
    const otherIsEmpty = typeof otherText !== "string" || otherText.trim().length === 0
    return {
      error:
        formData.get("ownerGoal") === "other" && otherIsEmpty
          ? OWNER_GOAL_OTHER_REQUIRED_MESSAGE
          : "Choose a goal from the list.",
      savedAt: null,
    }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
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
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}
