import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"

import { emptyCourseContent } from "@/lib/blueprint/training-library"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  MANAGER_A_EMAIL,
  MASTER_ARCHIVED_ID,
  MASTER_PRIVATE_ID,
  MASTER_STARTER_ID,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
  PLATFORM_ADMIN_EMAIL,
} from "./helpers"
import { querySql } from "./sql"

const COMPANY_COURSE_ID = "00000000-0000-4000-8000-0000000000c8"
const COMPANY_B_COURSE_ID = "00000000-0000-4000-8000-0000000000c9"
const COURSE_VERSION_ID = "00000000-0000-4000-8000-0000000000ca"
const DRAFT_VERSION_ID = "00000000-0000-4000-8000-0000000000cb"

function clear() {
  querySql(`
    delete from public.company_training_path_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_paths where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_course_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_courses where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
  `)
}

beforeEach(clear)
afterAll(clear)
afterEach(() => {
  querySql(`
    update public.training_master_courses set visibility = 'private' where id = '${MASTER_PRIVATE_ID}';
    update public.training_master_courses set visibility = 'starter' where id = '${MASTER_STARTER_ID}';
    update public.training_master_courses set visibility = 'archived' where id = '${MASTER_ARCHIVED_ID}';
  `)
})

function content(title: string) {
  return emptyCourseContent(title)
}

