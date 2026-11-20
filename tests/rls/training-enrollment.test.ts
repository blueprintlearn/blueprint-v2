import { createHash } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { emptyCourseContent, emptyPathContent } from "@/lib/blueprint/training-library"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  INACTIVE_A_ID,
  MANAGER_A_EMAIL,
  MANAGER_A_ID,
  OWNER_A_EMAIL,
  OWNER_A_ID,
  OWNER_B_EMAIL,
  OWNER_B_ID,
  SEED_PASSWORD,
} from "./helpers"
import { querySql, querySqlAllowError } from "./sql"

const COURSE_ID = "00000000-0000-4000-8000-0000000002c1"
const COURSE_V1_ID = "00000000-0000-4000-8000-0000000002c2"
const COURSE_V2_ID = "00000000-0000-4000-8000-0000000002c3"
const PATH_ID = "00000000-0000-4000-8000-0000000002c4"
const PATH_V1_ID = "00000000-0000-4000-8000-0000000002c5"
const DRAFT_COURSE_ID = "00000000-0000-4000-8000-0000000002c6"
const DRAFT_VERSION_ID = "00000000-0000-4000-8000-0000000002c7"
const B_COURSE_ID = "00000000-0000-4000-8000-0000000002c8"
const B_VERSION_ID = "00000000-0000-4000-8000-0000000002c9"
const B_ENROLLMENT_ID = "00000000-0000-4000-8000-0000000002d1"
const INVITEE_ID = "00000000-0000-4000-8000-0000000002d2"
const INVITEE_EMAIL = "invitee-a@blueprint.test"
const B_PAGE_ID = "00000000-0000-4000-8000-0000000002e1"
const B_APPLICANT_ID = "00000000-0000-4000-8000-0000000002e2"
const B_APPLICATION_ID = "00000000-0000-4000-8000-0000000002e3"
const B_PREP_ID = "00000000-0000-4000-8000-0000000002e4"
const KEY = "12345678-1234-4123-8123-1234567890ab"

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

