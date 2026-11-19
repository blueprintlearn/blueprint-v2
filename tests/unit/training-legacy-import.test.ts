import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { importedMasterMustStayPrivate, LEGACY_DEFAULT_MASTER_VISIBILITY } from "@/lib/blueprint/training-legacy-contract"
import { legacyUuid } from "@/lib/blueprint/training-legacy-ids"
import { mapLegacyCourse, mapLegacyExport } from "@/lib/blueprint/training-legacy-import"
import {
  emptyCourseContent,
  emptyLesson,
  LESSON_MAX,
  OPTION_MAX,
  parseCourseContent,
  parseLessonEditorForm,
} from "@/lib/blueprint/training-library"

import fixture from "../fixtures/legacy-curriculum-subset.json"

const document = fixture as typeof fixture & { courses: unknown[] }

function quizBlock(content: ReturnType<typeof parseCourseContent>) {
  const lesson = content?.lessons.find((item) => item.blocks.some((block) => block.type === "quiz"))
  const block = lesson?.blocks.find((item) => item.type === "quiz")
  return block && block.type === "quiz" ? block : null
}

describe("legacy curriculum import mapper", () => {
  it("maps fixture courses to private master snapshots with stable ids", () => {
    const { mapped, report } = mapLegacyExport(document, { dryRun: true })
    expect(report.dryRun).toBe(true)
    expect(mapped).toHaveLength(2)
    expect(mapped.every((course) => course.visibility === "private")).toBe(true)
    expect(mapped.every((course) => importedMasterMustStayPrivate(course.visibility))).toBe(true)
    expect(report.totals.courses).toBe(2)
    expect(report.totals.lessons).toBe(3)
    expect(report.totals.quizzes).toBe(1)
    expect(report.totals.questions).toBe(3)
    expect(report.totals.assignments).toBe(1)
    expect(mapped[0]?.masterCourseId).toBe(legacyUuid("course", "90001"))
    expect(mapped[0]?.content.lessons.map((lesson) => lesson.title)).toEqual([
      "What is beatmatching?",
      "Phrase matching",
    ])
    expect(mapped[0]?.content.lessons.map((lesson) => lesson.legacy.sourceId)).toEqual(["91001", "91002"])
    expect(mapped[0]?.content.category).toBe("mixing")
    expect(mapped[1]?.content.category).toBe("onboarding")
    expect(mapped[1]?.wordpressStatus).toBe("private")
    expect(mapped.every((course) => parseCourseContent(course.content))).toBeTruthy()
  })

  it("preserves lesson order, media URLs, links, HTML, and assignment flags", () => {
    const mapped = mapLegacyCourse(document.courses[0])
    if ("error" in mapped) throw new Error(mapped.error)
    const first = mapped.content.lessons[0]
    expect(first.blocks.map((block) => block.type)).toEqual(["text", "video", "resource", "assignment"])
    const text = first.blocks[0]
    const video = first.blocks[1]
    const resource = first.blocks[2]
    const assignment = first.blocks[3]
    if (text.type !== "text" || video.type !== "video" || resource.type !== "resource" || assignment.type !== "assignment") {
      throw new Error("unexpected block types")
    }
    expect(text.format).toBe("html")
    expect(text.body).toContain("https://media.blueprintteams.com/2022/10/TS.jpg")
    expect(video.url).toBe("https://vimeo.com/681060412")
    expect(resource.url).toBe("https://drive.google.com/drive/folders/fixture-pack")
    expect(assignment.requiresHumanApproval).toBe(true)
    expect(assignment.legacy?.sourceId).toBe("91001")
    const youtube = mapped.content.lessons[1]?.blocks.find((block) => block.type === "video" && block.url.includes("youtube"))
    expect(youtube && youtube.type === "video" ? youtube.url : null).toBe(
      "https://www.youtube.com/watch?v=pbON1Ce46OEhttps",
    )
    expect(mapped.issues.some((issue) => issue.code === "malformed-youtube-url")).toBe(true)
  })

  it("preserves quiz prompts, choices, correct flags, scoring, and matrix pairs", () => {
    const mapped = mapLegacyCourse(document.courses[1])
    if ("error" in mapped) throw new Error(mapped.error)
    const quiz = quizBlock(mapped.content)
    expect(quiz?.title).toBe("Lesson 1 quiz")
    expect(quiz?.config.passingScorePercent).toBe(100)
    expect(quiz?.config.retryLimit).toBe(50)
    expect(quiz?.legacy?.sourceId).toBe("93001")
    expect(quiz?.questions).toHaveLength(3)
    const single = quiz?.questions[0]
    expect(single?.kind).toBe("single_choice")
    expect(single?.prompt).toBe("What is a common mistake?")
    expect(single?.options.map((option) => option.correct)).toEqual([false, true, false, false])
    expect(single?.options.map((option) => option.label)).toEqual([
      "Focusing too much on profits",
      "Lack of a clear vision or direction",
      "Overinvesting in equipment",
      "Hiring too many experienced DJs",
    ])
    const multiple = quiz?.questions[1]
    expect(multiple?.kind).toBe("multiple_choice")
    expect(multiple?.options.filter((option) => option.correct).map((option) => option.label)).toEqual([
      "Trainees need a clear plan",
      "Practice should be observed",
    ])
    const matrix = quiz?.questions[2]
    expect(matrix?.kind).toBe("matrix_sort")
    expect(matrix?.options).toHaveLength(8)
    expect(matrix?.options.every((option) => option.correct === false)).toBe(true)
    expect(matrix?.options.map((option) => option.sortString)).toEqual([
      '1/8" TRS',
      "RCA",
      '1/4" TS',
      "XLR (Female)",
      '1/4" TRS',
      "XLR (Male)",
      "Spare RCA",
      "Spare TS",
    ])
    expect(matrix?.options[0]?.html).toContain("TRA18.jpg")
    expect(mapped.issues.some((issue) => issue.code === "course-prerequisites")).toBe(true)
    expect(mapped.issues.some((issue) => issue.code === "course-quiz-already-on-lesson")).toBe(true)
    expect(mapped.issues.some((issue) => issue.code === "broken-answer-message")).toBe(true)
  })

  it("skips unassigned rows, submissions, and trainee progress without inventing content", () => {
    const { report } = mapLegacyExport(document)
    const codes = report.skipped.map((issue) => issue.code)
    expect(codes).toContain("unassigned-lesson")
    expect(codes).toContain("unassigned-quiz")
    expect(codes).toContain("assignment-submission")
    expect(codes).toContain("trainee-progress")
    expect(report.skipped.some((issue) => issue.sourceId === "99903")).toBe(true)
  })

  it("keeps imported masters private and never maps LearnDash publish to starter", () => {
    const mapped = mapLegacyCourse(document.courses[0])
    if ("error" in mapped) throw new Error(mapped.error)
    expect(mapped.visibility).toBe(LEGACY_DEFAULT_MASTER_VISIBILITY)
    expect(mapped.issues.some((issue) => issue.code === "wordpress-publish-is-not-starter")).toBe(true)
  })

  it("accepts Event DJ-scale lesson counts after the Stage 4.2 limit change", () => {
    const course = emptyCourseContent("Event DJ Foundations")
    course.lessons = Array.from({ length: 77 }, (_, index) => emptyLesson(`Lesson ${index + 1}`))
    expect(course.lessons.length).toBeGreaterThan(40)
    expect(course.lessons.length).toBeLessThanOrEqual(LESSON_MAX)
    expect(parseCourseContent(course)?.lessons).toHaveLength(77)
  })

  it("round-trips imported lesson extras through the editor form", () => {
    const mapped = mapLegacyCourse(document.courses[1])
    if ("error" in mapped) throw new Error(mapped.error)
    const lesson = mapped.content.lessons[0]
    const quiz = lesson.blocks.find((block) => block.type === "quiz")
    if (!quiz || quiz.type !== "quiz") throw new Error("expected quiz")
    const data = new FormData()
    data.set("lessonId", lesson.id)
    data.set("title", lesson.title)
    data.set("description", "")
    data.set("blockCount", String(lesson.blocks.length))
    data.set("legacySourceId", lesson.legacy.sourceId ?? "")
    data.set("legacyContentVersion", lesson.legacy.contentVersion ?? "")
    data.set("requireAllBlocks", "1")
    data.set("lockedUntilPreviousComplete", "1")
    data.set("requiredBlockIds", "")
    lesson.blocks.forEach((block, index) => {
      data.set(`block-${index}-id`, block.id)
      data.set(`block-${index}-type`, block.type)
      if (block.type === "text") {
        data.set(`block-${index}-body`, block.body)
        if (block.format === "html") data.set(`block-${index}-format`, "html")
      }
      if (block.type === "quiz") {
        data.set(`block-${index}-title`, block.title)
        data.set(`block-${index}-questionCount`, String(block.questions.length))
        data.set(`block-${index}-legacySourceId`, block.legacy?.sourceId ?? "")
        data.set(`block-${index}-legacyContentVersion`, block.legacy?.contentVersion ?? "")
        data.set(`block-${index}-retryLimit`, String(block.config.retryLimit ?? ""))
        data.set(`block-${index}-retryWaitHours`, String(block.config.retryWaitHours ?? 0))
        data.set(`block-${index}-passingScorePercent`, String(block.config.passingScorePercent ?? 100))
        block.questions.forEach((question, questionIndex) => {
          data.set(`block-${index}-q-${questionIndex}-id`, question.id)
          data.set(`block-${index}-q-${questionIndex}-prompt`, question.prompt)
          data.set(`block-${index}-q-${questionIndex}-kind`, question.kind)
          data.set(`block-${index}-q-${questionIndex}-writtenFeedback`, question.writtenFeedback)
          data.set(`block-${index}-q-${questionIndex}-legacySourceId`, question.legacy?.sourceId ?? "")
          data.set(`block-${index}-q-${questionIndex}-legacyContentVersion`, question.legacy?.contentVersion ?? "")
          data.set(`block-${index}-q-${questionIndex}-optionCount`, String(question.options.length))
          question.options.forEach((option, optionIndex) => {
            data.set(`block-${index}-q-${questionIndex}-opt-${optionIndex}-id`, option.id)
            data.set(`block-${index}-q-${questionIndex}-opt-${optionIndex}-label`, option.label)
            if (option.correct) data.set(`block-${index}-q-${questionIndex}-opt-${optionIndex}-correct`, "1")
            if (option.html) data.set(`block-${index}-q-${questionIndex}-opt-${optionIndex}-html`, option.html)
            if (option.sortString) {
              data.set(`block-${index}-q-${questionIndex}-opt-${optionIndex}-sortString`, option.sortString)
            }
          })
        })
      }
    })
    const parsed = parseLessonEditorForm(data)
    if (typeof parsed === "string") throw new Error(parsed)
    expect(parsed.legacy).toEqual(lesson.legacy)
    const parsedQuiz = parsed.blocks.find((block) => block.type === "quiz")
    if (!parsedQuiz || parsedQuiz.type !== "quiz") throw new Error("expected quiz")
    expect(parsedQuiz.legacy?.sourceId).toBe("93001")
    expect(parsedQuiz.questions[2]?.kind).toBe("matrix_sort")
    expect(parsedQuiz.questions[2]?.options).toHaveLength(OPTION_MAX)
    expect(parsedQuiz.questions[2]?.options[0]?.html).toContain("TRA18.jpg")
    expect(parsedQuiz.questions[0]?.options.map((option) => option.correct)).toEqual([false, true, false, false])
  })
})

describe("optional production export checks", () => {
  const productionPath = process.env.BLUEPRINT_LEGACY_EXPORT
  const production = productionPath
    ? (JSON.parse(readFileSync(productionPath, "utf8")) as unknown)
    : null

  it.skipIf(!production)("maps all 16 assigned production courses without dropping lessons", () => {
    const { mapped, report } = mapLegacyExport(production, { dryRun: true })
    expect(mapped).toHaveLength(16)
    expect(report.totals.lessons).toBe(242)
    expect(mapped.every((course) => course.visibility === "private")).toBe(true)
    expect(mapped.every((course) => parseCourseContent(course.content))).toBeTruthy()
    expect(mapped.find((course) => course.slug === "event-dj-foundations-instructor")?.lessonCount).toBe(77)
    expect(mapped.find((course) => course.slug === "event-assistant")?.lessonCount).toBe(42)
    expect(report.totals.failed).toBe(0)
  })
})
