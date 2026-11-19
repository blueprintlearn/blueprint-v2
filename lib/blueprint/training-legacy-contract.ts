/**
 * Mapping contract for a later legacy Blueprint import. Stage 4.1 does not
 * import production content. Inspect the actual export before writing an importer.
 */

import { emptyCourseContent, type CourseContent, type LegacyRef } from "@/lib/blueprint/training-library"

export const LEGACY_IMPORT_STATUS = "not_enabled" as const
export const LEGACY_DEFAULT_MASTER_VISIBILITY = "private" as const
export const LEGACY_CANONICAL_EXPORT = "scripts/data/learndash-export-production.json" as const
export const LEGACY_CANONICAL_EXPORT_BRANCH = "curriculum-learndash-export" as const
export const LEGACY_EXPORT_DATE = "2026-08-03" as const

export const LEGACY_DO_NOT_IMPORT = [
  "assignment_submissions",
  "unassigned lessons",
  "unassigned quizzes",
  "full 242-lesson catalog on the first importer",
  "trainee accounts",
  "lesson completion history",
  "quiz attempts",
  "assignment history files",
] as const

export type LegacyCourseSource = {
  sourceId: string
  contentVersion: string
  title: string
  status?: string
  lessons?: LegacyLessonSource[]
}

export type LegacyLessonSource = {
  sourceId: string
  contentVersion?: string
  title: string
  media?: { vimeo?: { url: string }[] }
  quiz?: unknown
  assignment?: { upload_enabled?: boolean }
}

export type LegacyImportMapping = {
  masterVisibility: typeof LEGACY_DEFAULT_MASTER_VISIBILITY
  courseLegacy: LegacyRef
  lessonLegacy: LegacyRef[]
  skipped: string[]
}

export const LEGACY_FIELD_MAP = {
  course: "training_master_courses + training_master_course_versions.content",
  lesson: "CourseContent.lessons[], ordered",
  "media.vimeo[]": "video block url; do not rewrite player URLs",
  "quiz + questions": "quiz block; keep correct flags inside the version snapshot",
  "assignment.upload_enabled": "assignment block, no learner files",
  "course status: private": "master visibility private",
  "course / lesson / quiz / assignment ids": "legacy.sourceId",
  "export generation / post modified": "legacy.contentVersion",
} as const

export function legacyRefFromSource(sourceId: string, contentVersion = `learndash-${LEGACY_EXPORT_DATE}`): LegacyRef {
  return { sourceId, contentVersion }
}

export function mapLegacyCourseToPrivateMaster(source: LegacyCourseSource): { content: CourseContent; mapping: LegacyImportMapping } {
  const content = emptyCourseContent(source.title)
  content.legacy = legacyRefFromSource(source.sourceId, source.contentVersion)
  const lessonLegacy: LegacyRef[] = []
  const skipped: string[] = []
  for (const lesson of source.lessons ?? []) {
    content.lessons.push({
      id: crypto.randomUUID(),
      title: lesson.title,
      description: "",
      completion: { requireAllBlocks: true, requiredBlockIds: [] },
      progression: { lockedUntilPreviousComplete: true },
      blocks: [],
      legacy: legacyRefFromSource(lesson.sourceId, lesson.contentVersion ?? source.contentVersion),
    })
    lessonLegacy.push(legacyRefFromSource(lesson.sourceId, lesson.contentVersion ?? source.contentVersion))
    if (lesson.quiz) skipped.push(`quiz:${lesson.sourceId}:deferred-full-question-map`)
    if (lesson.assignment?.upload_enabled) skipped.push(`assignment-files:${lesson.sourceId}:not-imported`)
  }
  return {
    content,
    mapping: {
      masterVisibility: LEGACY_DEFAULT_MASTER_VISIBILITY,
      courseLegacy: content.legacy,
      lessonLegacy,
      skipped,
    },
  }
}

export function importedMasterMustStayPrivate(visibility: string): boolean {
  return visibility === LEGACY_DEFAULT_MASTER_VISIBILITY
}
