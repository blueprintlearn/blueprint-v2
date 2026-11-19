/**
 * Typed contract after a one-way video interview.
 *
 * Stage 3.4 records invitations, videos, transcripts, and owner-facing
 * summaries. It does not score applicants, auto-reject, message anyone, or
 * start training.
 */

import type { DisplayInterviewStatus } from "@/lib/blueprint/interviews"

export const INTERVIEW_REVIEW_DESTINATION = "owner_review" as const

export type ApplicantInterviewHandoff = {
  companyId: string
  applicationId: string
  interviewId: string
  status: DisplayInterviewStatus
  submittedAt: string | null
  hasPlayableAnswers: boolean
  transcriptionReady: boolean
  interviewReviewDestination: typeof INTERVIEW_REVIEW_DESTINATION
}

export function applicantInterviewHandoffFromReview(input: {
  companyId: string
  applicationId: string
  interviewId: string
  status: DisplayInterviewStatus
  submittedAt: string | null
  hasPlayableAnswers: boolean
  transcriptionReady: boolean
}): ApplicantInterviewHandoff {
  return {
    ...input,
    interviewReviewDestination: INTERVIEW_REVIEW_DESTINATION,
  }
}
