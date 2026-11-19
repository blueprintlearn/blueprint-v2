/**
 * Typed contract after an owner records a candidate review.
 *
 * Stage 3.5 stores human evaluations, decisions, and follow-ups. It does not
 * schedule conversations, send offers, hire, or start staff onboarding.
 * Stage 3.6 must take an explicit owner action.
 */

import type { ApplicantStage } from "@/lib/blueprint/applicants"
import type {
  ApplicantFollowUp,
  EvaluationStatus,
  OwnerDecisionCode,
} from "@/lib/blueprint/candidate-review"
import type { DisplayInterviewStatus } from "@/lib/blueprint/interviews"

export const CANDIDATE_NEXT_STEP_DESTINATION = "not_enabled" as const

export type CandidateReviewHandoff = {
  companyId: string
  applicantId: string
  applicationId: string
  recruitingPageId: string
  slug: string
  roleTitle: string
  stage: ApplicantStage
  decision: OwnerDecisionCode | null
  followUp: ApplicantFollowUp | null
  evaluationStatus: EvaluationStatus
  interviewStatus: DisplayInterviewStatus
  interviewSubmittedAt: string | null
  nextStepDestination: typeof CANDIDATE_NEXT_STEP_DESTINATION
}

export function candidateReviewHandoffFromProfile(input: {
  companyId: string
  applicantId: string
  applicationId: string
  recruitingPageId: string
  slug: string
  roleTitle: string
  stage: ApplicantStage
  decision: OwnerDecisionCode | null
  followUp: ApplicantFollowUp | null
  evaluationStatus: EvaluationStatus
  interviewStatus: DisplayInterviewStatus
  interviewSubmittedAt: string | null
}): CandidateReviewHandoff {
  return {
    ...input,
    nextStepDestination: CANDIDATE_NEXT_STEP_DESTINATION,
  }
}
