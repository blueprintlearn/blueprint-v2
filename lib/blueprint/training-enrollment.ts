/**
 * Stage 4.3 training enrollment. Owners assign published company courses or
 * paths. Trainees see assigned names and status. Lesson progress, grading,
 * and certification stay off. Invitation delivery is copy-link only.
 */

import {
  STAGE4_TRAINING_DESTINATION,
  type TrainingPreparationHandoff,
} from "@/lib/blueprint/training-preparation-handoff"
import type {
  CourseExperienceLevel,
  PathFocus,
  StoredCompanyCourse,
  StoredTrainingPath,
} from "@/lib/blueprint/training-library"
import { currentPublished } from "@/lib/blueprint/training-library"

export const STAGE4_ENROLLMENT_STATUS = "enabled" as const
export const STAGE4_ENROLLMENT_ENGINE = "company_training_enrollments" as const
export const TRAINING_EMAIL_DELIVERY = "copy_link_only" as const

export const ENROLLMENT_SOURCES = ["recruitment", "staff", "invitation"] as const
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number]

export const ENROLLMENT_TARGET_KINDS = ["course", "path"] as const
export type EnrollmentTargetKind = (typeof ENROLLMENT_TARGET_KINDS)[number]

export const ENROLLMENT_STATUSES = ["pending", "active", "cancelled", "revoked"] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const ENROLLMENT_SOURCE_LABELS: Record<EnrollmentSource, string> = {
  recruitment: "Recruitment handoff",
  staff: "Existing staff",
  invitation: "Invitation",
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "Pending invitation",
  active: "Active",
  cancelled: "Cancelled",
  revoked: "Revoked",
}

export const TRAINING_ENROLLMENT_TITLE = "Training enrollment"
export const TRAINING_ENROLLMENT_OPENING =
  "Assign a published course or path to someone on your team. Existing enrollments keep the version you assigned, even if you publish an update later."
export const TRAINING_ENROLLMENT_HELP =
  "Enrollment does not start lesson progress, grade quizzes, or issue certifications. Blueprint does not send invitation email; copy the local invite link."
export const TRAINING_ENROLLMENT_CONFIRM_LABEL = "I have reviewed this assignment and want to enroll this person"
export const TRAINING_ENROLLMENT_CONFIRM_MESSAGE = "Confirm that you have reviewed this assignment before enrolling."
export const TRAINING_TRAINEE_TITLE = "Your training"
export const TRAINING_TRAINEE_OPENING =
  "These are the courses and paths assigned to you. Lesson completion and grading are not enabled yet."
export const TRAINING_INVITE_TITLE = "Training invitation"
export const TRAINING_INVITE_HELP = "Sign in with the invited email to accept. Lesson completion is not enabled yet."
export const TRAINING_NO_PUBLISHED_TARGET = "Publish a course or path before you enroll someone."
export const TRAINING_NO_AWAITING = "No approved recruitment handoffs are waiting for enrollment."
export const TRAINING_NO_ENROLLMENTS = "No training enrollments yet."
export const TRAINING_NO_ASSIGNMENTS = "You do not have any assigned training yet."
export const OWNER_ONLY_ENROLL_MESSAGE = "Only the company owner can assign training."
export const TRAINING_ENROLLMENT_SAVED = "Training enrollment saved."

export type TrainingLibraryRecommendationKind = "path" | "course" | "none"

export type TrainingLibraryRecommendation = {
  kind: TrainingLibraryRecommendationKind
  pathId: string | null
  courseId: string | null
  reason: string
}

export type FutureEnrollmentPlan = {
  enrollmentStatus: typeof STAGE4_ENROLLMENT_STATUS
  destination: typeof STAGE4_TRAINING_DESTINATION
  engine: typeof STAGE4_ENROLLMENT_ENGINE
  recommended: TrainingLibraryRecommendation
}

export type TrainingStaffMember = {
  userId: string
  email: string
  role: string
  status: string
}

export type StoredTrainingEnrollment = {
  id: string
  companyId: string
  traineeUserId: string | null
  inviteEmail: string | null
  source: EnrollmentSource
  targetKind: EnrollmentTargetKind
  courseId: string | null
  pathId: string | null
  contentVersion: number
  contentTitle: string
  assignedBy: string
  assignedAt: string
  status: EnrollmentStatus
  acceptedAt: string | null
  cancelledAt: string | null
  preparationId: string | null
  applicantId: string | null
  applicationId: string | null
}

export type AwaitingHandoff = {
  preparationId: string
  applicationId: string
  applicantId: string
  applicantName: string
  applicantEmail: string
  intendedRole: string
  trainingApproach: string
  approvedVersion: number
}

export type SaveEnrollmentState = {
  error: string | null
  savedAt: number | null
  inviteUrl: string | null
}

export type TrainingInvitationView = {
  status: EnrollmentStatus
  inviteEmail: string
  contentTitle: string
  companyName: string
  targetKind: EnrollmentTargetKind
}

const FOCUS_FOR_APPROACH: Record<TrainingPreparationHandoff["trainingApproach"], PathFocus> = {
  full: "beginner",
  standardization: "experienced",
  custom: "custom",
}

