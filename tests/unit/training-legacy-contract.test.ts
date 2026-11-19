import { describe, expect, it } from "vitest"

import {
  importedMasterMustStayPrivate,
  LEGACY_DEFAULT_MASTER_VISIBILITY,
  LEGACY_DO_NOT_IMPORT,
  LEGACY_IMPORT_STATUS,
  mapLegacyCourseToPrivateMaster,
} from "@/lib/blueprint/training-legacy-contract"

describe("legacy training import contract", () => {
  it("keeps imported masters private and does not import trainee history", () => {
    expect(LEGACY_IMPORT_STATUS).toBe("local_cli")
    expect(LEGACY_DO_NOT_IMPORT).toContain("assignment_submissions")
    expect(LEGACY_DO_NOT_IMPORT).toContain("trainee accounts")
    expect(LEGACY_DO_NOT_IMPORT).not.toContain("full 242-lesson catalog on the first importer")
    const mapped = mapLegacyCourseToPrivateMaster({
      sourceId: "28417",
      contentVersion: "learndash-2026-08-03",
      title: "Beatmixing Basics",
      lessons: [
        { sourceId: "28477", title: "What is Beatmixing?" },
        { sourceId: "28479", title: "Upload a mix", assignment: { upload_enabled: true } },
      ],
    })
    expect(mapped.mapping.masterVisibility).toBe(LEGACY_DEFAULT_MASTER_VISIBILITY)
    expect(importedMasterMustStayPrivate(mapped.mapping.masterVisibility)).toBe(true)
    expect(mapped.content.legacy).toEqual({
      sourceId: "28417",
      contentVersion: "learndash-2026-08-03",
    })
    expect(mapped.content.lessons.map((lesson) => lesson.legacy.sourceId)).toEqual(["28477", "28479"])
  })
})
