"use server"

import { revalidatePath } from "next/cache"

import { parseOwnerGoal } from "@/lib/blueprint/goals"
import {
  parseCurrentDjCount,
  parseCurrentTrainerCount,
  parseDesiredDjCount,
} from "@/lib/blueprint/team-today"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveOwnerGoalState = {
  error: string | null
}

export type SaveTeamTodayState = {
  error: string | null
}

export type SaveDesiredDjCountState = {
  error: string | null
}

export type SaveTrainerCountState = {
  error: string | null
}

export async function saveTeamToday(
  _prevState: SaveTeamTodayState,
  formData: FormData,
): Promise<SaveTeamTodayState> {
  const currentDjCount = parseCurrentDjCount(formData.get("currentDjCount"))

  if (currentDjCount === null) {
    return { error: "Enter a DJ count from 0 to 999." }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: "Only a company owner can save the DJ count." }
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
    return { error: "The DJ count could not be saved." }
  }

  revalidatePath("/")
  return { error: null }
}

export async function saveDesiredDjCount(
  _prevState: SaveDesiredDjCountState,
  formData: FormData,
): Promise<SaveDesiredDjCountState> {
  const desiredDjCount = parseDesiredDjCount(formData.get("desiredDjCount"))

  if (desiredDjCount === null) {
    return { error: "Enter a desired DJ count from 0 to 999." }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: "Only a company owner can save the desired DJ count." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_team_today")
    .update({ desired_dj_count: desiredDjCount })
    .eq("company_id", membership.companyId)
    .select("company_id")

  if (error) {
    return { error: "The desired DJ count could not be saved." }
  }

  if (!data || data.length === 0) {
    return { error: "Save current DJ count first." }
  }

  revalidatePath("/")
  return { error: null }
}

export async function saveTrainerCount(
  _prevState: SaveTrainerCountState,
  formData: FormData,
): Promise<SaveTrainerCountState> {
  const currentTrainerCount = parseCurrentTrainerCount(formData.get("currentTrainerCount"))

  if (currentTrainerCount === null) {
    return { error: "Enter a trainer count from 0 to 999." }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: "Only a company owner can save the trainer count." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_team_today")
    .update({ current_trainer_count: currentTrainerCount })
    .eq("company_id", membership.companyId)
    .select("company_id")

  if (error) {
    return { error: "The trainer count could not be saved." }
  }

  if (!data || data.length === 0) {
    return { error: "Save current DJ count first." }
  }

  revalidatePath("/")
  return { error: null }
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
