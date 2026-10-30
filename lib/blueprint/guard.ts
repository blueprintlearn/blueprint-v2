import { notFound, redirect } from "next/navigation"

import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { getCurrentCompanyGoals, getCurrentOwnerGoal, getCurrentTeamToday } from "@/lib/blueprint/queries"
import { getBlueprintProgress } from "@/lib/blueprint/progress"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership, type CurrentMembership } from "@/lib/tenancy/queries"

/**
 * Every /blueprint request runs these checks, in this order:
 * 1. signed out, or 2. no active membership: back to /
 * 3. switch off for the member's company: not found, for every role
 * 4. not the owner: back to /
 */
export async function requireGuidedOwner(): Promise<CurrentMembership> {
  const membership = await getCurrentMembership()

  if (!membership) {
    redirect("/")
  }

  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    notFound()
  }

  if (membership.role !== OWNER_ADMIN_ROLE) {
    redirect("/")
  }

  return membership
}

export async function loadGuidedBlueprint() {
  const [ownerGoal, teamToday, companyGoals] = await Promise.all([
    getCurrentOwnerGoal(),
    getCurrentTeamToday(),
    getCurrentCompanyGoals(),
  ])
  return {
    ownerGoal,
    teamToday,
    companyGoals,
    progress: getBlueprintProgress(companyGoals, teamToday),
  }
}
