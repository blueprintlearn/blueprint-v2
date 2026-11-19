/**
 * Stage 4.2 LearnDash → private master-library mapper.
 * Does not rewrite lesson copy. Does not import trainees or progress.
 */

import { legacyUuid } from "@/lib/blueprint/training-legacy-ids"
import {
  DEFAULT_RETRY_LIMIT,
  DEFAULT_RETRY_WAIT_HOURS,
  ANSWER_HTML_MAX,
  DESCRIPTION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  OPTION_LABEL_MAX,
  TITLE_MAX,
  defaultExtensions,
  parseCourseContent,
  type AssignmentBlock,
  type ContentBlock,
  type CourseCategory,
  type CourseContent,
  type LessonContent,
  type QuizBlock,
  type QuizOption,
  type QuizQuestion,
  type QuizQuestionKind,
} from "@/lib/blueprint/training-library"
import {
  LEGACY_CANONICAL_EXPORT,
  LEGACY_CANONICAL_EXPORT_BRANCH,
  LEGACY_DEFAULT_MASTER_VISIBILITY,
  LEGACY_EXPORT_DATE,
  legacyRefFromSource,
} from "@/lib/blueprint/training-legacy-contract"

export const LEGACY_IMPORT_ENGINE = "stage-4.2-private-master" as const
export const LEGACY_CONTENT_VERSION = `learndash-${LEGACY_EXPORT_DATE}` as const

export const LEGACY_SKIP_UNASSIGNED_LESSONS = "unassigned lessons"
export const LEGACY_SKIP_UNASSIGNED_QUIZZES = "unassigned quizzes"
export const LEGACY_SKIP_ASSIGNMENT_SUBMISSIONS = "assignment_submissions"
export const LEGACY_SKIP_TRAINEE_PROGRESS = "trainee accounts and historical progress"

const LD_CATEGORY_TO_COURSE: Record<string, CourseCategory> = {
  "controlling-music": "mixing",
  audio: "audio",
  lighting: "equipment",
  mc: "mc",
  events: "general",
  music: "mixing",
  support: "general",
  "coming-soon": "general",
  free: "general",
  paid: "general",
}

export type LegacyImportIssue = {
  code: string
  severity: "unsupported" | "skipped" | "warning" | "failed"
  sourceId: string
  detail: string
}

export type LegacyIdentifierRow = {
  kind: "course" | "lesson" | "quiz" | "question" | "assignment" | "video" | "resource"
  legacyId: string
  v2Id: string
  parentLegacyId: string | null
  title: string
}

export type LegacyMappedCourse = {
  masterCourseId: string
  versionId: string
  legacySourceId: string
  slug: string
  wordpressStatus: string
  title: string
  visibility: typeof LEGACY_DEFAULT_MASTER_VISIBILITY
  content: CourseContent
  lessonCount: number
  quizCount: number
  questionCount: number
  assignmentCount: number
  videoCount: number
  resourceCount: number
  issues: LegacyImportIssue[]
  identifiers: LegacyIdentifierRow[]
}

export type LegacyImportReport = {
  engine: typeof LEGACY_IMPORT_ENGINE
  exportBranch: typeof LEGACY_CANONICAL_EXPORT_BRANCH
  canonicalExport: typeof LEGACY_CANONICAL_EXPORT
  exportGeneratedAt: string | null
  exportSourceSite: string | null
  contentVersion: string
  dryRun: boolean
  courses: Array<
    Omit<LegacyMappedCourse, "content"> & {
      status: "imported" | "unchanged" | "dry_run" | "failed"
      contentTitle: string
    }
  >
  skipped: LegacyImportIssue[]
  totals: {
    courses: number
    lessons: number
    quizzes: number
    questions: number
    assignments: number
    videos: number
    resources: number
    unsupported: number
    skipped: number
    failed: number
  }
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value)
}

function asNumberId(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value)) return String(value)
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim()
  return null
}

function clip(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim()
}

function sortByOrder<T extends { order: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.order - right.order || Number(left.id) - Number(right.id) || left.id.localeCompare(right.id))
}