function seedInvitee() {
  querySql(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '${INVITEE_ID}',
      'authenticated',
      'authenticated',
      '${INVITEE_EMAIL}',
      extensions.crypt('${SEED_PASSWORD}', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    select
      '${INVITEE_ID}',
      '${INVITEE_ID}',
      jsonb_build_object('sub', '${INVITEE_ID}', 'email', '${INVITEE_EMAIL}', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1 from auth.identities where user_id = '${INVITEE_ID}'
    );
  `)
}

function clear() {
  querySql(`
    delete from public.company_training_enrollments where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_memberships where user_id = '${INVITEE_ID}';
    delete from public.company_training_path_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_paths where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_course_versions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_training_courses where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_training_preparations where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_hiring_outcomes where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicants where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_recruiting_pages where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_application_attempts;
  `)
}

beforeEach(clear)
afterAll(clear)

const page = {
  companyName: "Company A",
  headline: "Company A is hiring DJs",
  introduction: "This page describes the role.",
  roleTitle: "DJ",
  roleDescription: "This search is for DJs.",
  responsibilities: ["Run events to the company standard."],
  required: ["Available Friday evenings."],
  preferred: [],
  compensation: null,
  showCompensation: false,
  values: [],
  arrangement: null,
  availability: null,
  travel: null,
  primaryColor: null,
  accentColor: null,
  applicationQuestions: [],
}

const ads = {
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Apply at /join/company-a-enroll." },
  social: { channel: "social", title: "DJ at Company A", body: "Apply at /join/company-a-enroll." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Apply at /join/company-a-enroll." },
  general: { channel: "general", title: "DJ at Company A", body: "Apply at /join/company-a-enroll." },
}

const payload = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya-enroll@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consent: "1",
  ownerAnswers: [],
  website: "",
}

const evidence = {
  hiringPath: "beginner",
  engagementModel: "w2",
  intendedRole: "DJ",
  completedActivities: [{ title: "Review application", status: "complete", required: true }],
  applicationExperience: "I have DJed friends' parties.",
  applicationAvailability: "Most Saturday nights.",
  applicationMotivation: "I want to learn weddings.",
  auditionObservations: [],
}

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
    content: emptyCourseContent(title),
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

describe("training enrollment isolation", () => {
  it("enrolls existing staff, blocks duplicates, unauthorized users, and other tenants", async () => {
    const owner = await seedPublishedCourse()
    const content = JSON.stringify(emptyCourseContent("Secret B")).replace(/'/g, "''")
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
        '${content}'::jsonb, '${OWNER_B_ID}', now()
      );
      insert into public.company_training_enrollments (
        id, company_id, trainee_user_id, invite_email, source, target_kind, course_id,
        content_version, content_title, assigned_by, status
      ) values (
        '${B_ENROLLMENT_ID}', '${COMPANY_B_ID}', '${OWNER_B_ID}', 'owner-b@blueprint.test',
        'staff', 'course', '${B_COURSE_ID}', 1, 'Secret B', '${OWNER_B_ID}', 'active'
      );
    `)

    const unconfirmed = await owner.rpc("enroll_company_training", enrollArgs({ p_confirmed: false }))
    expect(unconfirmed.error?.message ?? "").toMatch(/training-enrollment:confirmation-required/)

    const enrolled = await owner.rpc("enroll_company_training", enrollArgs())
    expect(enrolled.error).toBeNull()
    expect(enrolled.data).toMatchObject({ ok: true, status: "active", existing: false })

    const duplicate = await owner.rpc("enroll_company_training", enrollArgs())
    expect(duplicate.error).toBeNull()
    expect(duplicate.data).toMatchObject({
      ok: true,
      existing: true,
      enrollmentId: (enrolled.data as { enrollmentId: string }).enrollmentId,
    })

    const inactive = await owner.rpc("enroll_company_training", enrollArgs({ p_trainee_user_id: INACTIVE_A_ID }))
    expect(inactive.error?.message ?? "").toMatch(/training-enrollment:staff-not-member/)

    const manager = await asUser(MANAGER_A_EMAIL)
    const managerEnroll = await manager.rpc("enroll_company_training", enrollArgs())
    expect(managerEnroll.error?.message ?? "").toMatch(/training-enrollment:not-owner/)
    const managerCancel = await manager.rpc("cancel_company_training_enrollment", {
      p_enrollment_id: (enrolled.data as { enrollmentId: string }).enrollmentId,
    })
    expect(managerCancel.error?.message ?? "").toMatch(/training-enrollment:not-owner/)

    const ownerB = await asUser(OWNER_B_EMAIL)
    const ownerBEnroll = await ownerB.rpc("enroll_company_training", enrollArgs())
    expect(ownerBEnroll.error?.message ?? "").toMatch(/training-enrollment:not-owner/)
    const ownerBSeeA = await ownerB.from("company_training_enrollments").select("id").eq("company_id", COMPANY_A_ID)
    expect(ownerBSeeA.data ?? []).toEqual([])
    const ownerBCancelA = await ownerB.rpc("cancel_company_training_enrollment", {
      p_enrollment_id: (enrolled.data as { enrollmentId: string }).enrollmentId,
    })
    expect(ownerBCancelA.error?.message ?? "").toMatch(/training-enrollment:not-owner/)

    const ownerARows = await owner.from("company_training_enrollments").select("id, company_id, content_title")
    expect((ownerARows.data ?? []).map((row) => row.company_id)).toEqual([COMPANY_A_ID])
    expect((ownerARows.data ?? []).map((row) => row.content_title)).toEqual(["MC Foundations"])

    const managerRows = await manager.from("company_training_enrollments").select("content_title, status")
    expect(managerRows.data).toEqual([{ content_title: "MC Foundations", status: "active" }])

    const anon = createAnonClient()
    const anonRows = await anon.from("company_training_enrollments").select("id")
    expect(anonRows.data ?? []).toEqual([])
    const directInsert = await owner.from("company_training_enrollments").insert({
      company_id: COMPANY_A_ID,
      source: "staff",
      target_kind: "course",
      course_id: COURSE_ID,
      content_version: 1,
      content_title: "Hacked",
      assigned_by: OWNER_A_ID,
      status: "active",
      trainee_user_id: OWNER_A_ID,
    })
    expect(directInsert.error).not.toBeNull()
  })

  it("invites a new trainee, rejects the wrong account, and cannot reuse a revoked token", async () => {
    seedInvitee()
    const owner = await seedPublishedCourse()
    const token = "invite-token-one"
    const hash = tokenHash(token)
    const invited = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "invitation",
        p_trainee_user_id: undefined,
        p_invite_email: INVITEE_EMAIL,
        p_token_hash: hash,
      }),
    )
    expect(invited.error).toBeNull()
    expect(invited.data).toMatchObject({ ok: true, status: "pending", existing: false })

    const duplicateInvite = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "invitation",
        p_trainee_user_id: undefined,
        p_invite_email: INVITEE_EMAIL.toUpperCase(),
        p_token_hash: tokenHash("invite-token-two"),
      }),
    )
    expect(duplicateInvite.error).toBeNull()
    expect(duplicateInvite.data).toMatchObject({ existing: true, status: "pending" })

    const anon = createAnonClient()
    const preview = await anon.rpc("get_training_invitation", { p_token_hash: hash })
    expect(preview.data).toMatchObject({ ok: true, status: "pending", inviteEmail: INVITEE_EMAIL })

    const manager = await asUser(MANAGER_A_EMAIL)
    const wrongAccount = await manager.rpc("accept_training_invitation", { p_token_hash: hash })
    expect(wrongAccount.error?.message ?? "").toMatch(/training-enrollment:wrong-account/)

    const revoked = await owner.rpc("cancel_company_training_enrollment", {
      p_enrollment_id: (invited.data as { enrollmentId: string }).enrollmentId,
    })
    expect(revoked.data).toMatchObject({ ok: true, status: "revoked" })

    const invitee = await asUser(INVITEE_EMAIL)
    const reuse = await invitee.rpc("accept_training_invitation", { p_token_hash: hash })
    expect(reuse.error?.message ?? "").toMatch(/training-enrollment:(revoked|not-found)/)

    const reinvite = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "invitation",
        p_trainee_user_id: undefined,
        p_invite_email: INVITEE_EMAIL,
        p_token_hash: tokenHash("invite-token-three"),
      }),
    )
    expect(reinvite.error).toBeNull()
    expect(reinvite.data).toMatchObject({ ok: true, status: "pending", existing: false })

    const accepted = await invitee.rpc("accept_training_invitation", { p_token_hash: tokenHash("invite-token-three") })
    expect(accepted.error).toBeNull()
    expect(accepted.data).toMatchObject({ ok: true, status: "active" })

    const memberships = querySql(`
      select count(*)::int as n from public.company_memberships
      where company_id = '${COMPANY_A_ID}' and user_id = '${INVITEE_ID}';
    `)
    expect(memberships).toMatch(/1/)

    const existingMemberInvite = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "invitation",
        p_trainee_user_id: undefined,
        p_invite_email: MANAGER_A_EMAIL,
        p_token_hash: tokenHash("unused-member-token"),
      }),
    )
    expect(existingMemberInvite.data).toMatchObject({ ok: true, status: "active", existing: false })
    const extraAccounts = querySql(`
      select count(*)::int as n from auth.users where email = '${MANAGER_A_EMAIL}';
    `)
    expect(extraAccounts).toMatch(/1/)
  })

  it("requires an approved same-company handoff, freezes published versions, and rejects drafts", async () => {
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
    const { error: draftCourse } = await owner.from("company_training_courses").insert({
      id: DRAFT_COURSE_ID,
      company_id: COMPANY_A_ID,
      title: "Unpublished draft",
      origin: "original",
      library_status: "active",
    })
    expect(draftCourse).toBeNull()
    const { error: draftVersion } = await owner.from("company_training_course_versions").insert({
      id: DRAFT_VERSION_ID,
      course_id: DRAFT_COURSE_ID,
      company_id: COMPANY_A_ID,
      version: 1,
      status: "draft",
      content: emptyCourseContent("Unpublished draft"),
    })
    expect(draftVersion).toBeNull()

    const unpublished = await owner.rpc(
      "enroll_company_training",
      enrollArgs({ p_course_id: DRAFT_COURSE_ID }),
    )
    expect(unpublished.error?.message ?? "").toMatch(/training-enrollment:unpublished-target/)

    const { error: pageError } = await owner.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 1,
      status: "published",
      slug: "company-a-enroll",
      source_fingerprint: "f".repeat(64),
      source_strategy_id: null,
      source_strategy_version: 1,
      page_content: page,
      ads_content: ads,
    })
    expect(pageError).toBeNull()
    const submitted = await createAnonClient().rpc("submit_recruiting_application", {
      p_slug: "company-a-enroll",
      p_idempotency_key: KEY,
      p_payload: payload,
      p_ip_hash: "hash-enroll-1",
    })
    expect(submitted.data).toEqual({ ok: true })
    const application = await owner.from("company_applications").select("id, applicant_id").single()
    expect(application.error).toBeNull()
    const outcome = await owner.from("company_applicant_hiring_outcomes").insert({
      company_id: COMPANY_A_ID,
      application_id: application.data!.id,
      applicant_id: application.data!.applicant_id,
      outcome: "hired",
      intended_role: "DJ",
      planned_start_date: "2026-05-01",
      engagement_model: "w2",
      notes: "Owner-provided W-2 intention.",
      created_by: OWNER_A_ID,
    })
    expect(outcome.error).toBeNull()
    const outcomeRow = await owner
      .from("company_applicant_hiring_outcomes")
      .select("id")
      .eq("application_id", application.data!.id)
      .single()
    const draftPrep = await owner.from("company_applicant_training_preparations").insert({
      company_id: COMPANY_A_ID,
      application_id: application.data!.id,
      applicant_id: application.data!.applicant_id,
      version: 1,
      status: "draft",
      source_outcome_id: outcomeRow.data!.id,
      intended_role: "DJ",
      experience_level: "beginner",
      training_approach: "full",
      suggested_approach: "full",
      skills_demonstrated: [],
      skills_needing_development: ["Foundational DJ skills"],
      skills_needing_verification: [],
      starting_goals: ["Start with foundational DJ training"],
      planned_start_date: "2026-05-01",
      owner_notes: null,
      evidence,
      missing_information: [],
      created_by: OWNER_A_ID,
      updated_by: OWNER_A_ID,
    })
    expect(draftPrep.error).toBeNull()
    const prep = await owner
      .from("company_applicant_training_preparations")
      .select("id")
      .eq("application_id", application.data!.id)
      .single()
    const unapproved = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "recruitment",
        p_trainee_user_id: undefined,
        p_preparation_id: prep.data!.id,
      }),
    )
    expect(unapproved.error?.message ?? "").toMatch(/training-enrollment:handoff-not-approved/)

    const approved = await owner
      .from("company_applicant_training_preparations")
      .update({ status: "approved" })
      .eq("id", prep.data!.id)
    expect(approved.error).toBeNull()

    querySql(`
      insert into public.company_recruiting_pages (
        id, company_id, version, status, slug, source_fingerprint,
        page_content, ads_content, published_by, published_at
      ) values (
        '${B_PAGE_ID}', '${COMPANY_B_ID}', 1, 'published', 'company-b-enroll', '${"f".repeat(64)}',
        '{"headline":"Company B"}'::jsonb, '{"general":{"channel":"general","title":"DJ","body":"Apply"}}'::jsonb,
        '${OWNER_B_ID}', now()
      );
      insert into public.company_applicants (
        id, company_id, first_name, last_name, email, phone, location
      ) values (
        '${B_APPLICANT_ID}', '${COMPANY_B_ID}', 'Sam', 'Other', 'sam-b@example.com', '555-010-0000', 'Austin, TX'
      );
      insert into public.company_applications (
        id, company_id, applicant_id, recruiting_page_id, page_version, slug,
        role_title, stage, answers, idempotency_key
      ) values (
        '${B_APPLICATION_ID}', '${COMPANY_B_ID}', '${B_APPLICANT_ID}', '${B_PAGE_ID}', 1, 'company-b-enroll',
        'DJ', 'hired', '{}'::jsonb, '12345678-1234-4123-8123-1234567890ac'
      );
      insert into public.company_applicant_hiring_outcomes (
        company_id, application_id, applicant_id, outcome, intended_role,
        engagement_model, notes, created_by
      ) values (
        '${COMPANY_B_ID}', '${B_APPLICATION_ID}', '${B_APPLICANT_ID}',
        'hired', 'DJ', 'w2', 'Cross-company fixture.', '${OWNER_B_ID}'
      );
      insert into public.company_applicant_training_preparations (
        id, company_id, application_id, applicant_id, version, status,
        intended_role, experience_level, training_approach, suggested_approach,
        skills_demonstrated, skills_needing_development, skills_needing_verification,
        starting_goals, evidence, missing_information, created_by, updated_by,
        approved_by, approved_at
      ) values (
        '${B_PREP_ID}', '${COMPANY_B_ID}', '${B_APPLICATION_ID}', '${B_APPLICANT_ID}',
        1, 'approved', 'DJ', 'beginner', 'full', 'full',
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb,
        '${OWNER_B_ID}', '${OWNER_B_ID}', '${OWNER_B_ID}', now()
      );
    `)
    const wrongCompany = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "recruitment",
        p_trainee_user_id: undefined,
        p_preparation_id: B_PREP_ID,
      }),
    )
    expect(wrongCompany.error?.message ?? "").toMatch(/training-enrollment:handoff-wrong-company/)

    const missing = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "recruitment",
        p_trainee_user_id: undefined,
        p_preparation_id: "00000000-0000-4000-8000-0000000002ff",
      }),
    )
    expect(missing.error?.message ?? "").toMatch(/training-enrollment:missing-handoff/)

    const handoff = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "recruitment",
        p_target_kind: "path",
        p_course_id: undefined,
        p_path_id: PATH_ID,
        p_trainee_user_id: undefined,
        p_preparation_id: prep.data!.id,
        p_token_hash: tokenHash("handoff-invite"),
      }),
    )
    expect(handoff.error).toBeNull()
    expect(handoff.data).toMatchObject({ ok: true, status: "pending", existing: false })
    const handoffAgain = await owner.rpc(
      "enroll_company_training",
      enrollArgs({
        p_source: "recruitment",
        p_target_kind: "path",
        p_course_id: undefined,
        p_path_id: PATH_ID,
        p_trainee_user_id: undefined,
        p_preparation_id: prep.data!.id,
        p_token_hash: tokenHash("handoff-invite-2"),
      }),
    )
    expect(handoffAgain.data).toMatchObject({ existing: true })
    const prepStillThere = await owner
      .from("company_applicant_training_preparations")
      .select("id, status, intended_role")
      .eq("id", prep.data!.id)
      .single()
    expect(prepStillThere.data).toMatchObject({ status: "approved", intended_role: "DJ" })

    const staff = await owner.rpc("enroll_company_training", enrollArgs({ p_trainee_user_id: MANAGER_A_ID }))
    expect(staff.data).toMatchObject({ ok: true, status: "active" })
    const { error: draftV2 } = await owner.from("company_training_course_versions").insert({
      id: COURSE_V2_ID,
      course_id: COURSE_ID,
      company_id: COMPANY_A_ID,
      version: 2,
      status: "draft",
      content: emptyCourseContent("Rewritten Foundations"),
    })
    expect(draftV2).toBeNull()
    const published = await owner.rpc("publish_training_version", {
      p_kind: "company_course",
      p_parent_id: COURSE_ID,
      p_draft_id: COURSE_V2_ID,
    })
    expect(published.error).toBeNull()
    const frozen = await owner
      .from("company_training_enrollments")
      .select("content_title, content_version")
      .eq("id", (staff.data as { enrollmentId: string }).enrollmentId)
      .single()
    expect(frozen.data).toEqual({ content_title: "MC Foundations", content_version: 1 })
    const mutate = querySqlAllowError(`
      update public.company_training_enrollments
      set content_title = 'Hacked title', content_version = 2
      where id = '${(staff.data as { enrollmentId: string }).enrollmentId}';
    `)
    expect(mutate.ok).toBe(false)
    expect(mutate.output).toMatch(/immutable/i)
  })
})