function roleMatches(value: string, intendedRole: string): boolean {
  const left = value.trim().toLowerCase()
  const right = intendedRole.trim().toLowerCase()
  return left === right || left.includes(right) || right.includes(left)
}

function publishedPathContent(path: StoredTrainingPath) {
  return currentPublished(path.versions)?.content ?? null
}

function publishedCourseContent(course: StoredCompanyCourse) {
  return currentPublished(course.versions)?.content ?? null
}

export function recommendTrainingLibrarySelection(
  handoff: TrainingPreparationHandoff,
  library: { paths: StoredTrainingPath[]; courses: StoredCompanyCourse[] },
): TrainingLibraryRecommendation {
  const focus = FOCUS_FOR_APPROACH[handoff.trainingApproach]
  const activePaths = library.paths.filter((path) => path.libraryStatus === "active")
  const matchingPath = activePaths.find((path) => {
    const content = publishedPathContent(path)
    return content && content.focus === focus && roleMatches(content.intendedRole, handoff.intendedRole)
  })
  if (matchingPath) {
    return {
      kind: "path",
      pathId: matchingPath.id,
      courseId: null,
      reason: `Match a published ${focus} path for ${handoff.intendedRole}.`,
    }
  }

  const experience: CourseExperienceLevel = focus
  const matchingCourse = library.courses.find((course) => {
    if (course.libraryStatus !== "active") return false
    const content = publishedCourseContent(course)
    return content && content.experienceLevel === experience && roleMatches(content.intendedRole, handoff.intendedRole)
  })
  if (matchingCourse) {
    return {
      kind: "course",
      pathId: null,
      courseId: matchingCourse.id,
      reason: `No matching path. Use a published ${experience} course for ${handoff.intendedRole}.`,
    }
  }

  return {
    kind: "none",
    pathId: null,
    courseId: null,
    reason: "No published path or course matches this preparation. Choose a published course or path.",
  }
}

export function planFutureEnrollment(
  handoff: TrainingPreparationHandoff | null,
  library: { paths: StoredTrainingPath[]; courses: StoredCompanyCourse[] },
): FutureEnrollmentPlan | null {
  if (!handoff) return null
  return {
    enrollmentStatus: STAGE4_ENROLLMENT_STATUS,
    destination: STAGE4_TRAINING_DESTINATION,
    engine: STAGE4_ENROLLMENT_ENGINE,
    recommended: recommendTrainingLibrarySelection(handoff, library),
  }
}

export function enrollmentIsDisabled(plan: FutureEnrollmentPlan | null): boolean {
  return plan == null
}

export function publishedEnrollmentTargets(library: {
  paths: StoredTrainingPath[]
  courses: StoredCompanyCourse[]
}): Array<{ kind: EnrollmentTargetKind; id: string; title: string; version: number }> {
  const courses = library.courses.flatMap((course) => {
    const published = currentPublished(course.versions)
    if (!published || course.libraryStatus !== "active") return []
    return [{ kind: "course" as const, id: course.id, title: published.content.title, version: published.version }]
  })
  const paths = library.paths.flatMap((path) => {
    const published = currentPublished(path.versions)
    if (!published || path.libraryStatus !== "active") return []
    return [{ kind: "path" as const, id: path.id, title: published.content.title, version: published.version }]
  })
  return [...paths, ...courses]
}

export function trainingInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/training/invite/${token}`
}

export function isEnrollmentSource(value: string): value is EnrollmentSource {
  return (ENROLLMENT_SOURCES as readonly string[]).includes(value)
}

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
  return (ENROLLMENT_STATUSES as readonly string[]).includes(value)
}

export function enrollmentIssueFromMessage(message: string): string {
  if (message.includes("training-enrollment:not-owner")) return OWNER_ONLY_ENROLL_MESSAGE
  if (message.includes("training-enrollment:confirmation-required")) return TRAINING_ENROLLMENT_CONFIRM_MESSAGE
  if (message.includes("training-enrollment:unpublished-target")) return TRAINING_NO_PUBLISHED_TARGET
  if (message.includes("training-enrollment:duplicate-open")) return "This person already has an open enrollment for that course or path."
  if (message.includes("training-enrollment:handoff-wrong-company")) return "That training handoff belongs to another company."
  if (message.includes("training-enrollment:handoff-not-approved")) return "Approve the training handoff before enrolling."
  if (message.includes("training-enrollment:missing-handoff")) return "That training handoff is not available."
  if (message.includes("training-enrollment:staff-not-member")) return "Choose someone who already belongs to this company."
  if (message.includes("training-enrollment:invalid-email")) return "Enter a valid email address."
  if (message.includes("training-enrollment:wrong-account")) return "Sign in with the invited email address to accept."
  if (message.includes("training-enrollment:revoked")) return "This invitation is no longer valid."
  if (message.includes("training-enrollment:not-pending")) return "This invitation cannot be accepted."
  if (message.includes("training-enrollment:sign-in-required")) return "Sign in to accept this invitation."
  if (message.includes("training-enrollment:already-closed")) return "That enrollment is already closed."
  if (message.includes("training-enrollment:not-found")) return "That invitation was not found."
  return "Could not save the training enrollment."
}