export function mapLearnDashCategory(categories: { slug: string; name: string }[], title: string): CourseCategory {
  if (/onboarding/i.test(title)) return "onboarding"
  for (const category of categories) {
    const mapped = LD_CATEGORY_TO_COURSE[category.slug]
    if (mapped) return mapped
  }
  return "general"
}

function questionKind(type: string): QuizQuestionKind | null {
  if (type === "single") return "single_choice"
  if (type === "multiple") return "multiple_choice"
  if (type === "matrix_sort_answer") return "matrix_sort"
  if (type === "true_false" || type === "true-false") return "true_false"
  if (type === "essay") return "written"
  return null
}

function optionLabel(answer: UnknownRecord, index: number): { label: string; usedFallback: boolean } {
  const text = asString(answer.text).trim()
  if (text) return { label: text, usedFallback: false }
  const sortString = asString(answer.sort_string).trim()
  if (sortString) return { label: sortString, usedFallback: false }
  const html = asString(answer.html)
  const file = html.match(/\/([^/"']+\.(?:jpg|jpeg|png|gif|webp))/i)?.[1]
  if (file) return { label: file, usedFallback: false }
  return { label: `Answer ${index}`, usedFallback: true }
}

function parseTaxonomy(value: unknown): { id: string; name: string; slug: string }[] {
  const rows: { id: string; name: string; slug: string }[] = []
  for (const item of asArray(value)) {
    const record = asRecord(item)
    if (!record) continue
    const id = asNumberId(record.id)
    const name = asString(record.name).trim()
    const slug = asString(record.slug).trim()
    if (id && name && slug) rows.push({ id, name, slug })
  }
  return rows
}

function mediaList(media: UnknownRecord | null, key: string): UnknownRecord[] {
  if (!media) return []
  return asArray(media[key]).map(asRecord).filter((row): row is UnknownRecord => row != null)
}

function diagnoseCourseContent(content: CourseContent): string {
  const shell = structuredClone(content)
  shell.lessons = []
  if (!parseCourseContent(shell)) return "course metadata"
  for (const [index, lesson] of content.lessons.entries()) {
    shell.lessons = [lesson]
    if (parseCourseContent(shell)) continue
    const lessonShell = structuredClone(lesson)
    lessonShell.blocks = []
    shell.lessons = [lessonShell]
    if (!parseCourseContent(shell)) return `lesson ${index} ${lesson.title} metadata`
    for (const [blockIndex, block] of lesson.blocks.entries()) {
      lessonShell.blocks = [block]
      shell.lessons = [lessonShell]
      if (!parseCourseContent(shell)) return `lesson ${index} ${lesson.title} block ${blockIndex} ${block.type}`
    }
    return `lesson ${index} ${lesson.title}`
  }
  shell.lessons = content.lessons
  if (!parseCourseContent(shell)) return "all lessons together"
  return "unknown"
}

export function mapLegacyCourse(raw: unknown, contentVersion: string = LEGACY_CONTENT_VERSION): LegacyMappedCourse | { error: string; issues: LegacyImportIssue[] } {
  const course = asRecord(raw)
  const legacySourceId = course ? asNumberId(course.id) : null
  if (!course || !legacySourceId) {
    return { error: "Course is missing a LearnDash id.", issues: [] }
  }
  const title = clip(asString(course.title), TITLE_MAX)
  if (!title) return { error: `Course ${legacySourceId} is missing a title.`, issues: [] }
  const issues: LegacyImportIssue[] = []
  const identifiers: LegacyIdentifierRow[] = []
  const slug = asString(course.slug)
  const wordpressStatus = asString(course.status) || "unknown"
  const masterCourseId = legacyUuid("course", legacySourceId)
  const versionId = legacyUuid("course-version", `${legacySourceId}:1`)
  identifiers.push({ kind: "course", legacyId: legacySourceId, v2Id: masterCourseId, parentLegacyId: null, title })

  if (wordpressStatus === "publish") {
    issues.push({
      code: "wordpress-publish-is-not-starter",
      severity: "warning",
      sourceId: legacySourceId,
      detail: "LearnDash status publish maps to a private Blueprint master course, not the Starter Library.",
    })
  }

  const categories = parseTaxonomy(course.categories)
  const settings = asRecord(course.settings)
  if (settings?.prerequisite_enabled === true) {
    issues.push({
      code: "course-prerequisites",
      severity: "unsupported",
      sourceId: legacySourceId,
      detail: `LearnDash prerequisites ${JSON.stringify(settings.prerequisites ?? [])} are not a Stage 4.1 path. Original ids are preserved here for a later path import.`,
    })
  }
  if (settings?.certificate && Number(settings.certificate) !== 0) {
    issues.push({
      code: "course-certificate",
      severity: "unsupported",
      sourceId: legacySourceId,
      detail: `LearnDash certificate ${String(settings.certificate)} was not imported. Certification stays off.`,
    })
  }
  if (settings?.points_enabled === true) {
    issues.push({
      code: "course-points",
      severity: "unsupported",
      sourceId: legacySourceId,
      detail: "LearnDash course points were not imported. Scoring engines stay off.",
    })
  }

  const lessonsIn = asArray(course.lessons)
  const mappedLessons: LessonContent[] = []
  let quizCount = 0
  let questionCount = 0
  let assignmentCount = 0
  let videoCount = 0
  let resourceCount = 0
  const importedQuizIds = new Set<string>()

  const normalizedLessons = lessonsIn.map((item, index) => {
    const lesson = asRecord(item) ?? {}
    return {
      raw: lesson,
      id: asNumberId(lesson.id) ?? `missing-${index}`,
      order: typeof lesson.order === "number" ? lesson.order : index + 1,
      title: clip(asString(lesson.title), TITLE_MAX) || `Lesson ${index + 1}`,
    }
  })

  for (const lesson of sortByOrder(normalizedLessons)) {
    if (lesson.id.startsWith("missing-")) {
      issues.push({
        code: "lesson-missing-id",
        severity: "failed",
        sourceId: legacySourceId,
        detail: `A lesson titled "${lesson.title}" has no LearnDash id and was not imported.`,
      })
      continue
    }
    const record = lesson.raw
    const lessonId = lesson.id
    const v2LessonId = legacyUuid("lesson", lessonId)
    identifiers.push({
      kind: "lesson",
      legacyId: lessonId,
      v2Id: v2LessonId,
      parentLegacyId: legacySourceId,
      title: lesson.title,
    })

    const visibility = asRecord(record.visibility)
    if (visibility && asString(visibility.type).trim()) {
      issues.push({
        code: "lesson-drip",
        severity: "unsupported",
        sourceId: lessonId,
        detail: `LearnDash drip visibility ${JSON.stringify(visibility)} is stored only in this report. The lesson itself is imported.`,
      })
    }
    const timer = asRecord(record.timer)
    if (timer?.forced_timer_enabled === true) {
      issues.push({
        code: "lesson-timer",
        severity: "unsupported",
        sourceId: lessonId,
        detail: `Forced timer ${String(timer.amount)} was not imported. The lesson content is imported.`,
      })
    }
    if (asArray(record.topics).length > 0) {
      issues.push({
        code: "lesson-topics",
        severity: "unsupported",
        sourceId: lessonId,
        detail: "LearnDash topics on this lesson were preserved in the source export only.",
      })
    }

    const blocks: ContentBlock[] = []
    const html = asString(record.content_html).trim()
    const text = asString(record.content_text).trim()
    if (html || text) {
      blocks.push({
        id: legacyUuid("text", lessonId),
        type: "text",
        body: html || text,
        ...(html ? { format: "html" as const } : {}),
      })
    }

    const media = asRecord(record.media)
    for (const video of mediaList(media, "vimeo")) {
      const url = asString(video.url).trim() || asString(video.player_url).trim()
      if (!url) {
        issues.push({
          code: "vimeo-missing-url",
          severity: "unsupported",
          sourceId: lessonId,
          detail: `Vimeo reference ${JSON.stringify(video)} has no URL and was not turned into a video block.`,
        })
        continue
      }
      const sourceKey = asString(video.id).trim() || url
      const v2Id = legacyUuid("video", `${lessonId}:vimeo:${sourceKey}`)
      blocks.push({ id: v2Id, type: "video", url, caption: "" })
      identifiers.push({ kind: "video", legacyId: sourceKey, v2Id, parentLegacyId: lessonId, title: url })
      videoCount += 1
    }
    for (const video of mediaList(media, "youtube")) {
      const url = asString(video.url).trim()
      if (!url) continue
      if (/https?:\/\//i.test(asString(video.id)) || /https$/i.test(url.replace(/\/$/, ""))) {
        issues.push({
          code: "malformed-youtube-url",
          severity: "warning",
          sourceId: lessonId,
          detail: `YouTube URL kept as exported: ${url}`,
        })
      }
      const sourceKey = asString(video.id).trim() || url
      const v2Id = legacyUuid("video", `${lessonId}:youtube:${sourceKey}`)
      blocks.push({ id: v2Id, type: "video", url, caption: "" })
      identifiers.push({ kind: "video", legacyId: sourceKey, v2Id, parentLegacyId: lessonId, title: url })
      videoCount += 1
    }
    for (const frame of mediaList(media, "iframes")) {
      issues.push({
        code: "iframe-media",
        severity: "unsupported",
        sourceId: lessonId,
        detail: `Iframe media preserved in the source export: ${JSON.stringify(frame)}`,
      })
    }

    asArray(record.links).forEach((item, index) => {
      const link = asRecord(item)
      if (!link) return
      const url = asString(link.url).trim()
      const label = clip(asString(link.text) || url, TITLE_MAX)
      if (!url || !label) {
        issues.push({
          code: "resource-link-incomplete",
          severity: "unsupported",
          sourceId: lessonId,
          detail: `Downloadable link was incomplete: ${JSON.stringify(item)}`,
        })
        return
      }
      const v2Id = legacyUuid("resource", `${lessonId}:link:${index}:${url}`)
      blocks.push({ id: v2Id, type: "resource", url, label })
      identifiers.push({ kind: "resource", legacyId: url, v2Id, parentLegacyId: lessonId, title: label })
      resourceCount += 1
    })

    for (const quizRaw of asArray(record.quizzes)) {
      const quiz = asRecord(quizRaw)
      const quizId = quiz ? asNumberId(quiz.id) : null
      if (!quiz || !quizId) {
        issues.push({
          code: "quiz-missing-id",
          severity: "failed",
          sourceId: lessonId,
          detail: "A lesson quiz had no LearnDash id and was not imported.",
        })
        continue
      }
      importedQuizIds.add(quizId)
      const quizMedia = asRecord(quiz.media)
      for (const video of mediaList(quizMedia, "vimeo")) {
        const url = asString(video.url).trim() || asString(video.player_url).trim()
        if (!url) continue
        const sourceKey = asString(video.id).trim() || url
        const v2Id = legacyUuid("video", `${quizId}:vimeo:${sourceKey}`)
        blocks.push({ id: v2Id, type: "video", url, caption: asString(quiz.title).trim() })
        identifiers.push({ kind: "video", legacyId: sourceKey, v2Id, parentLegacyId: quizId, title: url })
        videoCount += 1
        issues.push({
          code: "quiz-vimeo",
          severity: "warning",
          sourceId: quizId,
          detail: `Quiz-level Vimeo URL kept as a lesson video block: ${url}`,
        })
      }
      const quizTitle = clip(asString(quiz.title), TITLE_MAX) || "Quiz"
      const quizSettings = asRecord(quiz.settings)
      const passing = typeof quizSettings?.passing_percentage === "number" ? quizSettings.passing_percentage : 100
      const retryLimit =
        quizSettings?.retry_restrictions_enabled === true && typeof quizSettings.retry_repeats === "number"
          ? quizSettings.retry_repeats
          : null
      const questions: QuizQuestion[] = []
      for (const questionRaw of asArray(quiz.questions)) {
        const question = asRecord(questionRaw)
        const questionId = question ? asNumberId(question.id) : null
        if (!question || !questionId) {
          issues.push({
            code: "question-missing-id",
            severity: "failed",
            sourceId: quizId,
            detail: "A quiz question had no LearnDash id and was not imported.",
          })
          continue
        }
        const questionMedia = asRecord(question.media)
        for (const video of mediaList(questionMedia, "vimeo")) {
          const url = asString(video.url).trim() || asString(video.player_url).trim()
          if (!url) continue
          const sourceKey = asString(video.id).trim() || url
          const v2Id = legacyUuid("video", `${questionId}:vimeo:${sourceKey}`)
          blocks.push({ id: v2Id, type: "video", url, caption: clip(asString(question.title), DESCRIPTION_MAX) })
          identifiers.push({ kind: "video", legacyId: sourceKey, v2Id, parentLegacyId: questionId, title: url })
          videoCount += 1
          issues.push({
            code: "question-vimeo",
            severity: "warning",
            sourceId: questionId,
            detail: `Question-level Vimeo URL kept as a lesson video block: ${url}`,
          })
        }
        const kind = questionKind(asString(question.type))
        if (!kind) {
          issues.push({
            code: "question-type-unsupported",
            severity: "unsupported",
            sourceId: questionId,
            detail: `LearnDash question type "${asString(question.type)}" is preserved in the source export and was not mapped.`,
          })
          continue
        }
        if (kind === "matrix_sort") {
          issues.push({
            code: "matrix-sort-extension",
            severity: "warning",
            sourceId: questionId,
            detail: "Mapped to the Stage 4.2 matrix_sort question kind. Pairing uses sortString plus original answer HTML.",
          })
        }
        if (asString(question.correct_message) === "[object Object]" || asString(question.incorrect_message) === "[object Object]") {
          issues.push({
            code: "broken-answer-message",
            severity: "warning",
            sourceId: questionId,
            detail: "LearnDash correct/incorrect messages were exported as [object Object] and were not invented or repaired.",
          })
        }
        const prompt = clip(
          asString(question.question_text) || asString(question.title) || asString(question.question_html).replace(/<[^>]+>/g, " "),
          DESCRIPTION_MAX,
        )
        if (!prompt) {
          issues.push({
            code: "question-missing-prompt",
            severity: "failed",
            sourceId: questionId,
            detail: "Question has no prompt in the export and was not imported.",
          })
          continue
        }
        const options: QuizOption[] = []
        asArray(question.answers).forEach((answerRaw, answerIndex) => {
          const answer = asRecord(answerRaw)
          if (!answer) return
          const index = typeof answer.index === "number" ? answer.index : answerIndex + 1
          const { label, usedFallback } = optionLabel(answer, index)
          if (usedFallback) {
            issues.push({
              code: "answer-label-fallback",
              severity: "warning",
              sourceId: questionId,
              detail: `Answer ${index} had empty text and sort_string; labeled "${label}" so the row is not dropped.`,
            })
          }
          const html = asString(answer.html).trim()
          const sortString = asString(answer.sort_string).trim()
          options.push({
            id: legacyUuid("option", `${questionId}:${index}`),
            label: clip(label, OPTION_LABEL_MAX),
            correct: answer.correct === true,
            ...(html ? { html: clip(html, ANSWER_HTML_MAX) } : {}),
            ...(sortString ? { sortString: clip(sortString, OPTION_LABEL_MAX) } : {}),
          })
        })
        if (kind !== "written" && options.length < 2) {
          issues.push({
            code: "question-incomplete-answers",
            severity: "unsupported",
            sourceId: questionId,
            detail: `Question "${prompt}" has ${options.length} answers in the export. Original answers were not invented.`,
          })
          continue
        }
        const v2QuestionId = legacyUuid("question", questionId)
        questions.push({
          id: v2QuestionId,
          prompt,
          kind,
          options: kind === "written" ? [] : options,
          writtenFeedback: "none",
          legacy: legacyRefFromSource(questionId, contentVersion),
        })
        identifiers.push({
          kind: "question",
          legacyId: questionId,
          v2Id: v2QuestionId,
          parentLegacyId: quizId,
          title: prompt,
        })
        questionCount += 1
      }
      if (questions.length < 1) {
        issues.push({
          code: "quiz-without-questions",
          severity: "unsupported",
          sourceId: quizId,
          detail: `Quiz "${quizTitle}" had no mappable questions and was not imported as a block.`,
        })
        continue
      }
      const quizBlock: QuizBlock = {
        id: legacyUuid("quiz", quizId),
        type: "quiz",
        title: quizTitle,
        questions,
        config: {
          grading: "objective",
          retryLimit,
          retryWaitHours: DEFAULT_RETRY_WAIT_HOURS,
          passingScorePercent: passing,
        },
        legacy: legacyRefFromSource(quizId, contentVersion),
      }
      blocks.push(quizBlock)
      identifiers.push({ kind: "quiz", legacyId: quizId, v2Id: quizBlock.id, parentLegacyId: lessonId, title: quizTitle })
      quizCount += 1
    }

    const assignment = asRecord(record.assignment)
    if (assignment?.upload_enabled === true) {
      const instructions = text || html || `File upload required for: ${lesson.title}`
      const assignmentBlock: AssignmentBlock = {
        id: legacyUuid("assignment", lessonId),
        type: "assignment",
        title: clip(`${lesson.title} upload`, TITLE_MAX) || "Assignment",
        instructions,
        verification: "online",
        requiresHumanApproval: assignment.auto_approve !== true,
        retryLimit: null,
        legacy: legacyRefFromSource(lessonId, contentVersion),
      }
      blocks.push(assignmentBlock)
      identifiers.push({
        kind: "assignment",
        legacyId: lessonId,
        v2Id: assignmentBlock.id,
        parentLegacyId: lessonId,
        title: assignmentBlock.title,
      })
      assignmentCount += 1
      issues.push({
        code: "assignment-files-not-imported",
        severity: "skipped",
        sourceId: lessonId,
        detail: "Assignment upload requirement imported. Learner files and assignment_submissions were not imported.",
      })
    }

    mappedLessons.push({
      id: v2LessonId,
      title: lesson.title,
      description: "",
      completion: { requireAllBlocks: true, requiredBlockIds: [] },
      progression: { lockedUntilPreviousComplete: settings?.progression_disabled === true ? false : true },
      blocks,
      legacy: legacyRefFromSource(lessonId, contentVersion),
    })
  }

  for (const quizRaw of asArray(course.course_quizzes)) {
    const quiz = asRecord(quizRaw)
    const quizId = quiz ? asNumberId(quiz.id) : asNumberId(quizRaw)
    if (!quizId) continue
    if (importedQuizIds.has(quizId)) {
      issues.push({
        code: "course-quiz-already-on-lesson",
        severity: "skipped",
        sourceId: quizId,
        detail: "Course-level quiz is the same record as a lesson quiz and was not imported twice.",
      })
      continue
    }
    issues.push({
      code: "course-quiz-without-lesson",
      severity: "unsupported",
      sourceId: quizId,
      detail: `Course-level quiz ${asString(quiz?.title)} is not attached to an imported lesson. Original JSON is unchanged on the export branch.`,
    })
  }

  const description = clip(asString(course.description_text) || asString(course.description_html).replace(/<[^>]+>/g, " "), DESCRIPTION_MAX)
  const materialsHtml = asString(course.materials_html).trim()
  const lessonCount = mappedLessons.length
  const estimatedDurationMinutes = Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.max(30, lessonCount * 8)))
  const openAccess = settings?.progression_disabled === true
  const content: CourseContent = {
    title,
    description,
    category: mapLearnDashCategory(categories, title),
    intendedRole: "DJ",
    experienceLevel: "custom",
    estimatedDurationMinutes,
    progression: {
      lessonAccess: openAccess ? "open" : "sequential",
      requireCompletionBeforeAdvance: !openAccess,
    },
    assessment: {
      quizGrading: "objective",
      writtenFeedback: "none",
      assignmentApproval: assignmentCount > 0 ? "human" : "none",
      submissionMode: "online",
      retryLimit: DEFAULT_RETRY_LIMIT,
      retryWaitHours: DEFAULT_RETRY_WAIT_HOURS,
      certificationRequirement: "none",
    },
    lessons: mappedLessons,
    extensions: defaultExtensions(),
    legacy: legacyRefFromSource(legacySourceId, contentVersion),
    ...(materialsHtml ? { materialsHtml } : {}),
  }

  issues.push({
    code: "intended-role-not-in-export",
    severity: "warning",
    sourceId: legacySourceId,
    detail: "LearnDash has no intended-role field. The course uses the library default role DJ.",
  })
  issues.push({
    code: "duration-estimated",
    severity: "warning",
    sourceId: legacySourceId,
    detail: `Estimated duration ${estimatedDurationMinutes} minutes is derived from lesson count, not a LearnDash field.`,
  })

  const parsed = parseCourseContent(content)
  if (!parsed) {
    const diagnosis = diagnoseCourseContent(content)
    issues.push({
      code: "content-failed-schema",
      severity: "failed",
      sourceId: legacySourceId,
      detail: `Mapped course did not pass parseCourseContent (${diagnosis}). Original export rows were not written.`,
    })
    return { error: `Course ${legacySourceId} (${title}) failed schema validation: ${diagnosis}`, issues }
  }

  return {
    masterCourseId,
    versionId,
    legacySourceId,
    slug,
    wordpressStatus,
    title,
    visibility: LEGACY_DEFAULT_MASTER_VISIBILITY,
    content: parsed,
    lessonCount,
    quizCount,
    questionCount,
    assignmentCount,
    videoCount,
    resourceCount,
    issues,
    identifiers,
  }
}

export function mapLegacyExport(
  document: unknown,
  options: { dryRun?: boolean; contentVersion?: string } = {},
): { mapped: LegacyMappedCourse[]; report: LegacyImportReport } {
  const root = asRecord(document) ?? {}
  const info = asRecord(root.export_info)
  const contentVersion = options.contentVersion ?? LEGACY_CONTENT_VERSION
  const skipped: LegacyImportIssue[] = []
  const mapped: LegacyMappedCourse[] = []

  for (const lesson of asArray(root.unassigned_lessons)) {
    const record = asRecord(lesson)
    const id = record ? asNumberId(record.id) ?? asString(record.slug) : "unknown"
    skipped.push({
      code: "unassigned-lesson",
      severity: "skipped",
      sourceId: id,
      detail: `${LEGACY_SKIP_UNASSIGNED_LESSONS}: ${asString(record?.title)} (course_id ${String(record?.course_id)}).`,
    })
  }
  for (const quiz of asArray(root.unassigned_quizzes)) {
    const record = asRecord(quiz)
    const id = record ? asNumberId(record.id) ?? asString(record.title) : "unknown"
    skipped.push({
      code: "unassigned-quiz",
      severity: "skipped",
      sourceId: id,
      detail: `${LEGACY_SKIP_UNASSIGNED_QUIZZES}: ${asString(record?.title)} (lesson_id ${String(record?.lesson_id)}, course_id ${String(record?.course_id)}).`,
    })
  }
  for (const submission of asArray(root.assignment_submissions)) {
    const record = asRecord(submission)
    const id = record ? asNumberId(record.id) ?? "unknown" : "unknown"
    skipped.push({
      code: "assignment-submission",
      severity: "skipped",
      sourceId: id,
      detail: `${LEGACY_SKIP_ASSIGNMENT_SUBMISSIONS} for lesson ${String(record?.lesson_id)} / author ${String(record?.author_id)} were not imported.`,
    })
  }
  skipped.push({
    code: "trainee-progress",
    severity: "skipped",
    sourceId: "progress",
    detail: LEGACY_SKIP_TRAINEE_PROGRESS,
  })

  const failedCourses: LegacyImportReport["courses"] = []
  for (const course of asArray(root.courses)) {
    const result = mapLegacyCourse(course, contentVersion)
    if ("error" in result) {
      failedCourses.push({
        masterCourseId: "",
        versionId: "",
        legacySourceId: asNumberId(asRecord(course)?.id) ?? "unknown",
        slug: asString(asRecord(course)?.slug),
        wordpressStatus: asString(asRecord(course)?.status),
        title: asString(asRecord(course)?.title) || "Untitled course",
        visibility: LEGACY_DEFAULT_MASTER_VISIBILITY,
        lessonCount: 0,
        quizCount: 0,
        questionCount: 0,
        assignmentCount: 0,
        videoCount: 0,
        resourceCount: 0,
        issues: result.issues.concat({
          code: "course-failed",
          severity: "failed",
          sourceId: asNumberId(asRecord(course)?.id) ?? "unknown",
          detail: result.error,
        }),
        identifiers: [],
        status: "failed",
        contentTitle: asString(asRecord(course)?.title),
      })
      continue
    }
    mapped.push(result)
  }

  const reportCourses: LegacyImportReport["courses"] = [
    ...mapped.map((course) => ({
      masterCourseId: course.masterCourseId,
      versionId: course.versionId,
      legacySourceId: course.legacySourceId,
      slug: course.slug,
      wordpressStatus: course.wordpressStatus,
      title: course.title,
      visibility: course.visibility,
      lessonCount: course.lessonCount,
      quizCount: course.quizCount,
      questionCount: course.questionCount,
      assignmentCount: course.assignmentCount,
      videoCount: course.videoCount,
      resourceCount: course.resourceCount,
      issues: course.issues,
      identifiers: course.identifiers,
      status: options.dryRun === false ? ("imported" as const) : ("dry_run" as const),
      contentTitle: course.content.title,
    })),
    ...failedCourses,
  ]

  const issueList = [...skipped, ...reportCourses.flatMap((course) => course.issues)]
  const report: LegacyImportReport = {
    engine: LEGACY_IMPORT_ENGINE,
    exportBranch: LEGACY_CANONICAL_EXPORT_BRANCH,
    canonicalExport: LEGACY_CANONICAL_EXPORT,
    exportGeneratedAt: asString(info?.generated_at) || null,
    exportSourceSite: asString(info?.source_site) || null,
    contentVersion,
    dryRun: options.dryRun !== false,
    courses: reportCourses,
    skipped,
    totals: {
      courses: mapped.length,
      lessons: mapped.reduce((sum, course) => sum + course.lessonCount, 0),
      quizzes: mapped.reduce((sum, course) => sum + course.quizCount, 0),
      questions: mapped.reduce((sum, course) => sum + course.questionCount, 0),
      assignments: mapped.reduce((sum, course) => sum + course.assignmentCount, 0),
      videos: mapped.reduce((sum, course) => sum + course.videoCount, 0),
      resources: mapped.reduce((sum, course) => sum + course.resourceCount, 0),
      unsupported: issueList.filter((issue) => issue.severity === "unsupported").length,
      skipped: issueList.filter((issue) => issue.severity === "skipped").length,
      failed: issueList.filter((issue) => issue.severity === "failed").length,
    },
  }
  return { mapped, report }
}

export function summarizeReport(report: LegacyImportReport): string {
  const lines = [
    `# Legacy curriculum import ${report.dryRun ? "dry run" : "apply"}`,
    "",
    `- Engine: ${report.engine}`,
    `- Export: ${report.canonicalExport} on ${report.exportBranch}`,
    `- Generated: ${report.exportGeneratedAt ?? "unknown"}`,
    `- Content version: ${report.contentVersion}`,
    `- Courses mapped: ${report.totals.courses}`,
    `- Lessons: ${report.totals.lessons}`,
    `- Quizzes: ${report.totals.quizzes}`,
    `- Questions: ${report.totals.questions}`,
    `- Assignments: ${report.totals.assignments}`,
    `- Videos: ${report.totals.videos}`,
    `- Resources: ${report.totals.resources}`,
    `- Unsupported: ${report.totals.unsupported}`,
    `- Skipped: ${report.totals.skipped}`,
    `- Failed: ${report.totals.failed}`,
    "",
    "## Courses",
  ]
  for (const course of report.courses) {
    lines.push(
      `- ${course.status} ${course.title} (LearnDash ${course.legacySourceId} → ${course.masterCourseId || "none"}): ${course.lessonCount} lessons, ${course.quizCount} quizzes, ${course.questionCount} questions, visibility ${course.visibility}`,
    )
  }
  return `${lines.join("\n")}\n`
}
