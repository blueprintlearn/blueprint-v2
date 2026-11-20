import { describe, expect, it } from "vitest"

import { emptyCourseContent, emptyLesson, emptyPathContent } from "@/lib/blueprint/training-library"
import {
  assignedLessonHref,
  assignedTrainingHref,
  quizOptionsLeakAnswers,
  STAGE4_VIEWER_STATUS,
  toTraineeCourseView,
  toTraineePathView,
  visibleLessonText,
} from "@/lib/blueprint/training-viewer"

describe("training frozen-content viewer", () => {
  it("strips quiz answer keys and sequential lock fields from the trainee view", () => {
    const content = emptyCourseContent("MC Foundations")
    content.progression = { lessonAccess: "sequential", requireCompletionBeforeAdvance: true }
    content.assessment.certificationRequirement = "automatic"
    const lesson = emptyLesson("Welcome")
    lesson.progression.lockedUntilPreviousComplete = true
    lesson.blocks = [
      {
        id: "quiz-1",
        type: "quiz",
        title: "Mic check",
        questions: [
          {
            id: "q-1",
            prompt: "When should you test the microphone?",
            kind: "single_choice",
            options: [
              { id: "a", label: "Before guests arrive", correct: true, html: "<b>yes</b>", sortString: "1" },
              { id: "b", label: "During the first dance", correct: false },
            ],
            writtenFeedback: "none",
          },
        ],
        config: { grading: "objective", retryLimit: 3, retryWaitHours: 0, passingScorePercent: 80 },
      },
      {
        id: "assign-1",
        type: "assignment",
        title: "Record a welcome",
        instructions: "Record a 30-second welcome.",
        verification: "online",
        requiresHumanApproval: true,
        retryLimit: 1,
      },
    ]
    content.lessons = [lesson]
    const view = toTraineeCourseView("enroll-1", 1, "superseded", content)
    expect(STAGE4_VIEWER_STATUS).toBe("enabled")
    expect(view).toMatchObject({
      kind: "course",
      enrollmentId: "enroll-1",
      title: "MC Foundations",
      version: 1,
      versionStatus: "superseded",
    })
    expect(view).not.toHaveProperty("progression")
    expect(view).not.toHaveProperty("assessment")
    const quiz = view.lessons[0]?.blocks.find((block) => block.type === "quiz")
    expect(quiz).toMatchObject({
      type: "quiz",
      title: "Mic check",
      questions: [
        {
          id: "q-1",
          prompt: "When should you test the microphone?",
          kind: "single_choice",
          options: [
            { id: "a", label: "Before guests arrive" },
            { id: "b", label: "During the first dance" },
          ],
        },
      ],
    })
    expect(quizOptionsLeakAnswers(view)).toBe(false)
    expect(JSON.stringify(view)).not.toMatch(/"correct":/)
    expect(JSON.stringify(view)).not.toMatch(/"sortString":/)
    const assignment = view.lessons[0]?.blocks.find((block) => block.type === "assignment")
    expect(assignment).toEqual({
      id: "assign-1",
      type: "assignment",
      title: "Record a welcome",
      instructions: "Record a 30-second welcome.",
      verification: "online",
    })
    expect(assignedTrainingHref("enroll-1")).toBe("/training/assignments/enroll-1")
    expect(assignedLessonHref("enroll-1", "lesson-1")).toBe("/training/assignments/enroll-1/lessons/lesson-1")
  })

  it("keeps frozen path metadata without loading live course titles", () => {
    const content = emptyPathContent("Wedding DJ beginner")
    content.description = "First assigned path."
    content.intendedRole = "Wedding DJ"
    content.focus = "beginner"
    content.courses = [
      { courseId: "course-1", prerequisiteCourseIds: [] },
      { courseId: "course-2", prerequisiteCourseIds: ["course-1"] },
    ]
    const view = toTraineePathView("enroll-2", 2, "published", content)
    expect(view).toEqual({
      kind: "path",
      enrollmentId: "enroll-2",
      title: "Wedding DJ beginner",
      description: "First assigned path.",
      version: 2,
      versionStatus: "published",
      intendedRole: "Wedding DJ",
      focus: "beginner",
      courseCount: 2,
    })
    expect(quizOptionsLeakAnswers(view)).toBe(false)
    expect(visibleLessonText("<p>Welcome <strong>guests</strong>.</p>", "html")).toBe("Welcome guests.")
    expect(visibleLessonText("A clear welcome.", "plain")).toBe("A clear welcome.")
  })
})
