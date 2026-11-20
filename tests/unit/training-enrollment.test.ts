import { describe, expect, it } from "vitest"

import { defaultHiringActivities } from "@/lib/blueprint/hiring-workflow"
import {
  enrollmentIsDisabled,
  enrollmentIssueFromMessage,
  planFutureEnrollment,
  publishedEnrollmentTargets,
  STAGE4_ENROLLMENT_STATUS,
  TRAINING_EMAIL_DELIVERY,
  trainingInviteUrl,
} from "@/lib/blueprint/training-enrollment"
import {
  emptyCourseContent,
  emptyPathContent,
  TRAINING_ENROLLMENT_CLOSED,
  type StoredCompanyCourse,
  type StoredTrainingPath,
} from "@/lib/blueprint/training-library"
import {
  STAGE4_TRAINING_DESTINATION,
  trainingPreparationHandoffFromApproved,
} from "@/lib/blueprint/training-preparation-handoff"
import { defaultsForNewDraft, type TrainingPreparationRecord } from "@/lib/blueprint/training-preparation"

const hired = {
  id: "outcome-1",
  decisionId: "decision-1",
  outcome: "hired" as const,
  intendedRole: "Wedding DJ",
  plannedStartDate: "2026-05-01",
  engagementModel: "w2" as const,
  notes: "Owner-provided W-2 intention.",
  createdBy: "owner-a",
  createdAt: "2026-04-01T12:00:00.000Z",
}

function approvedPrep(): TrainingPreparationRecord {
  const defaults = defaultsForNewDraft({
    hiringPath: "beginner",
    hired,
    answers: {
      experience: "I have DJed friends' parties.",
      availability: "Most Saturday nights.",
      motivation: "I want to learn weddings.",
    },
    activities: defaultHiringActivities("beginner"),
    auditions: [],
  })
  return {
    id: "prep-1",
    companyId: "company-a",
    applicationId: "app-1",
    applicantId: "person-1",
    version: 1,
    status: "approved",
    sourceOutcomeId: hired.id,
    intendedRole: "Wedding DJ",
    experienceLevel: "beginner",
    trainingApproach: "full",
    suggestedApproach: defaults.suggestedApproach,
    skillsDemonstrated: defaults.skillsDemonstrated,
    skillsNeedingDevelopment: defaults.skillsNeedingDevelopment,
    skillsNeedingVerification: defaults.skillsNeedingVerification,
    startingGoals: defaults.startingGoals,
    plannedStartDate: defaults.plannedStartDate,
    ownerNotes: defaults.ownerNotes,
    evidence: defaults.evidence,
    missingInformation: defaults.missingInformation,
    createdBy: "owner-a",
    updatedBy: "owner-a",
    approvedBy: "owner-a",
    approvedAt: "2026-04-02T12:00:00.000Z",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z",
  }
}

describe("training enrollment contract", () => {
  it("recommends a published path and keeps enrollment owner-confirmed", () => {
    const handoff = trainingPreparationHandoffFromApproved(approvedPrep())
    expect(handoff?.nextStepDestination).toBe(STAGE4_TRAINING_DESTINATION)
    expect(STAGE4_TRAINING_DESTINATION).toBe("training_enrollment")
    expect(TRAINING_EMAIL_DELIVERY).toBe("copy_link_only")
    const pathContent = emptyPathContent("Wedding DJ beginner")
    pathContent.intendedRole = "Wedding DJ"
    pathContent.focus = "beginner"
    const paths: StoredTrainingPath[] = [
      {
        id: "path-1",
        companyId: "company-a",
        title: "Wedding DJ beginner",
        libraryStatus: "active",
        versions: [
          {
            id: "pv-1",
            version: 1,
            status: "published",
            content: pathContent,
            publishedBy: "owner-a",
            publishedAt: "2026-04-02T12:00:00.000Z",
          },
        ],
      },
    ]
    const courses: StoredCompanyCourse[] = [
      {
        id: "course-1",
        companyId: "company-a",
        title: "MC Foundations",
        origin: "adopted",
        sourceMasterCourseId: "master-1",
        sourceMasterVersion: 1,
        libraryStatus: "active",
        legacy: { sourceId: null, contentVersion: null },
        versions: [
          {
            id: "cv-1",
            version: 1,
            status: "draft",
            content: emptyCourseContent("MC Foundations"),
            publishedBy: null,
            publishedAt: null,
          },
        ],
      },
    ]
    const plan = planFutureEnrollment(handoff, { paths, courses })
    expect(plan?.enrollmentStatus).toBe(STAGE4_ENROLLMENT_STATUS)
    expect(plan?.destination).toBe("training_enrollment")
    expect(plan?.recommended).toEqual({
      kind: "path",
      pathId: "path-1",
      courseId: null,
      reason: "Match a published beginner path for Wedding DJ.",
    })
    expect(enrollmentIsDisabled(plan)).toBe(false)
    expect(publishedEnrollmentTargets({ paths, courses })).toEqual([
      { kind: "path", id: "path-1", title: "Wedding DJ beginner", version: 1 },
    ])
    expect(TRAINING_ENROLLMENT_CLOSED).toMatch(/does not assign anyone/i)
    expect(trainingInviteUrl("http://127.0.0.1:3000", "tok")).toBe("http://127.0.0.1:3000/training/invite/tok")
    expect(enrollmentIssueFromMessage("training-enrollment:wrong-account")).toMatch(/invited email/i)
    expect(enrollmentIssueFromMessage("training-enrollment:duplicate-open")).toMatch(/already has an open enrollment/i)
    expect(enrollmentIssueFromMessage("training-enrollment:revoked")).toMatch(/no longer valid/i)
    expect(enrollmentIssueFromMessage("training-enrollment:unpublished-target")).toMatch(/Publish a course or path/i)
  })
})
