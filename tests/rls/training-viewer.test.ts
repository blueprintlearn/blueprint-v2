import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { emptyCourseContent, emptyLesson, emptyPathContent } from "@/lib/blueprint/training-library"
import { jsonContainsQuizAnswerKeys } from "@/lib/blueprint/training-viewer"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  INACTIVE_A_EMAIL,
  INACTIVE_A_ID,
  MANAGER_A_EMAIL,
  MANAGER_A_ID,
  OWNER_A_EMAIL,
  OWNER_A_ID,
  OWNER_B_EMAIL,
  OWNER_B_ID,
} from "./helpers"
import { querySql, querySqlJsonOn } from "./sql"

const COURSE_ID = "00000000-0000-4000-8000-0000000003c1"
const COURSE_V1_ID = "00000000-0000-4000-8000-0000000003c2"
const COURSE_V2_ID = "00000000-0000-4000-8000-0000000003c3"
const PATH_ID = "00000000-0000-4000-8000-0000000003c4"
const PATH_V1_ID = "00000000-0000-4000-8000-0000000003c5"
const B_COURSE_ID = "00000000-0000-4000-8000-0000000003c8"
const B_VERSION_ID = "00000000-0000-4000-8000-0000000003c9"
const B_ENROLLMENT_ID = "00000000-0000-4000-8000-0000000003d1"
const INACTIVE_ENROLLMENT_ID = "00000000-0000-4000-8000-0000000003d2"
const MANAGER_ENROLLMENT_ID = "00000000-0000-4000-8000-0000000003d3"

type Snapshot = {
  ok?: boolean
  kind?: string
  enrollmentId?: string
  version?: number
  status?: string
  content?: unknown
  code?: string
}

function lessonContent(title: string) {
  const content = emptyCourseContent(title)
  content.description = `Learn ${title}.`
  const lesson = emptyLesson("Welcome")
  lesson.description = "Open the assigned lesson."
  lesson.blocks = [
    { id: "text-1", type: "text", body: `Read ${title} snapshot.` },
    {
      id: "html-1",
      type: "text",
      body: `<p>Welcome <strong>guests</strong> to ${title}.</p>`,
      format: "html",
    },
    {
      id: "video-1",
      type: "video",
      url: "https://example.com/welcome.mp4",
      caption: "A 30-second welcome.",
    },
    {
      id: "quiz-1",
      type: "quiz",
      title: "Mic check",
      questions: [
        {
          id: "q-1",
          prompt: "When should you test the microphone?",
          kind: "single_choice",
          options: [
            { id: "a", label: "Before guests arrive", correct: true, html: "<b>yes</b>", sortString: "1" },
            { id: "b", label: "During the first dance", correct: false },
          ],
          writtenFeedback: "none",
        },
      ],
      config: { grading: "objective", retryLimit: 3, retryWaitHours: 0, passingScorePercent: 80 },
    },
    {
      id: "assign-1",
      type: "assignment",
      title: "Record a welcome",
      instructions: "Record a 30-second welcome.",
      verification: "online",
      requiresHumanApproval: true,
      retryLimit: 1,
    },
  ]
  content.lessons = [lesson]
  return content
}

function pathContent() {
  const content = emptyPathContent("Wedding DJ beginner")
  content.description = "First assigned path."
  content.courses = [{ courseId: COURSE_ID, prerequisiteCourseIds: [] }]
  return content
}

function snapshotOf(data: unknown): Snapshot {
  return (data ?? {}) as Snapshot
}

function clear() {
  querySql(`
    delete from public.company_training_enrollments where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_path_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_paths where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_course_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_courses where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
  `)
}

function restoreManagerMembership() {
  querySql(`
    update public.company_memberships
    set status = 'active'
    where company_id = '${COMPANY_A_ID}' and user_id = '${MANAGER_A_ID}';
  `)
}

beforeEach(clear)
afterAll(() => {
  restoreManagerMembership()
  clear()
})

