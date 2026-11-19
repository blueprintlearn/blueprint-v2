import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"

import { emptyCourseContent, emptyPathContent } from "@/lib/blueprint/training-library"

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
import { querySql, querySqlJsonOn } from "./sql"

const COMPANY_COURSE_ID = "00000000-0000-4000-8000-0000000000c8"
const COMPANY_B_COURSE_ID = "00000000-0000-4000-8000-0000000000c9"
const COURSE_VERSION_ID = "00000000-0000-4000-8000-0000000000ca"
const DRAFT_VERSION_ID = "00000000-0000-4000-8000-0000000000cb"
const ATOMIC_MASTER_ID = "00000000-0000-4000-8000-0000000001a1"
const ATOMIC_MASTER_V1_ID = "00000000-0000-4000-8000-0000000001a2"
const ATOMIC_MASTER_V2_ID = "00000000-0000-4000-8000-0000000001a3"
const ATOMIC_COURSE_ID = "00000000-0000-4000-8000-0000000001b1"
const ATOMIC_COURSE_V1_ID = "00000000-0000-4000-8000-0000000001b2"
const ATOMIC_COURSE_V2_ID = "00000000-0000-4000-8000-0000000001b3"
const ATOMIC_PATH_ID = "00000000-0000-4000-8000-0000000001c1"
const ATOMIC_PATH_V1_ID = "00000000-0000-4000-8000-0000000001c2"
const ATOMIC_PATH_V2_ID = "00000000-0000-4000-8000-0000000001c3"
const COPY_COURSE_ID = "00000000-0000-4000-8000-0000000001d1"
const COPY_VERSION_ID = "00000000-0000-4000-8000-0000000001d2"
const COPY_DRAFT_ID = "00000000-0000-4000-8000-0000000001d3"
const COPY_ADOPT_ID = "00000000-0000-4000-8000-0000000001d4"

function dropFailPublishHook() {
  querySql(`
    drop trigger if exists training_library_test_fail_publish on public.training_master_course_versions;
    drop trigger if exists training_library_test_fail_publish on public.company_training_course_versions;
    drop trigger if exists training_library_test_fail_publish on public.company_training_path_versions;
    drop function if exists public.training_library_test_fail_publish();
  `)
}

