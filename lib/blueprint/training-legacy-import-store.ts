import type { createClient } from "@/lib/supabase/server"
import {
  importedMasterMustStayPrivate,
  LEGACY_DEFAULT_MASTER_VISIBILITY,
} from "@/lib/blueprint/training-legacy-contract"
import {
  mapLegacyExport,
  type LegacyIdentifierRow,
  type LegacyImportIssue,
  type LegacyImportReport,
  type LegacyMappedCourse,
} from "@/lib/blueprint/training-legacy-import"
import { parseCourseContent } from "@/lib/blueprint/training-library"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>
type Client = Awaited<ReturnType<typeof createClient>>

export type LegacyImportApplyResult = {
  report: LegacyImportReport
  identifiers: LegacyIdentifierRow[]
}

function isUniqueViolation(message: string | undefined): boolean {
  return Boolean(message && (message.includes("duplicate key") || message.includes("unique")))
}

async function loadExistingByLegacyId(client: Client, legacySourceId: string) {
  const { data, error } = await client
    .from("training_master_courses")
    .select("id, title, visibility, legacy_source_id, legacy_content_version")
    .eq("legacy_source_id", legacySourceId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const { data: versions, error: versionError } = await client
    .from("training_master_course_versions")
    .select("id, version, status, content")
    .eq("course_id", data.id)
    .order("version", { ascending: false })
  if (versionError) throw new Error(versionError.message)
  return { course: data, versions: versions ?? [] }
}

export async function applyMappedLegacyCourse(
  client: Client,
  mapped: LegacyMappedCourse,
  publishedBy: string | null,
): Promise<{ status: "imported" | "unchanged" | "failed"; issues: LegacyImportIssue[] }> {
  if (!importedMasterMustStayPrivate(mapped.visibility) || mapped.visibility !== LEGACY_DEFAULT_MASTER_VISIBILITY) {
    return {
      status: "failed",
      issues: [
        {
          code: "visibility-not-private",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: "Importer refused to write a non-private master course.",
        },
      ],
    }
  }
  const parsed = parseCourseContent(mapped.content)
  if (!parsed) {
    return {
      status: "failed",
      issues: [
        {
          code: "content-failed-schema",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: "Mapped course failed parseCourseContent before write.",
        },
      ],
    }
  }

  const existing = await loadExistingByLegacyId(client, mapped.legacySourceId)
  if (existing) {
    if (existing.course.visibility !== "private") {
      return {
        status: "failed",
        issues: [
          {
            code: "existing-not-private",
            severity: "failed",
            sourceId: mapped.legacySourceId,
            detail: `Existing master ${existing.course.id} is ${existing.course.visibility}; importer will not change visibility or duplicate it.`,
          },
        ],
      }
    }
    const sameVersion = existing.course.legacy_content_version === parsed.legacy.contentVersion
    if (sameVersion) {
      return { status: "unchanged", issues: [] }
    }
    return {
      status: "failed",
      issues: [
        {
          code: "existing-original-preserved",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: `A private master already exists for LearnDash ${mapped.legacySourceId} at version ${existing.course.legacy_content_version}. The importer will not overwrite that original snapshot.`,
        },
      ],
    }
  }

  const { error: courseError } = await client.from("training_master_courses").insert({
    id: mapped.masterCourseId,
    title: parsed.title,
    visibility: LEGACY_DEFAULT_MASTER_VISIBILITY,
    legacy_source_id: parsed.legacy.sourceId,
    legacy_content_version: parsed.legacy.contentVersion,
  })
  if (courseError) {
    if (isUniqueViolation(courseError.message)) {
      return { status: "unchanged", issues: [] }
    }
    return {
      status: "failed",
      issues: [
        {
          code: "course-insert-failed",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: courseError.message,
        },
      ],
    }
  }

  const { error: versionError } = await client.from("training_master_course_versions").insert({
    id: mapped.versionId,
    course_id: mapped.masterCourseId,
    version: 1,
    status: "published",
    content: parsed as unknown as JsonValue,
    published_by: publishedBy,
  })
  if (versionError) {
    const { error: rollbackError } = await client.from("training_master_courses").delete().eq("id", mapped.masterCourseId)
    return {
      status: "failed",
      issues: [
        {
          code: "version-insert-failed",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: versionError.message,
        },
        ...(rollbackError
          ? [
              {
                code: "rollback-failed",
                severity: "failed" as const,
                sourceId: mapped.legacySourceId,
                detail: rollbackError.message,
              },
            ]
          : [
              {
                code: "rolled-back",
                severity: "warning" as const,
                sourceId: mapped.legacySourceId,
                detail: "Course row deleted after version insert failed.",
              },
            ]),
      ],
    }
  }
  return { status: "imported", issues: [] }
}

export async function importLegacyCurriculum(
  client: Client,
  document: unknown,
  options: { dryRun?: boolean; publishedBy?: string | null } = {},
): Promise<LegacyImportApplyResult> {
  const dryRun = options.dryRun !== false
  const { mapped, report } = mapLegacyExport(document, { dryRun })
  if (dryRun) {
    return { report, identifiers: mapped.flatMap((course) => course.identifiers) }
  }
  if (!options.publishedBy) {
    throw new Error("Applying the import requires a platform-admin publishedBy user id so the original snapshot can freeze as a private published version.")
  }

  const courses: LegacyImportReport["courses"] = []
  for (const course of report.courses) {
    if (course.status === "failed") {
      courses.push(course)
      continue
    }
    const mappedCourse = mapped.find((item) => item.legacySourceId === course.legacySourceId)
    if (!mappedCourse) {
      courses.push({ ...course, status: "failed" })
      continue
    }
    const applied = await applyMappedLegacyCourse(client, mappedCourse, options.publishedBy)
    courses.push({
      ...course,
      status: applied.status,
      issues: [...course.issues, ...applied.issues],
    })
  }

  const issueList = [...report.skipped, ...courses.flatMap((course) => course.issues)]
  return {
    report: {
      ...report,
      dryRun: false,
      courses,
      totals: {
        ...report.totals,
        courses: courses.filter((course) => course.status === "imported" || course.status === "unchanged").length,
        failed: issueList.filter((issue) => issue.severity === "failed").length,
        unsupported: issueList.filter((issue) => issue.severity === "unsupported").length,
        skipped: issueList.filter((issue) => issue.severity === "skipped").length,
      },
    },
    identifiers: mapped.flatMap((course) => course.identifiers),
  }
}
