/**
 * Stage 4.4 trainee frozen-content viewer. Trainees read the published
 * snapshot frozen on an active enrollment. Inactive memberships cannot view
 * content. Lesson completion, grading, submissions, sequential locks, and
 * certification stay off.
 */

import {
  CONTENT_BLOCK_LABELS,
  PATH_FOCUS_LABELS,
  QUIZ_QUESTION_LABELS,
  type ContentBlock,
  type CourseContent,
  type LessonContent,
  type PathContent,
  type PathFocus,
  type QuizQuestionKind,
} from "@/lib/blueprint/training-library"

export const STAGE4_VIEWER_STATUS = "enabled" as const
export const TRAINING_VIEWER_READONLY =
  "This is the published version assigned to you. You can read it. Completing lessons, submitting quizzes, and certification are not enabled yet."
export const TRAINING_VIEWER_PATH_HELP =
  "This path lists the courses assigned as a group. Lesson pages open from a course assignment. Path order is not enforced yet."
export const TRAINING_VIEWER_NO_LESSONS = "This assigned version has no lessons yet."
export const TRAINING_VIEWER_NO_BLOCKS = "This lesson has no content blocks yet."
export const TRAINING_QUIZ_READONLY = "This quiz is read-only. Answers cannot be submitted yet."
export const TRAINING_ASSIGNMENT_READONLY = "This assignment is read-only. Submissions are not enabled yet."
export const TRAINING_LESSONS_OPEN = "Lessons can be opened in any order. Completion is not enabled."
export const TRAINING_OPEN_LESSON = "Open lesson"

export const TRAINING_BLOCK_LABELS = CONTENT_BLOCK_LABELS
export const TRAINING_QUIZ_KIND_LABELS = QUIZ_QUESTION_LABELS
export const TRAINING_PATH_FOCUS_LABELS = PATH_FOCUS_LABELS

export type TraineeQuizOption = {
  id: string
  label: string
}

export type TraineeQuizQuestion = {
  id: string
  prompt: string
  kind: QuizQuestionKind
  options: TraineeQuizOption[]
}

export type TraineeQuizBlock = {
  id: string
  type: "quiz"
  title: string
  questions: TraineeQuizQuestion[]
}

export type TraineeAssignmentBlock = {
  id: string
  type: "assignment"
  title: string
  instructions: string
  verification: "online" | "in_person"
}

export type TraineeTextBlock = { id: string; type: "text"; body: string; format?: "plain" | "html" }
export type TraineeVideoBlock = { id: string; type: "video"; url: string; caption: string }
export type TraineeImageBlock = { id: string; type: "image"; url: string; alt: string }
export type TraineeResourceBlock = { id: string; type: "resource"; url: string; label: string }

export type TraineeContentBlock =
  | TraineeTextBlock
  | TraineeVideoBlock
  | TraineeImageBlock
  | TraineeResourceBlock
  | TraineeQuizBlock
  | TraineeAssignmentBlock

export type TraineeLessonView = {
  id: string
  title: string
  description: string
  blocks: TraineeContentBlock[]
}

export type TraineeCourseView = {
  kind: "course"
  enrollmentId: string
  title: string
  description: string
  version: number
  versionStatus: "published" | "superseded"
  intendedRole: string
  estimatedDurationMinutes: number
  lessons: TraineeLessonView[]
}

export type TraineePathView = {
  kind: "path"
  enrollmentId: string
  title: string
  description: string
  version: number
  versionStatus: "published" | "superseded"
  intendedRole: string
  focus: PathFocus
  courseCount: number
}

export type TraineeAssignedView = TraineeCourseView | TraineePathView

export function assignedTrainingHref(enrollmentId: string): string {
  return `/training/assignments/${enrollmentId}`
}

export function assignedLessonHref(enrollmentId: string, lessonId: string): string {
  return `/training/assignments/${enrollmentId}/lessons/${lessonId}`
}

export function visibleLessonText(body: string, format?: "plain" | "html"): string {
  if (format !== "html") return body
  const stripped = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim()
  return stripped || body
}

function traineeQuizOptions(block: Extract<ContentBlock, { type: "quiz" }>): TraineeQuizQuestion[] {
  return block.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    kind: question.kind,
    options: question.options.map((option) => ({ id: option.id, label: option.label })),
  }))
}

function traineeBlock(block: ContentBlock): TraineeContentBlock {
  if (block.type === "quiz") {
    return {
      id: block.id,
      type: "quiz",
      title: block.title,
      questions: traineeQuizOptions(block),
    }
  }
  if (block.type === "assignment") {
    return {
      id: block.id,
      type: "assignment",
      title: block.title,
      instructions: block.instructions,
      verification: block.verification,
    }
  }
  if (block.type === "text") {
    return block.format === "html"
      ? { id: block.id, type: "text", body: block.body, format: "html" }
      : { id: block.id, type: "text", body: block.body }
  }
  if (block.type === "video") {
    return { id: block.id, type: "video", url: block.url, caption: block.caption }
  }
  if (block.type === "image") {
    return { id: block.id, type: "image", url: block.url, alt: block.alt }
  }
  return { id: block.id, type: "resource", url: block.url, label: block.label }
}

function traineeLesson(lesson: LessonContent): TraineeLessonView {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    blocks: lesson.blocks.map(traineeBlock),
  }
}

export function toTraineeCourseView(
  enrollmentId: string,
  version: number,
  versionStatus: "published" | "superseded",
  content: CourseContent,
): TraineeCourseView {
  return {
    kind: "course",
    enrollmentId,
    title: content.title,
    description: content.description,
    version,
    versionStatus,
    intendedRole: content.intendedRole,
    estimatedDurationMinutes: content.estimatedDurationMinutes,
    lessons: content.lessons.map(traineeLesson),
  }
}

export function toTraineePathView(
  enrollmentId: string,
  version: number,
  versionStatus: "published" | "superseded",
  content: PathContent,
): TraineePathView {
  return {
    kind: "path",
    enrollmentId,
    title: content.title,
    description: content.description,
    version,
    versionStatus,
    intendedRole: content.intendedRole,
    focus: content.focus,
    courseCount: content.courses.length,
  }
}

export function quizOptionsLeakAnswers(view: TraineeAssignedView): boolean {
  if (view.kind !== "course") return false
  return view.lessons.some((lesson) =>
    lesson.blocks.some((block) => {
      if (block.type !== "quiz") return false
      return block.questions.some((question) =>
        question.options.some((option) => "correct" in option || "sortString" in option || "html" in option),
      )
    }),
  )
}