async function seedPublishedCourse(title = "MC Foundations") {
  const owner = await asUser(OWNER_A_EMAIL)
  const { error: courseError } = await owner.from("company_training_courses").insert({
    id: COURSE_ID,
    company_id: COMPANY_A_ID,
    title,
    origin: "original",
    library_status: "active",
  })
  expect(courseError).toBeNull()
  const { error: publishedError } = await owner.from("company_training_course_versions").insert({
    id: COURSE_V1_ID,
    course_id: COURSE_ID,
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    content: lessonContent(title),
  })
  expect(publishedError).toBeNull()
  return owner
}

async function seedPublishedPath(owner: Awaited<ReturnType<typeof asUser>>) {
  const { error: pathError } = await owner.from("company_training_paths").insert({
    id: PATH_ID,
    company_id: COMPANY_A_ID,
    title: "Wedding DJ beginner",
    library_status: "active",
  })
  expect(pathError).toBeNull()
  const { error: pathPublished } = await owner.from("company_training_path_versions").insert({
    id: PATH_V1_ID,
    path_id: PATH_ID,
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    content: pathContent(),
  })
  expect(pathPublished).toBeNull()
}

function enrollArgs(overrides: Record<string, unknown> = {}) {
  return {
    p_company_id: COMPANY_A_ID,
    p_source: "staff",
    p_target_kind: "course",
    p_course_id: COURSE_ID,
    p_trainee_user_id: MANAGER_A_ID,
    p_confirmed: true,
    p_token_hash: "a".repeat(64),
    ...overrides,
  }
}

