/**
 * Future Stage 4 enrollment stays disabled. This module only records how an
 * approved Stage 3.7 preparation would pick a course or path later.
 */

import {
  STAGE4_TRAINING_DESTINATION,
  type TrainingPreparationHandoff,
} from "@/lib/blueprint/training-preparation-handoff"
import type { CourseExperienceLevel, PathFocus, StoredCompanyCourse, StoredTrainingPath } from "@/lib/blueprint/training-library"
import { currentPublished } from "@/lib/blueprint/training-library"

export const STAGE4_ENROLLMENT_STATUS = "disabled" as const
export const STAGE4_ENROLLMENT_ENGINE = "not_implemented" as const

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
    reason: "No published path or course matches this preparation. The owner will choose later.",
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
  return plan == null || plan.enrollmentStatus === STAGE4_ENROLLMENT_STATUS
}
