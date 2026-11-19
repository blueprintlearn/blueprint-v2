import { describe, expect, it } from "vitest"

import {
  addLessonToContent,
  cloneCourseContent,
  companyCanSeeMaster,
  currentDraft,
  currentPublished,
  emptyBlock,
  emptyCourseContent,
  emptyLesson,
  emptyPathContent,
  mergeCourseMetadata,
  moveLessonInContent,
  parseCourseContent,
  parseCourseEditorForm,
  parseLessonEditorForm,
  parsePathContent,
  starterCatalogVisible,
  TRAINING_ACTOR_ROLES,
  TRAINING_ENROLLMENT_CLOSED,
  updateAvailable,
} from "@/lib/blueprint/training-library"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const validCourse = emptyCourseContent("MC Foundations")

describe("training library content", () => {
  it("accepts mixed lesson blocks and stored assessment rules", () => {
    const course = cloneCourseContent(validCourse)
    course.lessons = [emptyLesson("Welcome")]
    course.lessons[0].blocks = [
      emptyBlock("text"),
      emptyBlock("video"),
      emptyBlock("image"),
      emptyBlock("resource"),
      emptyBlock("quiz"),
      emptyBlock("assignment"),
    ]
    const parsed = parseCourseContent(course)
    expect(parsed?.lessons[0]?.blocks.map((block) => block.type)).toEqual([
      "text",
      "video",
      "image",
      "resource",
      "quiz",
      "assignment",
    ])
    expect(parsed?.assessment.quizGrading).toBe("objective")
    expect(parsed?.assessment.writtenFeedback).toBe("none")
    expect(parsed?.assessment.assignmentApproval).toBe("human")
    expect(parsed?.extensions.marketplace.sharing).toBe("none")
  })

  it("rejects a scored quiz with no correct choice", () => {
    const course = cloneCourseContent(validCourse)
    const quiz = emptyBlock("quiz")
    if (quiz.type !== "quiz") throw new Error("expected quiz")
    quiz.questions[0].options = quiz.questions[0].options.map((option) => ({ ...option, correct: false }))
    course.lessons = [{ ...emptyLesson("Quiz"), blocks: [quiz] }]
    expect(parseCourseContent(course)).toBeNull()
  })

  it("keeps company copies independent of the original snapshot", () => {
    const master = parseCourseContent(validCourse)
    if (!master) throw new Error("expected course")
    const copy = cloneCourseContent(master)
    copy.title = "Company MC"
    copy.lessons.push(emptyLesson("Company-only lesson"))
    expect(master.title).toBe("MC Foundations")
    expect(master.lessons).toHaveLength(0)
    expect(copy.lessons).toHaveLength(1)
  })

  it("hides private and archived master content from company catalogs", () => {
    expect(companyCanSeeMaster("private")).toBe(false)
    expect(companyCanSeeMaster("archived")).toBe(false)
    expect(companyCanSeeMaster("starter")).toBe(true)
    expect(starterCatalogVisible("starter", "published")).toBe(true)
    expect(starterCatalogVisible("starter", "draft")).toBe(false)
    expect(starterCatalogVisible("private", "published")).toBe(false)
  })

  it("never auto-applies a newer master version onto a company copy", () => {
    expect(
      updateAvailable({ origin: "adopted", sourceMasterVersion: 1 }, 2),
    ).toBe(true)
    expect(
      updateAvailable({ origin: "adopted", sourceMasterVersion: 2 }, 2),
    ).toBe(false)
    expect(updateAvailable({ origin: "original", sourceMasterVersion: null }, 2)).toBe(false)
  })

  it("reorders lessons without dropping later content", () => {
    let course = emptyCourseContent("Order")
    course = addLessonToContent(course, emptyLesson("First")) ?? course
    course = addLessonToContent(course, emptyLesson("Second")) ?? course
    const moved = moveLessonInContent(course, course.lessons[1].id, "up")
    expect(moved?.lessons.map((lesson) => lesson.title)).toEqual(["Second", "First"])
  })

  it("validates path order and same-path prerequisites", () => {
    const first = "11111111-1111-4111-8111-111111111111"
    const second = "22222222-2222-4222-8222-222222222222"
    const allowed = new Set([first, second])
    expect(
      parsePathContent(
        {
          ...emptyPathContent("Wedding DJ path"),
          intendedRole: "Wedding DJ",
          courses: [
            { courseId: first, prerequisiteCourseIds: [] },
            { courseId: second, prerequisiteCourseIds: [first] },
          ],
        },
        allowed,
      )?.courses,
    ).toHaveLength(2)
    expect(
      parsePathContent(
        {
          ...emptyPathContent("Broken"),
          courses: [{ courseId: first, prerequisiteCourseIds: [second] }],
        },
        allowed,
      ),
    ).toBeNull()
  })

  it("parses course and lesson editors without enabling enrollment", () => {
    const metadata = parseCourseEditorForm(
      form({
        title: "House standards",
        description: "",
        category: "company_standards",
        intendedRole: "DJ",
        experienceLevel: "beginner",
        estimatedDurationMinutes: "40",
        lessonAccess: "sequential",
        requireCompletionBeforeAdvance: "1",
        quizGrading: "objective",
        writtenFeedback: "none",
        assignmentApproval: "human",
        submissionMode: "online",
        retryLimit: "3",
        retryWaitHours: "0",
        certificationRequirement: "none",
      }),
    )
    expect(typeof metadata === "object" && metadata.title).toBe("House standards")
    const existing = emptyCourseContent("Old")
    existing.lessons = [emptyLesson("Keep me")]
    if (typeof metadata === "string") throw new Error(metadata)
    expect(mergeCourseMetadata(existing, metadata).lessons).toHaveLength(1)

    const lesson = emptyLesson("Mic check")
    const parsedLesson = parseLessonEditorForm(
      form({
        lessonId: lesson.id,
        title: "Mic check",
        description: "",
        blockCount: "1",
        "block-0-id": "block-1",
        "block-0-type": "text",
        "block-0-body": "Test the microphone before guests arrive.",
        requireAllBlocks: "1",
        lockedUntilPreviousComplete: "1",
        requiredBlockIds: "",
      }),
    )
    expect(typeof parsedLesson === "object" && parsedLesson.blocks[0]?.type).toBe("text")
    expect(TRAINING_ENROLLMENT_CLOSED).toMatch(/does not assign anyone/i)
    expect(TRAINING_ACTOR_ROLES).toEqual(["company_owner", "training_manager", "designated_trainer", "trainee"])
  })

  it("treats drafts as editable and published rows as the current snapshot", () => {
    const rows = [
      { status: "superseded" as const, version: 1 },
      { status: "published" as const, version: 2 },
      { status: "draft" as const, version: 3 },
    ]
    expect(currentDraft(rows)?.version).toBe(3)
    expect(currentPublished(rows)?.version).toBe(2)
  })
})
