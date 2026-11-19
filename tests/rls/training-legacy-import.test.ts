import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { legacyUuid } from "@/lib/blueprint/training-legacy-ids"
import { mapLegacyExport } from "@/lib/blueprint/training-legacy-import"
import { applyMappedLegacyCourse, importLegacyCurriculum } from "@/lib/blueprint/training-legacy-import-store"

import fixture from "../fixtures/legacy-curriculum-subset.json"
import { asUser, OWNER_A_EMAIL, PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_ID } from "./helpers"
import { querySql } from "./sql"

const COURSE_A = legacyUuid("course", "90001")
const COURSE_B = legacyUuid("course", "90002")
const document = fixture as typeof fixture & { courses: unknown[] }

function clearImported() {
  querySql(`
    delete from public.training_master_course_versions where course_id in ('${COURSE_A}', '${COURSE_B}');
    delete from public.training_master_courses where id in ('${COURSE_A}', '${COURSE_B}');
    delete from public.training_master_courses where legacy_source_id in ('90001', '90002');
    drop trigger if exists training_legacy_test_fail_version on public.training_master_course_versions;
    drop function if exists public.training_legacy_test_fail_version();
  `)
}

beforeEach(clearImported)
afterAll(clearImported)

describe("legacy curriculum import RLS", () => {
  it("writes private masters, keeps owners out, and stays idempotent", async () => {
    const admin = await asUser(PLATFORM_ADMIN_EMAIL)
    const first = await importLegacyCurriculum(admin, document, {
      dryRun: false,
      publishedBy: PLATFORM_ADMIN_ID,
    })
    expect(first.report.courses.map((course) => course.status).sort()).toEqual(["imported", "imported"])
    expect(first.report.courses.every((course) => course.visibility === "private")).toBe(true)

    const { data: rows } = await admin
      .from("training_master_courses")
      .select("id, title, visibility, legacy_source_id")
      .in("id", [COURSE_A, COURSE_B])
      .order("title")
    expect(rows).toEqual([
      { id: COURSE_A, title: "Fixture Mix Lab", visibility: "private", legacy_source_id: "90001" },
      { id: COURSE_B, title: "Onboarding Quiz Lab", visibility: "private", legacy_source_id: "90002" },
    ])

    const { data: quizVersion } = await admin
      .from("training_master_course_versions")
      .select("status, content, published_by")
      .eq("course_id", COURSE_B)
      .single()
    expect(quizVersion?.status).toBe("published")
    expect(quizVersion?.published_by).toBe(PLATFORM_ADMIN_ID)
    const content = quizVersion?.content as { lessons: Array<{ title: string; blocks: Array<Record<string, unknown>> }> }
    expect(content.lessons[0]?.title).toBe("Strategic steps")
    const quiz = content.lessons[0]?.blocks.find((block) => block.type === "quiz") as {
      questions: Array<{ options: Array<{ label: string; correct: boolean }> }>
    }
    expect(quiz.questions[0]?.options.map((option) => option.correct)).toEqual([false, true, false, false])

    const second = await importLegacyCurriculum(admin, document, {
      dryRun: false,
      publishedBy: PLATFORM_ADMIN_ID,
    })
    expect(second.report.courses.map((course) => course.status).sort()).toEqual(["unchanged", "unchanged"])
    const { count } = await admin
      .from("training_master_courses")
      .select("id", { count: "exact", head: true })
      .in("legacy_source_id", ["90001", "90002"])
    expect(count).toBe(2)

    const owner = await asUser(OWNER_A_EMAIL)
    const { data: ownerRows } = await owner.from("training_master_courses").select("id, title").in("id", [COURSE_A, COURSE_B])
    expect(ownerRows).toEqual([])
    const { data: ownerVersions } = await owner
      .from("training_master_course_versions")
      .select("id")
      .eq("course_id", COURSE_A)
    expect(ownerVersions).toEqual([])
    const { data: ownerAttempt } = await owner
      .from("training_master_courses")
      .update({ visibility: "starter" })
      .eq("id", COURSE_A)
      .select("id")
    expect(ownerAttempt).toEqual([])
  })

  it("rolls back the course row when the version insert fails", async () => {
    const admin = await asUser(PLATFORM_ADMIN_EMAIL)
    const { mapped } = mapLegacyExport(document, { dryRun: true })
    const mix = mapped.find((course) => course.legacySourceId === "90001")
    if (!mix) throw new Error("expected mix course")
    querySql(`
      create function public.training_legacy_test_fail_version()
      returns trigger
      language plpgsql
      as $fn$
      begin
        if new.course_id = '${COURSE_A}'::uuid then
          raise exception 'forced version failure';
        end if;
        return new;
      end;
      $fn$;
      create trigger training_legacy_test_fail_version
      before insert on public.training_master_course_versions
      for each row
      execute function public.training_legacy_test_fail_version();
    `)
    const result = await applyMappedLegacyCourse(admin, mix, PLATFORM_ADMIN_ID)
    expect(result.status).toBe("failed")
    expect(result.issues.some((issue) => issue.code === "version-insert-failed")).toBe(true)
    expect(result.issues.some((issue) => issue.code === "rolled-back")).toBe(true)
    const { data } = await admin.from("training_master_courses").select("id").eq("id", COURSE_A)
    expect(data).toEqual([])
  })
})
