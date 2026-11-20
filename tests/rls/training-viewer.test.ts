import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { emptyCourseContent, emptyLesson, emptyPathContent } from "@/lib/blueprint/training-library"

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
import { querySql } from "./sql"

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

function lessonContent(title: string) {
  const content = emptyCourseContent(title)
  const lesson = emptyLesson("Welcome")
  lesson.blocks = [
    { id: "text-1", type: "text", body: `Read ${title} snapshot.` },
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
            { id: "a", label: "Before guests arrive", correct: true },
            { id: "b", label: "During the first dance", correct: false },
          ],
          writtenFeedback: "none",
        },
      ],
      config: { grading: "objective", retryLimit: 3, retryWaitHours: 0, passingScorePercent: 80 },
    },
  ]
  content.lessons = [lesson]
  return content
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

describe("training frozen-content viewer isolation", () => {
  it("lets an active trainee read only the frozen assigned snapshot", async () => {
    const owner = await seedPublishedCourse("MC Foundations")
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
      content: emptyPathContent("Wedding DJ beginner"),
    })
    expect(pathPublished).toBeNull()

    const enrolled = await owner.rpc("enroll_company_training", enrollArgs())
    expect(enrolled.data).toMatchObject({ ok: true, status: "active" })

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
    const versions = await manager
      .from("company_training_course_versions")
      .select("version, status, content")
      .eq("course_id", COURSE_ID)
      .order("version")
    expect((versions.data ?? []).map((row) => ({ version: row.version, status: row.status }))).toEqual([
      { version: 1, status: "superseded" },
    ])
    expect(versions.data?.[0]?.content).toMatchObject({ title: "MC Foundations" })
    expect(JSON.stringify(versions.data?.[0]?.content)).toContain("Read MC Foundations snapshot.")
    expect(JSON.stringify(versions.data?.[0]?.content)).not.toContain("Rewritten Foundations")

    const draft = await manager
      .from("company_training_course_versions")
      .select("id")
      .eq("id", COURSE_V2_ID)
      .maybeSingle()
    expect(draft.data).toBeNull()

    const pathRows = await manager.from("company_training_path_versions").select("id")
    expect(pathRows.data ?? []).toEqual([])

    const ownerB = await asUser(OWNER_B_EMAIL)
    const ownerBSeeA = await ownerB.from("company_training_course_versions").select("id").eq("course_id", COURSE_ID)
    expect(ownerBSeeA.data ?? []).toEqual([])

    const anon = createAnonClient()
    const anonRows = await anon.from("company_training_course_versions").select("id").eq("course_id", COURSE_ID)
    expect(anonRows.data ?? []).toEqual([])
  })

  it("blocks an inactive membership from viewing assigned content even with an enrollment", async () => {
    await seedPublishedCourse("MC Foundations")
    const bContent = JSON.stringify(lessonContent("Secret B")).replace(/'/g, "''")
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

    const inactive = await asUser(INACTIVE_A_EMAIL)
    const enrollments = await inactive.from("company_training_enrollments").select("id, status")
    expect(enrollments.data ?? []).toEqual([])
    const versions = await inactive.from("company_training_course_versions").select("id, version, content")
    expect(versions.data ?? []).toEqual([])
    const oneVersion = await inactive
      .from("company_training_course_versions")
      .select("content")
      .eq("id", COURSE_V1_ID)
      .maybeSingle()
    expect(oneVersion.data).toBeNull()

    const manager = await asUser(MANAGER_A_EMAIL)
    const managerEnrollment = await manager.from("company_training_enrollments").select("id")
    expect((managerEnrollment.data ?? []).map((row) => row.id)).toEqual([MANAGER_ENROLLMENT_ID])
    const managerVersion = await manager
      .from("company_training_course_versions")
      .select("version, content")
      .eq("id", COURSE_V1_ID)
      .single()
    expect(managerVersion.data?.version).toBe(1)
    expect(managerVersion.data?.content).toMatchObject({ title: "MC Foundations" })
    const secretB = await manager.from("company_training_course_versions").select("id").eq("id", B_VERSION_ID)
    expect(secretB.data ?? []).toEqual([])

    querySql(`
      update public.company_memberships
      set status = 'inactive'
      where company_id = '${COMPANY_A_ID}' and user_id = '${MANAGER_A_ID}';
    `)
    const deactivated = await asUser(MANAGER_A_EMAIL)
    const afterDeactivate = await deactivated.from("company_training_enrollments").select("id")
    expect(afterDeactivate.data ?? []).toEqual([])
    const afterVersions = await deactivated.from("company_training_course_versions").select("id")
    expect(afterVersions.data ?? []).toEqual([])
    restoreManagerMembership()
  })
})
