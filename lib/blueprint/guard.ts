import { notFound, redirect } from "next/navigation"

import {
  getBlueprintProgressFromStates,
  resolveAll,
  resumeFromRow,
  type AnswerContext,
} from "@/lib/blueprint/answers"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import {
  getCurrentBlueprintAnswers,
  getCurrentBlueprintProgress,
  getCurrentCompanyGoals,
  getCurrentOwnerGoal,
  getCurrentTeamToday,
} from "@/lib/blueprint/queries"
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
  const [ownerGoal, teamToday, companyGoals, answers, resume] = await Promise.all([
    getCurrentOwnerGoal(),
    getCurrentTeamToday(),
    getCurrentCompanyGoals(),
    getCurrentBlueprintAnswers(),
    getCurrentBlueprintProgress(),
  ])
  const context: AnswerContext = { goals: companyGoals, teamToday, answers }
  const resolved = resolveAll(context)
  return {
    ownerGoal,
    teamToday,
    companyGoals,
    answers,
    resolved,
    context,
    progress: getBlueprintProgressFromStates(resolved, resumeFromRow(resume)),
  }
}