function seedCompanyBCourse() {
  const bContent = JSON.stringify(lessonContent("Secret B")).replace(/'/g, "''")
  querySql(`
    insert into public.company_training_courses (
      id, company_id, title, origin, library_status
    ) values (
      '${B_COURSE_ID}', '${COMPANY_B_ID}', 'Secret B', 'original', 'active'
    );
    insert into public.company_training_course_versions (
      id, course_id, company_id, version, status, content, published_by, published_at
    ) values (
      '${B_VERSION_ID}', '${B_COURSE_ID}', '${COMPANY_B_ID}', 1, 'published',
      '${bContent}'::jsonb, '${OWNER_B_ID}', now()
    );
    insert into public.company_training_enrollments (
      id, company_id, trainee_user_id, invite_email, source, target_kind, course_id,
      content_version, content_title, assigned_by, status
    ) values (
      '${B_ENROLLMENT_ID}', '${COMPANY_B_ID}', '${OWNER_B_ID}', 'owner-b@blueprint.test',
      'staff', 'course', '${B_COURSE_ID}', 1, 'Secret B', '${OWNER_B_ID}', 'active'
    );
  `)
}

describe("training frozen-content viewer isolation", () => {
  it("removes answer-bearing quiz fields and keeps lesson content", () => {
    const fixture = lessonContent("MC Foundations")
    expect(jsonContainsQuizAnswerKeys(fixture)).toBe(true)
    const sanitized = querySqlJsonOn<unknown>(
      "postgres",
      `select public.trainee_safe_course_content($json$${JSON.stringify(fixture)}$json$::jsonb)`,
    )
    const encoded = JSON.stringify(sanitized)
    expect(sanitized).toMatchObject({
      title: "MC Foundations",
      description: "Learn MC Foundations.",
      intendedRole: "DJ",
    })
    expect(encoded).toContain("Read MC Foundations snapshot.")
    expect(encoded).toContain("Welcome <strong>guests</strong> to MC Foundations.")
    expect(encoded).toContain("https://example.com/welcome.mp4")
    expect(encoded).toContain("A 30-second welcome.")
    expect(encoded).toContain("When should you test the microphone?")
    expect(encoded).toContain("Before guests arrive")
    expect(encoded).toContain("During the first dance")
    expect(encoded).toContain("Record a 30-second welcome.")
    expect(encoded).toContain("\"format\":\"html\"")
    expect(encoded).toContain("\"grading\":\"objective\"")
    expect(jsonContainsQuizAnswerKeys(sanitized)).toBe(false)
    expect(encoded).not.toMatch(/"correct"\s*:/)
    expect(encoded).not.toMatch(/"sortString"\s*:/)
    expect(encoded).not.toMatch(/"html"\s*:/)
  })

  it("does not let a non-owner trainee select answer keys from version tables", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
    const enrolled = await owner.rpc("enroll_company_training", enrollArgs())
    expect(enrolled.data).toMatchObject({ ok: true, status: "active" })
    const enrollmentId = (enrolled.data as { enrollmentId: string }).enrollmentId

    const manager = await asUser(MANAGER_A_EMAIL)
    const tableRows = await manager.from("company_training_course_versions").select("id, version, status, content")
    expect(tableRows.data ?? []).toEqual([])
    const oneVersion = await manager
      .from("company_training_course_versions")
      .select("content")
      .eq("id", COURSE_V1_ID)
      .maybeSingle()
    expect(oneVersion.data).toBeNull()
    expect(jsonContainsQuizAnswerKeys(tableRows.data)).toBe(false)

    const snapshot = snapshotOf(
      (await manager.rpc("get_assigned_training_snapshot", { p_enrollment_id: enrollmentId })).data,
    )
    expect(snapshot).toMatchObject({
      ok: true,
      kind: "course",
      enrollmentId,
      version: 1,
      status: "published",
    })
    expect(snapshot.content).toMatchObject({ title: "MC Foundations" })
    expect(JSON.stringify(snapshot.content)).toContain("Read MC Foundations snapshot.")
    expect(JSON.stringify(snapshot.content)).toContain("When should you test the microphone?")
    expect(jsonContainsQuizAnswerKeys(snapshot.content)).toBe(false)
  })

  it("lets the guided owner keep library select of published and draft versions including answer keys", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
    const { error: draftV2 } = await owner.from("company_training_course_versions").insert({
      id: COURSE_V2_ID,
      course_id: COURSE_ID,
      company_id: COMPANY_A_ID,
      version: 2,
      status: "draft",
      content: lessonContent("Rewritten Foundations"),
    })
    expect(draftV2).toBeNull()

    const versions = await owner
      .from("company_training_course_versions")
      .select("id, version, status, content")
      .eq("course_id", COURSE_ID)
      .order("version")
    expect((versions.data ?? []).map((row) => ({ id: row.id, version: row.version, status: row.status }))).toEqual([
      { id: COURSE_V1_ID, version: 1, status: "published" },
      { id: COURSE_V2_ID, version: 2, status: "draft" },
    ])
    expect(jsonContainsQuizAnswerKeys(versions.data?.[0]?.content)).toBe(true)
    expect(jsonContainsQuizAnswerKeys(versions.data?.[1]?.content)).toBe(true)
    expect(JSON.stringify(versions.data?.[0]?.content)).toContain('"correct":true')
  })

  it("returns the frozen assigned snapshot through the RPC after a later publish", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
    await seedPublishedPath(owner)
    const enrolled = await owner.rpc("enroll_company_training", enrollArgs())
    expect(enrolled.data).toMatchObject({ ok: true, status: "active" })
    const enrollmentId = (enrolled.data as { enrollmentId: string }).enrollmentId

    const { error: draftV2 } = await owner.from("company_training_course_versions").insert({
      id: COURSE_V2_ID,
      course_id: COURSE_ID,
      company_id: COMPANY_A_ID,
      version: 2,
      status: "draft",
      content: lessonContent("Rewritten Foundations"),
    })
    expect(draftV2).toBeNull()
    const published = await owner.rpc("publish_training_version", {
      p_kind: "company_course",
      p_parent_id: COURSE_ID,
      p_draft_id: COURSE_V2_ID,
    })
    expect(published.error).toBeNull()

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_training_course_versions").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_training_path_versions").select("id")).data ?? []).toEqual([])

    const snapshot = snapshotOf(
      (await manager.rpc("get_assigned_training_snapshot", { p_enrollment_id: enrollmentId })).data,
    )
    expect(snapshot).toMatchObject({
      ok: true,
      kind: "course",
      version: 1,
      status: "superseded",
    })
    expect(snapshot.content).toMatchObject({ title: "MC Foundations" })
    expect(JSON.stringify(snapshot.content)).toContain("Read MC Foundations snapshot.")
    expect(JSON.stringify(snapshot.content)).not.toContain("Rewritten Foundations")
    expect(jsonContainsQuizAnswerKeys(snapshot.content)).toBe(false)

    const draft = await manager
      .from("company_training_course_versions")
      .select("id")
      .eq("id", COURSE_V2_ID)
      .maybeSingle()
    expect(draft.data).toBeNull()
  })

  it("keeps path snapshots from exposing nested course lesson bodies or answer keys", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
    await seedPublishedPath(owner)
    const enrolled = await owner.rpc("enroll_company_training", enrollArgs({
      p_target_kind: "path",
      p_course_id: null,
      p_path_id: PATH_ID,
    }))
    expect(enrolled.data).toMatchObject({ ok: true, status: "active" })
    const enrollmentId = (enrolled.data as { enrollmentId: string }).enrollmentId

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_training_path_versions").select("id, content")).data ?? []).toEqual([])
    expect((await manager.from("company_training_course_versions").select("id, content")).data ?? []).toEqual([])

    const snapshot = snapshotOf(
      (await manager.rpc("get_assigned_training_snapshot", { p_enrollment_id: enrollmentId })).data,
    )
    expect(snapshot).toMatchObject({
      ok: true,
      kind: "path",
      version: 1,
      status: "published",
    })
    expect(snapshot.content).toMatchObject({ title: "Wedding DJ beginner" })
    const encoded = JSON.stringify(snapshot.content)
    expect(encoded).toContain(COURSE_ID)
    expect(encoded).not.toContain("Read MC Foundations snapshot.")
    expect(encoded).not.toContain("When should you test the microphone?")
    expect(jsonContainsQuizAnswerKeys(snapshot.content)).toBe(false)
  })

  it("isolates tenants and anonymous callers from assigned snapshots", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
    seedCompanyBCourse()
    const enrolled = await owner.rpc("enroll_company_training", enrollArgs())
    const enrollmentId = (enrolled.data as { enrollmentId: string }).enrollmentId

    const manager = await asUser(MANAGER_A_EMAIL)
    const companyB = snapshotOf(
      (await manager.rpc("get_assigned_training_snapshot", { p_enrollment_id: B_ENROLLMENT_ID })).data,
    )
    expect(companyB).toMatchObject({ ok: false, code: "not-found" })
    expect((await manager.from("company_training_course_versions").select("id").eq("id", B_VERSION_ID)).data ?? []).toEqual(
      [],
    )

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_training_course_versions").select("id").eq("course_id", COURSE_ID)).data ?? []).toEqual(
      [],
    )
    const ownerBSeeA = snapshotOf(
      (await ownerB.rpc("get_assigned_training_snapshot", { p_enrollment_id: enrollmentId })).data,
    )
    expect(ownerBSeeA).toMatchObject({ ok: false, code: "not-found" })

    const anon = createAnonClient()
    expect((await anon.from("company_training_course_versions").select("id").eq("course_id", COURSE_ID)).data ?? []).toEqual(
      [],
    )
    const anonSnapshot = snapshotOf(
      (await anon.rpc("get_assigned_training_snapshot", { p_enrollment_id: enrollmentId })).data,
    )
    expect(anonSnapshot.ok === false || anonSnapshot.ok == null).toBe(true)
  })

  it("blocks an inactive membership from viewing assigned content even with an enrollment", async () => {
    await seedPublishedCourse("MC Foundations")
    seedCompanyBCourse()
    querySql(`
      insert into public.company_training_enrollments (
        id, company_id, trainee_user_id, invite_email, source, target_kind, course_id,
        content_version, content_title, assigned_by, status
      ) values (
        '${INACTIVE_ENROLLMENT_ID}', '${COMPANY_A_ID}', '${INACTIVE_A_ID}', '${INACTIVE_A_EMAIL}',
        'staff', 'course', '${COURSE_ID}', 1, 'MC Foundations', '${OWNER_A_ID}', 'active'
      );
      insert into public.company_training_enrollments (
        id, company_id, trainee_user_id, invite_email, source, target_kind, course_id,
        content_version, content_title, assigned_by, status
      ) values (
        '${MANAGER_ENROLLMENT_ID}', '${COMPANY_A_ID}', '${MANAGER_A_ID}', '${MANAGER_A_EMAIL}',
        'staff', 'course', '${COURSE_ID}', 1, 'MC Foundations', '${OWNER_A_ID}', 'active'
      );
    `)

    const inactive = await asUser(INACTIVE_A_EMAIL)
    expect((await inactive.from("company_training_enrollments").select("id, status")).data ?? []).toEqual([])
    expect((await inactive.from("company_training_course_versions").select("id, version, content")).data ?? []).toEqual([])
    expect(
      (await inactive.from("company_training_course_versions").select("content").eq("id", COURSE_V1_ID).maybeSingle())
        .data,
    ).toBeNull()
    expect(
      snapshotOf(
        (await inactive.rpc("get_assigned_training_snapshot", { p_enrollment_id: INACTIVE_ENROLLMENT_ID })).data,
      ),
    ).toMatchObject({ ok: false, code: "not-found" })

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_training_enrollments").select("id")).data ?? []).toEqual([
      { id: MANAGER_ENROLLMENT_ID },
    ])
    expect((await manager.from("company_training_course_versions").select("id")).data ?? []).toEqual([])
    const managerSnapshot = snapshotOf(
      (await manager.rpc("get_assigned_training_snapshot", { p_enrollment_id: MANAGER_ENROLLMENT_ID })).data,
    )
    expect(managerSnapshot).toMatchObject({ ok: true, kind: "course", version: 1 })
    expect(jsonContainsQuizAnswerKeys(managerSnapshot.content)).toBe(false)

    querySql(`
      update public.company_memberships
      set status = 'inactive'
      where company_id = '${COMPANY_A_ID}' and user_id = '${MANAGER_A_ID}';
    `)
    const deactivated = await asUser(MANAGER_A_EMAIL)
    expect((await deactivated.from("company_training_enrollments").select("id")).data ?? []).toEqual([])
    expect((await deactivated.from("company_training_course_versions").select("id")).data ?? []).toEqual([])
    expect(
      snapshotOf(
        (await deactivated.rpc("get_assigned_training_snapshot", { p_enrollment_id: MANAGER_ENROLLMENT_ID })).data,
      ),
    ).toMatchObject({ ok: false, code: "not-found" })
    restoreManagerMembership()
  })

  it("blocks a cancelled enrollment from the snapshot RPC and version tables", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
    const enrolled = await owner.rpc("enroll_company_training", enrollArgs())
    const enrollmentId = (enrolled.data as { enrollmentId: string }).enrollmentId
    const cancelled = await owner.rpc("cancel_company_training_enrollment", { p_enrollment_id: enrollmentId })
    expect(cancelled.error).toBeNull()
    expect(cancelled.data).toMatchObject({ ok: true })

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_training_enrollments").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_training_course_versions").select("id, content")).data ?? []).toEqual([])
    expect(
      snapshotOf((await manager.rpc("get_assigned_training_snapshot", { p_enrollment_id: enrollmentId })).data),
    ).toMatchObject({ ok: false, code: "not-found" })
  })
})
