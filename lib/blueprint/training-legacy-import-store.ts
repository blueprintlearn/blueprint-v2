import type { createClient } from "@/lib/supabase/server"
import {
  importedMasterMustStayPrivate,
  LEGACY_DEFAULT_MASTER_VISIBILITY,
} from "@/lib/blueprint/training-legacy-contract"
import {
  type LegacyIdentifierRow,
  type LegacyImportIssue,
  type LegacyImportReport,
  type LegacyMappedCourse,
  mapLegacyExport,
} from "@/lib/blueprint/training-legacy-import"
import { parseCourseContent } from "@/lib/blueprint/training-library"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>
type Client = Awaited<ReturnType<typeof createClient>>

export type LegacyImportApplyResult = {
  report: LegacyImportReport
  identifiers: LegacyIdentifierRow[]
}

export type LegacyImportWriteStatus = "imported" | "unchanged" | "failed"

const LEGACY_IMPORT_ERROR_CODES = [
  "not-admin",
  "arguments-required",
  "published-by-mismatch",
  "published-by-not-admin",
  "content-not-object",
  "existing-not-private",
  "legacy-id-collision",
  "content-drift",
  "race",
] as const

export function legacyImportIssueFromMessage(message: string, sourceId: string): LegacyImportIssue {
  const matched = LEGACY_IMPORT_ERROR_CODES.find((code) => message.includes(`legacy-import:${code}`))
  return {
    code: matched ?? "import-failed",
    severity: "failed",
    sourceId,
    detail: message,
  }
}

export async function applyMappedLegacyCourse(
  client: Client,
  mapped: LegacyMappedCourse,
  publishedBy: string | null,
): Promise<{ status: LegacyImportWriteStatus; issues: LegacyImportIssue[] }> {
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
  if (!publishedBy) {
    return {
      status: "failed",
      issues: [
        {
          code: "published-by-required",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: "Applying the import requires a platform-admin publishedBy user id so the original snapshot can freeze as a private published version.",
        },
      ],
    }
  }
  const legacySourceId = parsed.legacy.sourceId
  const legacyContentVersion = parsed.legacy.contentVersion
  if (!legacySourceId || !legacyContentVersion) {
    return {
      status: "failed",
      issues: [
        {
          code: "content-failed-schema",
          severity: "failed",
          sourceId: mapped.legacySourceId,
          detail: "Mapped course is missing legacy source id or content version.",
        },
      ],
    }
  }

  const { data, error } = await client.rpc("import_legacy_master_course", {
    p_course_id: mapped.masterCourseId,
    p_title: parsed.title,
    p_legacy_source_id: legacySourceId,
    p_legacy_content_version: legacyContentVersion,
    p_version_id: mapped.versionId,
    p_content: parsed as unknown as JsonValue,
    p_published_by: publishedBy,
  })
  if (error) {
    return { status: "failed", issues: [legacyImportIssueFromMessage(error.message, mapped.legacySourceId)] }
  }
  if (data === "unchanged") return { status: "unchanged", issues: [] }
  if (data === "imported") return { status: "imported", issues: [] }
  return {
    status: "failed",
    issues: [
      {
        code: "import-failed",
        severity: "failed",
        sourceId: mapped.legacySourceId,
        detail: `Importer returned unexpected status ${String(data)}.`,
      },
    ],
  }
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
