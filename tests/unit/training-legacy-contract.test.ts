import { describe, expect, it } from "vitest"

import {
  importedMasterMustStayPrivate,
  LEGACY_DEFAULT_MASTER_VISIBILITY,
  LEGACY_IMPORT_STATUS,
  mapLegacyCourseToPrivateMaster,
} from "@/lib/blueprint/training-legacy-contract"

describe("legacy training import contract", () => {
  it("maps a course to a private master snapshot and keeps source ids", () => {
    expect(LEGACY_IMPORT_STATUS).toBe("not_enabled")
    const mapped = mapLegacyCourseToPrivateMaster({
      sourceId: "beatmixing-basics",
      contentVersion: "learndash-2026-08-03",
      title: "Beatmixing Basics",
      lessons: [
        { sourceId: "ld-lesson-phrase-matching", title: "Phrase matching", quiz: { id: "q1" } },
        { sourceId: "ld-lesson-upload", title: "Upload a mix", assignment: { upload_enabled: true } },
      ],
    })
    expect(mapped.mapping.masterVisibility).toBe(LEGACY_DEFAULT_MASTER_VISIBILITY)
    expect(importedMasterMustStayPrivate(mapped.mapping.masterVisibility)).toBe(true)
    expect(mapped.content.legacy).toEqual({
      sourceId: "beatmixing-basics",
      contentVersion: "learndash-2026-08-03",
    })
    expect(mapped.content.lessons.map((lesson) => lesson.legacy.sourceId)).toEqual([
      "ld-lesson-phrase-matching",
      "ld-lesson-upload",
    ])
    expect(mapped.mapping.skipped).toEqual([
      "quiz:ld-lesson-phrase-matching:deferred-full-question-map",
      "assignment-files:ld-lesson-upload:not-imported",
    ])
  })
})
