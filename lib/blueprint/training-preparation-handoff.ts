/**
 * Typed Stage 4 training contract. Stage 3.7 records an owner-approved
 * preparation. Stage 4.1 keeps nextStepDestination at not_enabled. Future
 * enrollment selection lives in training-enrollment.ts and must not assign
 * courses, invite trainees, or create progress.
 */

import type { TrainingApproach, TrainingExperienceLevel, TrainingPreparationRecord } from "@/lib/blueprint/training-preparation"

export const TRAINING_HANDOFF_CONTRACT_VERSION = 1 as const
export const STAGE4_TRAINING_DESTINATION = "not_enabled" as const

export type DemonstratedSkillHandoff = {
  skill: string
  evidenceRefs: string[]
}

export type TrainingPreparationHandoff = {
  contractVersion: typeof TRAINING_HANDOFF_CONTRACT_VERSION
  companyId: string
  applicantId: string
  applicationId: string
  preparationId: string
  approvedVersion: number
  intendedRole: string
  trainingApproach: TrainingApproach
  experienceLevel: TrainingExperienceLevel
  startingGoals: string[]
  demonstratedSkills: DemonstratedSkillHandoff[]
  skillsRequiringVerification: string[]
  plannedStartDate: string | null
  ownerApproval: {
    approvedBy: string
    approvedAt: string
  }
  nextStepDestination: typeof STAGE4_TRAINING_DESTINATION
}

function evidenceRefsForSkill(skill: string, record: TrainingPreparationRecord): string[] {
  const refs: string[] = []
  const needle = skill.toLowerCase()
  for (const audition of record.evidence.auditionObservations) {
    const matched = audition.ratings.some((rating) => rating.category.toLowerCase() === needle && rating.rating != null && rating.rating >= 4)
    if (matched || audition.skills.some((item) => item.toLowerCase() === needle)) {
      refs.push(`audition:${audition.title}`)
    }
  }
  if (refs.length === 0) refs.push("owner-entered")
  return refs
}

export function trainingPreparationHandoffFromApproved(
  record: TrainingPreparationRecord | null,
): TrainingPreparationHandoff | null {
  if (!record || record.status !== "approved" || !record.approvedBy || !record.approvedAt) return null
  return {
    contractVersion: TRAINING_HANDOFF_CONTRACT_VERSION,
    companyId: record.companyId,
    applicantId: record.applicantId,
    applicationId: record.applicationId,
    preparationId: record.id,
    approvedVersion: record.version,
    intendedRole: record.intendedRole,
    trainingApproach: record.trainingApproach,
    experienceLevel: record.experienceLevel,
    startingGoals: record.startingGoals,
    demonstratedSkills: record.skillsDemonstrated.map((skill) => ({
      skill,
      evidenceRefs: evidenceRefsForSkill(skill, record),
    })),
    skillsRequiringVerification: record.skillsNeedingVerification,
    plannedStartDate: record.plannedStartDate,
    ownerApproval: {
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt,
    },
    nextStepDestination: STAGE4_TRAINING_DESTINATION,
  }
}