describe("training library RLS", () => {
  it("hides private and archived master courses from company owners", async () => {
    const owner = await asUser(OWNER_A_EMAIL)
    const { data } = await owner.from("training_master_courses").select("id, title, visibility").order("title")
    expect(data?.map((row) => row.id).sort()).toEqual([MASTER_STARTER_ID])
    const { data: privateRow } = await owner
      .from("training_master_courses")
      .select("id")
      .eq("id", MASTER_PRIVATE_ID)
      .maybeSingle()
    expect(privateRow).toBeNull()
    const { data: archived } = await owner
      .from("training_master_courses")
      .select("id")
      .eq("id", MASTER_ARCHIVED_ID)
      .maybeSingle()
    expect(archived).toBeNull()
    const { data: privateVersion } = await owner
      .from("training_master_course_versions")
      .select("id, content")
      .eq("course_id", MASTER_PRIVATE_ID)
    expect(privateVersion).toEqual([])
  })

  it("lets a platform administrator see private master content and change starter visibility", async () => {
    const admin = await asUser(PLATFORM_ADMIN_EMAIL)
    const { data } = await admin.from("training_master_courses").select("id, visibility")
    const visibilities = Object.fromEntries((data ?? []).map((row) => [row.id, row.visibility]))
    expect(visibilities[MASTER_PRIVATE_ID]).toBe("private")
    expect(visibilities[MASTER_STARTER_ID]).toBe("starter")
    expect(visibilities[MASTER_ARCHIVED_ID]).toBe("archived")
    const { data: privateVersion } = await admin
      .from("training_master_course_versions")
      .select("content")
      .eq("course_id", MASTER_PRIVATE_ID)
      .single()
    expect(privateVersion?.content).toMatchObject({ title: "Legacy Beatmixing (import)" })
    const { error } = await admin
      .from("training_master_courses")
      .update({ visibility: "private" })
      .eq("id", MASTER_STARTER_ID)
    expect(error).toBeNull()
    const { error: restore } = await admin
      .from("training_master_courses")
      .update({ visibility: "starter" })
      .eq("id", MASTER_STARTER_ID)
    expect(restore).toBeNull()
  })

  it("blocks company owners from publishing master content or becoming platform admins", async () => {
    const owner = await asUser(OWNER_A_EMAIL)
    const { data: updated, error: visibility } = await owner
      .from("training_master_courses")
      .update({ visibility: "starter" })
      .eq("id", MASTER_PRIVATE_ID)
      .select("id")
    expect(visibility).toBeNull()
    expect(updated).toEqual([])
    const { error: insertAdmin } = await owner.from("training_platform_admins").insert({ user_id: "00000000-0000-4000-8000-0000000000a2" })
    expect(insertAdmin).toBeTruthy()
    const admin = await asUser(PLATFORM_ADMIN_EMAIL)
    const { data: privateCourse } = await admin
      .from("training_master_courses")
      .select("visibility")
      .eq("id", MASTER_PRIVATE_ID)
      .single()
    expect(privateCourse?.visibility).toBe("private")
    const manager = await asUser(MANAGER_A_EMAIL)
    const { data: starter } = await manager.from("training_master_courses").select("id")
    expect(starter).toEqual([])
  })

  it("copies starter content into a company course without changing the master", async () => {
    const owner = await asUser(OWNER_A_EMAIL)
    const { data: master } = await owner
      .from("training_master_course_versions")
      .select("version, content")
      .eq("course_id", MASTER_STARTER_ID)
      .eq("status", "published")
      .single()
    expect(master?.content).toMatchObject({ title: "MC Foundations" })
    const copy = structuredClone(master?.content)
    if (!copy || typeof copy !== "object") throw new Error("missing master content")
    const { error: insertCourse } = await owner.from("company_training_courses").insert({
      id: COMPANY_COURSE_ID,
      company_id: COMPANY_A_ID,
      title: "MC Foundations",
      origin: "adopted",
      source_master_course_id: MASTER_STARTER_ID,
      source_master_version: master?.version,
      library_status: "active",
    })
    expect(insertCourse).toBeNull()
    const { error: insertVersion } = await owner.from("company_training_course_versions").insert({
      id: COURSE_VERSION_ID,
      course_id: COMPANY_COURSE_ID,
      company_id: COMPANY_A_ID,
      version: 1,
      status: "published",
      content: copy,
    })
    expect(insertVersion).toBeNull()
    const customized = content("Company MC")
    const { error: draft } = await owner.from("company_training_course_versions").insert({
      id: DRAFT_VERSION_ID,
      course_id: COMPANY_COURSE_ID,
      company_id: COMPANY_A_ID,
      version: 2,
      status: "draft",
      content: customized,
    })
    expect(draft).toBeNull()
    const { data: masterAgain } = await owner
      .from("training_master_course_versions")
      .select("content")
      .eq("course_id", MASTER_STARTER_ID)
      .eq("status", "published")
      .single()
    expect(masterAgain?.content).toMatchObject({ title: "MC Foundations" })
    const { error: freeze } = await owner
      .from("company_training_course_versions")
      .update({ content: customized })
      .eq("id", COURSE_VERSION_ID)
    expect(freeze?.message ?? "").toMatch(/read-only/i)
  })

  it("isolates company libraries and does not create enrollment tables", async () => {
    querySql(`
      insert into public.company_training_courses (
        id, company_id, title, origin, library_status
      ) values (
        '${COMPANY_B_COURSE_ID}', '${COMPANY_B_ID}', 'Secret course', 'original', 'active'
      );
    `)
    const ownerA = await asUser(OWNER_A_EMAIL)
    const { data } = await ownerA.from("company_training_courses").select("id, title")
    expect(data ?? []).toEqual([])
    const ownerB = await asUser(OWNER_B_EMAIL)
    const { data: bRows } = await ownerB.from("company_training_courses").select("id")
    expect(bRows ?? []).toEqual([])
    const admin = await asUser(PLATFORM_ADMIN_EMAIL)
    const { data: adminRows } = await admin.from("company_training_courses").select("id")
    expect(adminRows ?? []).toEqual([])
    const tables = querySql(`
      select tablename from pg_tables
      where schemaname = 'public'
        and tablename in (
          'company_training_enrollments',
          'company_training_progress',
          'company_training_submissions',
          'company_training_certificates'
        );
    `)
    expect(tables).not.toMatch(/company_training_enrollments|company_training_progress|company_training_submissions|company_training_certificates/)
    const anon = createAnonClient()
    const { data: anonMaster } = await anon.from("training_master_courses").select("id")
    expect(anonMaster ?? []).toEqual([])
  })
})
