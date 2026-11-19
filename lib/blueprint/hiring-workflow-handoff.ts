/**
 * Typed contract after an owner records conversations, optional auditions, and
 * a hiring outcome.
 *
 * Stage 3.6 organizes hiring activities. It does not create staff accounts,
 * contracts, payroll records, or training enrollments. Stage 3.7 must take an
 * explicit owner action.
 */

import type { EvaluationRating } from "@/lib/blueprint/candidate-review"
import type {
  EngagementModel,
  HiringActivity,
  HiringActivityKey,
  HiringActivityStatus,
  HiringOutcomeCode,
  HiringPathKind,
} from "@/lib/blueprint/hiring-workflow"

export const TRAINING_HANDOFF_DESTINATION = "not_enabled" as const

export type HiringActivitySnapshot = {
  activityKey: HiringActivityKey
  title: string
  status: HiringActivityStatus
  required: boolean
}

export type AuditionResultSnapshot = {
  title: string
  status: string
  skills: string[]
  ratings: EvaluationRating[]
  notes: string | null
}

export type HiringOutcomeSnapshot = {
  outcome: HiringOutcomeCode
  intendedRole: string
  plannedStartDate: string | null
  engagementModel: EngagementModel
} | null

export type HiringWorkflowHandoff = {
  companyId: string
  applicantId: string
  applicationId: string
  recruitingPageId: string
  slug: string
  intendedRole: string
  hiringPath: HiringPathKind
  engagementModel: EngagementModel | null
  completedActivities: HiringActivitySnapshot[]
  auditionResults: AuditionResultSnapshot[]
  hiringOutcome: HiringOutcomeSnapshot
  plannedStartDate: string | null
  nextStepDestination: typeof TRAINING_HANDOFF_DESTINATION
}

export function hiringWorkflowHandoffFromProfile(input: {
  companyId: string
  applicantId: string
  applicationId: string
  recruitingPageId: string
  slug: string
  roleTitle: string
  hiringPath: HiringPathKind
  activities: HiringActivity[]
  auditionResults: AuditionResultSnapshot[]
  hiringOutcome: HiringOutcomeSnapshot
}): HiringWorkflowHandoff {
  const hired =
    input.hiringOutcome?.outcome === "hired" || input.hiringOutcome?.outcome === "corrected"
      ? input.hiringOutcome
      : null
  return {
    companyId: input.companyId,
    applicantId: input.applicantId,
    applicationId: input.applicationId,
    recruitingPageId: input.recruitingPageId,
    slug: input.slug,
    intendedRole: hired?.intendedRole ?? input.roleTitle,
    hiringPath: input.hiringPath,
    engagementModel: hired?.engagementModel ?? null,
    completedActivities: input.activities.map((row) => ({
      activityKey: row.activityKey,
      title: row.title,
      status: row.status,
      required: row.required,
    })),
    auditionResults: input.auditionResults,
    hiringOutcome: input.hiringOutcome,
    plannedStartDate: hired?.plannedStartDate ?? null,
    nextStepDestination: TRAINING_HANDOFF_DESTINATION,
  }
}