function clear() {
  dropFailPublishHook()
  querySql(`
    delete from public.company_training_path_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_paths where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_course_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_courses where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.training_master_course_versions where course_id = '${ATOMIC_MASTER_ID}';
    delete from public.training_master_courses where id = '${ATOMIC_MASTER_ID}';
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

function pathContent(title: string) {
  return emptyPathContent(title)
}

type VersionStatusRow = { version: number; status: string }

function versionStatuses(table: string, parentColumn: string, parentId: string): VersionStatusRow[] {
  return querySqlJsonOn<VersionStatusRow[]>(
    "postgres",
    `
    select coalesce(
      json_agg(json_build_object('version', version, 'status', status) order by version),
      '[]'::json
    )
    from public.${table}
    where ${parentColumn} = '${parentId}';
  `,
  )
}

function installFailPublishHook(table: string, draftId: string) {
  dropFailPublishHook()
  querySql(`
    create function public.training_library_test_fail_publish()
    returns trigger
    language plpgsql
    as $fn$
    begin
      if new.id = '${draftId}'::uuid and new.status = 'published' then
        raise exception 'forced publish failure';
      end if;
      return new;
    end;
    $fn$;
    create trigger training_library_test_fail_publish
    before update on public.${table}
    for each row
    execute function public.training_library_test_fail_publish();
  `)
}

async function seedAtomicMaster() {
  const admin = await asUser(PLATFORM_ADMIN_EMAIL)
  const { error: courseError } = await admin.from("training_master_courses").insert({
    id: ATOMIC_MASTER_ID,
    title: "Atomic master",
    visibility: "private",
  })
  expect(courseError).toBeNull()
  const { error: publishedError } = await admin.from("training_master_course_versions").insert({
    id: ATOMIC_MASTER_V1_ID,
    course_id: ATOMIC_MASTER_ID,
    version: 1,
    status: "published",
    content: content("Atomic master v1"),
  })
  expect(publishedError).toBeNull()
  const { error: draftError } = await admin.from("training_master_course_versions").insert({
    id: ATOMIC_MASTER_V2_ID,
    course_id: ATOMIC_MASTER_ID,
    version: 2,
    status: "draft",
    content: content("Atomic master v2"),
  })
  expect(draftError).toBeNull()
  return admin
}

async function seedAtomicCompanyCourse() {
  const owner = await asUser(OWNER_A_EMAIL)
  const { error: courseError } = await owner.from("company_training_courses").insert({
    id: ATOMIC_COURSE_ID,
    company_id: COMPANY_A_ID,
    title: "Atomic course",
    origin: "original",
    library_status: "active",
  })
  expect(courseError).toBeNull()
  const { error: publishedError } = await owner.from("company_training_course_versions").insert({
    id: ATOMIC_COURSE_V1_ID,
    course_id: ATOMIC_COURSE_ID,
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    content: content("Atomic course v1"),
  })
  expect(publishedError).toBeNull()
  const { error: draftError } = await owner.from("company_training_course_versions").insert({
    id: ATOMIC_COURSE_V2_ID,
    course_id: ATOMIC_COURSE_ID,
    company_id: COMPANY_A_ID,
    version: 2,
    status: "draft",
    content: content("Atomic course v2"),
  })
  expect(draftError).toBeNull()
  return owner
}

async function seedAtomicPath() {
  const owner = await asUser(OWNER_A_EMAIL)
  const { error: pathError } = await owner.from("company_training_paths").insert({
    id: ATOMIC_PATH_ID,
    company_id: COMPANY_A_ID,
    title: "Atomic path",
    library_status: "active",
  })
  expect(pathError).toBeNull()
  const { error: publishedError } = await owner.from("company_training_path_versions").insert({
    id: ATOMIC_PATH_V1_ID,
    path_id: ATOMIC_PATH_ID,
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    content: pathContent("Atomic path v1"),
  })
  expect(publishedError).toBeNull()
  const { error: draftError } = await owner.from("company_training_path_versions").insert({
    id: ATOMIC_PATH_V2_ID,
    path_id: ATOMIC_PATH_ID,
    company_id: COMPANY_A_ID,
    version: 2,
    status: "draft",
    content: pathContent("Atomic path v2"),
  })
  expect(draftError).toBeNull()
  return owner
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

  it("publishes master, company course, and path versions in one step", async () => {
    const admin = await seedAtomicMaster()
    const owner = await seedAtomicCompanyCourse()
    await seedAtomicPath()

    const { error: masterError } = await admin.rpc("publish_training_version", {
      p_kind: "master_course",
      p_parent_id: ATOMIC_MASTER_ID,
      p_draft_id: ATOMIC_MASTER_V2_ID,
    })
    expect(masterError).toBeNull()
    expect(versionStatuses("training_master_course_versions", "course_id", ATOMIC_MASTER_ID)).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "published" },
    ])

    const { error: courseError } = await owner.rpc("publish_training_version", {
      p_kind: "company_course",
      p_parent_id: ATOMIC_COURSE_ID,
      p_draft_id: ATOMIC_COURSE_V2_ID,
    })
    expect(courseError).toBeNull()
    expect(versionStatuses("company_training_course_versions", "course_id", ATOMIC_COURSE_ID)).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "published" },
    ])

    const { error: pathError } = await owner.rpc("publish_training_version", {
      p_kind: "company_path",
      p_parent_id: ATOMIC_PATH_ID,
      p_draft_id: ATOMIC_PATH_V2_ID,
    })
    expect(pathError).toBeNull()
    expect(versionStatuses("company_training_path_versions", "path_id", ATOMIC_PATH_ID)).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "published" },
    ])
  })

  it("rolls back publish when the draft cannot become published", async () => {
    const admin = await seedAtomicMaster()
    const owner = await seedAtomicCompanyCourse()
    await seedAtomicPath()

    installFailPublishHook("training_master_course_versions", ATOMIC_MASTER_V2_ID)
    const { error: masterError } = await admin.rpc("publish_training_version", {
      p_kind: "master_course",
      p_parent_id: ATOMIC_MASTER_ID,
      p_draft_id: ATOMIC_MASTER_V2_ID,
    })
    expect(masterError?.message ?? "").toMatch(/forced publish failure/i)
    expect(versionStatuses("training_master_course_versions", "course_id", ATOMIC_MASTER_ID)).toEqual([
      { version: 1, status: "published" },
      { version: 2, status: "draft" },
    ])

    installFailPublishHook("company_training_course_versions", ATOMIC_COURSE_V2_ID)
    const { error: courseError } = await owner.rpc("publish_training_version", {
      p_kind: "company_course",
      p_parent_id: ATOMIC_COURSE_ID,
      p_draft_id: ATOMIC_COURSE_V2_ID,
    })
    expect(courseError?.message ?? "").toMatch(/forced publish failure/i)
    expect(versionStatuses("company_training_course_versions", "course_id", ATOMIC_COURSE_ID)).toEqual([
      { version: 1, status: "published" },
      { version: 2, status: "draft" },
    ])

    installFailPublishHook("company_training_path_versions", ATOMIC_PATH_V2_ID)
    const { error: pathError } = await owner.rpc("publish_training_version", {
      p_kind: "company_path",
      p_parent_id: ATOMIC_PATH_ID,
      p_draft_id: ATOMIC_PATH_V2_ID,
    })
    expect(pathError?.message ?? "").toMatch(/forced publish failure/i)
    expect(versionStatuses("company_training_path_versions", "path_id", ATOMIC_PATH_ID)).toEqual([
      { version: 1, status: "published" },
      { version: 2, status: "draft" },
    ])
  })

  it("keeps one published version when two publishes race", async () => {
    await seedAtomicMaster()
    await seedAtomicCompanyCourse()
    await seedAtomicPath()

    const masterResults = await Promise.all([
      (await asUser(PLATFORM_ADMIN_EMAIL)).rpc("publish_training_version", {
        p_kind: "master_course",
        p_parent_id: ATOMIC_MASTER_ID,
        p_draft_id: ATOMIC_MASTER_V2_ID,
      }),
      (await asUser(PLATFORM_ADMIN_EMAIL)).rpc("publish_training_version", {
        p_kind: "master_course",
        p_parent_id: ATOMIC_MASTER_ID,
        p_draft_id: ATOMIC_MASTER_V2_ID,
      }),
    ])
    expect(masterResults.filter((result) => result.error).length).toBe(1)
    expect(masterResults.filter((result) => result.error == null).length).toBe(1)
    expect(versionStatuses("training_master_course_versions", "course_id", ATOMIC_MASTER_ID)).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "published" },
    ])

    const courseResults = await Promise.all([
      (await asUser(OWNER_A_EMAIL)).rpc("publish_training_version", {
        p_kind: "company_course",
        p_parent_id: ATOMIC_COURSE_ID,
        p_draft_id: ATOMIC_COURSE_V2_ID,
      }),
      (await asUser(OWNER_A_EMAIL)).rpc("publish_training_version", {
        p_kind: "company_course",
        p_parent_id: ATOMIC_COURSE_ID,
        p_draft_id: ATOMIC_COURSE_V2_ID,
      }),
    ])
    expect(courseResults.filter((result) => result.error).length).toBe(1)
    expect(courseResults.filter((result) => result.error == null).length).toBe(1)
    expect(versionStatuses("company_training_course_versions", "course_id", ATOMIC_COURSE_ID)).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "published" },
    ])

    const pathResults = await Promise.all([
      (await asUser(OWNER_A_EMAIL)).rpc("publish_training_version", {
        p_kind: "company_path",
        p_parent_id: ATOMIC_PATH_ID,
        p_draft_id: ATOMIC_PATH_V2_ID,
      }),
      (await asUser(OWNER_A_EMAIL)).rpc("publish_training_version", {
        p_kind: "company_path",
        p_parent_id: ATOMIC_PATH_ID,
        p_draft_id: ATOMIC_PATH_V2_ID,
      }),
    ])
    expect(pathResults.filter((result) => result.error).length).toBe(1)
    expect(pathResults.filter((result) => result.error == null).length).toBe(1)
    expect(versionStatuses("company_training_path_versions", "path_id", ATOMIC_PATH_ID)).toEqual([
      { version: 1, status: "superseded" },
      { version: 2, status: "published" },
    ])
  })

  it("blocks owners and anonymous callers from publishing the wrong library", async () => {
    const admin = await seedAtomicMaster()
    const owner = await seedAtomicCompanyCourse()
    const anon = createAnonClient()

    const { error: ownerMaster } = await owner.rpc("publish_training_version", {
      p_kind: "master_course",
      p_parent_id: ATOMIC_MASTER_ID,
      p_draft_id: ATOMIC_MASTER_V2_ID,
    })
    expect(ownerMaster).toBeTruthy()
    expect(versionStatuses("training_master_course_versions", "course_id", ATOMIC_MASTER_ID)).toEqual([
      { version: 1, status: "published" },
      { version: 2, status: "draft" },
    ])

    const { error: adminCourse } = await admin.rpc("publish_training_version", {
      p_kind: "company_course",
      p_parent_id: ATOMIC_COURSE_ID,
      p_draft_id: ATOMIC_COURSE_V2_ID,
    })
    expect(adminCourse).toBeTruthy()
    expect(versionStatuses("company_training_course_versions", "course_id", ATOMIC_COURSE_ID)).toEqual([
      { version: 1, status: "published" },
      { version: 2, status: "draft" },
    ])

    const { error: anonPublish } = await anon.rpc("publish_training_version", {
      p_kind: "company_course",
      p_parent_id: ATOMIC_COURSE_ID,
      p_draft_id: ATOMIC_COURSE_V2_ID,
    })
    expect(anonPublish).toBeTruthy()
  })

  it.each(["archived", "private"] as const)(
    "lets a company keep editing, publishing, and archiving a copy after the master is %s",
    async (visibility) => {
      const owner = await asUser(OWNER_A_EMAIL)
      const admin = await asUser(PLATFORM_ADMIN_EMAIL)
      const { data: master } = await owner
        .from("training_master_course_versions")
        .select("version, content")
        .eq("course_id", MASTER_STARTER_ID)
        .eq("status", "published")
        .single()
      expect(master?.version).toBe(1)
      const copy = structuredClone(master?.content)
      if (!copy || typeof copy !== "object") throw new Error("missing master content")

      const { error: insertCourse } = await owner.from("company_training_courses").insert({
        id: COPY_COURSE_ID,
        company_id: COMPANY_A_ID,
        title: "MC Foundations",
        origin: "adopted",
        source_master_course_id: MASTER_STARTER_ID,
        source_master_version: master?.version,
        library_status: "active",
      })
      expect(insertCourse).toBeNull()
      const { error: insertVersion } = await owner.from("company_training_course_versions").insert({
        id: COPY_VERSION_ID,
        course_id: COPY_COURSE_ID,
        company_id: COMPANY_A_ID,
        version: 1,
        status: "published",
        content: copy,
      })
      expect(insertVersion).toBeNull()

      const { error: hideMaster } = await admin
        .from("training_master_courses")
        .update({ visibility })
        .eq("id", MASTER_STARTER_ID)
      expect(hideMaster).toBeNull()

      const { data: catalog } = await owner.from("training_master_courses").select("id")
      expect(catalog ?? []).toEqual([])

      const { error: rename } = await owner
        .from("company_training_courses")
        .update({ title: "Company MC after hide" })
        .eq("id", COPY_COURSE_ID)
      expect(rename).toBeNull()

      const { error: draft } = await owner.from("company_training_course_versions").insert({
        id: COPY_DRAFT_ID,
        course_id: COPY_COURSE_ID,
        company_id: COMPANY_A_ID,
        version: 2,
        status: "draft",
        content: content("Company MC after hide"),
      })
      expect(draft).toBeNull()

      const { error: published } = await owner.rpc("publish_training_version", {
        p_kind: "company_course",
        p_parent_id: COPY_COURSE_ID,
        p_draft_id: COPY_DRAFT_ID,
      })
      expect(published).toBeNull()
      expect(versionStatuses("company_training_course_versions", "course_id", COPY_COURSE_ID)).toEqual([
        { version: 1, status: "superseded" },
        { version: 2, status: "published" },
      ])

      const { error: archiveCopy } = await owner
        .from("company_training_courses")
        .update({ library_status: "archived" })
        .eq("id", COPY_COURSE_ID)
      expect(archiveCopy).toBeNull()

      const { error: adoptUpdate } = await owner
        .from("company_training_courses")
        .update({ source_master_version: 2 })
        .eq("id", COPY_COURSE_ID)
      expect(adoptUpdate?.message ?? "").toMatch(/starter master courses/i)

      const { error: adoptAgain } = await owner.from("company_training_courses").insert({
        id: COPY_ADOPT_ID,
        company_id: COMPANY_A_ID,
        title: "Should not adopt",
        origin: "adopted",
        source_master_course_id: MASTER_STARTER_ID,
        source_master_version: 1,
        library_status: "active",
      })
      expect(adoptAgain?.message ?? "").toMatch(/starter master courses/i)

      const { data: copyRow } = await owner
        .from("company_training_courses")
        .select("title, library_status, source_master_version")
        .eq("id", COPY_COURSE_ID)
        .single()
      expect(copyRow).toMatchObject({
        title: "Company MC after hide",
        library_status: "archived",
        source_master_version: 1,
      })
    },
  )
})
