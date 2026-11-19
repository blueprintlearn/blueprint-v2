/**
 * Typed contract from Stage 3.3 into Stage 3.4 interviews.
 *
 * Stage 3.3 stores authorized application answers and pipeline status. It does
 * not score applicants, auto-reject, or enroll anyone. Stage 3.4 invitations
 * are a separate owner action.
 */

import type { ApplicantStage, ApplicationAnswers } from "@/lib/blueprint/applicants"

export const SCREENING_DESTINATION = "not_enabled" as const

export type ApplicantScreeningHandoff = {
  companyId: string
  applicantId: string
  applicationId: string
  pageId: string
  pageVersion: number
  slug: string
  strategyId: string | null
  strategyVersion: number | null
  roleTitle: string
  stage: ApplicantStage
  submittedAt: string
  answers: ApplicationAnswers
  screeningDestination: typeof SCREENING_DESTINATION
}

export function applicantScreeningHandoffFromApplication(input: {
  companyId: string
  applicantId: string
  applicationId: string
  pageId: string
  pageVersion: number
  slug: string
  strategyId: string | null
  strategyVersion: number | null
  roleTitle: string
  stage: ApplicantStage
  submittedAt: string
  answers: ApplicationAnswers
}): ApplicantScreeningHandoff {
  return {
    ...input,
    screeningDestination: SCREENING_DESTINATION,
  }
}
