import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { DEFAULT_AUDITION_SKILLS } from "@/lib/blueprint/hiring-workflow"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  MANAGER_A_EMAIL,
  OWNER_A_EMAIL,
  OWNER_A_ID,
  OWNER_B_EMAIL,
} from "./helpers"
import { querySql } from "./sql"

const KEY = "ffffffff-ffff-4fff-8fff-ffffffffffff"

function clear() {
  querySql(`
    delete from public.company_training_enrollments where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_training_preparations where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_hiring_outcomes where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_auditions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
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
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Apply at /join/company-a-train." },
  social: { channel: "social", title: "DJ at Company A", body: "Apply at /join/company-a-train." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Apply at /join/company-a-train." },
  general: { channel: "general", title: "DJ at Company A", body: "Apply at /join/company-a-train." },
}

const payload = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya-train@example.com",
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

async function seedHiredApplication() {
  const ownerA = await asUser(OWNER_A_EMAIL)
  const published = await ownerA.from("company_recruiting_pages").insert({
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    slug: "company-a-train",
    source_fingerprint: "e".repeat(64),
    source_strategy_id: null,
    source_strategy_version: 1,
    page_content: page,
    ads_content: ads,
  })
  expect(published.error).toBeNull()
  const anon = createAnonClient()
  const submitted = await anon.rpc("submit_recruiting_application", {
    p_slug: "company-a-train",
    p_idempotency_key: KEY,
    p_payload: payload,
    p_ip_hash: "hash-train-1",
  })
  expect(submitted.data).toEqual({ ok: true })
  const application = await ownerA.from("company_applications").select("id, applicant_id").single()
  expect(application.error).toBeNull()
  const blockedBeforeHire = await ownerA.from("company_applicant_training_preparations").insert({
    company_id: COMPANY_A_ID,
    application_id: application.data!.id,
    applicant_id: application.data!.applicant_id,
    version: 1,
    status: "draft",
    intended_role: "DJ",
    experience_level: "beginner",
    training_approach: "full",
    suggested_approach: "full",
    skills_demonstrated: [],
    skills_needing_development: [],
    skills_needing_verification: [],
    starting_goals: [],
    evidence,
    missing_information: [],
    created_by: OWNER_A_ID,
    updated_by: OWNER_A_ID,
  })
  expect(blockedBeforeHire.error).not.toBeNull()
  const outcome = await ownerA.from("company_applicant_hiring_outcomes").insert({
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
  const outcomeRow = await ownerA
    .from("company_applicant_hiring_outcomes")
    .select("id")
    .eq("application_id", application.data!.id)
    .single()
  return { ownerA, anon, application: application.data!, outcomeId: outcomeRow.data!.id }
}

describe("training preparation isolation", () => {
  it("lets an owner prepare and approve a handoff while blocking others, duplicates, and reversed hires", async () => {
    const { ownerA, anon, application, outcomeId } = await seedHiredApplication()

    const withoutHire = await ownerA.from("company_applicant_training_preparations").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      version: 1,
      status: "draft",
      source_outcome_id: outcomeId,
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
    expect(withoutHire.error).toBeNull()

    const duplicateDraft = await ownerA.from("company_applicant_training_preparations").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      version: 2,
      status: "draft",
      source_outcome_id: outcomeId,
      intended_role: "DJ",
      experience_level: "beginner",
      training_approach: "full",
      suggested_approach: "full",
      skills_demonstrated: [],
      skills_needing_development: [],
      skills_needing_verification: [],
      starting_goals: [],
      evidence,
      missing_information: [],
      created_by: OWNER_A_ID,
      updated_by: OWNER_A_ID,
    })
    expect(duplicateDraft.error).not.toBeNull()

    const approved = await ownerA
      .from("company_applicant_training_preparations")
      .update({ status: "approved", updated_by: OWNER_A_ID })
      .eq("application_id", application.id)
      .eq("status", "draft")
    expect(approved.error).toBeNull()

    const mutateApproved = await ownerA
      .from("company_applicant_training_preparations")
      .update({ intended_role: "Lead DJ", updated_by: OWNER_A_ID })
      .eq("application_id", application.id)
      .eq("status", "approved")
    expect(mutateApproved.error).not.toBeNull()

    const reverse = await ownerA.from("company_applicant_hiring_outcomes").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      outcome: "reversed",
      intended_role: "DJ",
      engagement_model: "w2",
      created_by: OWNER_A_ID,
    })
    expect(reverse.error).toBeNull()

    const history = await ownerA
      .from("company_applicant_training_preparations")
      .select("status, version, intended_role")
      .eq("application_id", application.id)
    expect(history.data).toEqual([
      expect.objectContaining({ status: "approved", version: 1, intended_role: "DJ" }),
    ])

    const blockedDraft = await ownerA.from("company_applicant_training_preparations").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      version: 2,
      status: "draft",
      intended_role: "DJ",
      experience_level: "beginner",
      training_approach: "full",
      suggested_approach: "full",
      skills_demonstrated: [],
      skills_needing_development: [],
      skills_needing_verification: [],
      starting_goals: [],
      evidence,
      missing_information: [],
      created_by: OWNER_A_ID,
      updated_by: OWNER_A_ID,
    })
    expect(blockedDraft.error).not.toBeNull()

    expect((await anon.from("company_applicant_training_preparations").select("id")).data ?? []).toEqual([])
    expect((await (await asUser(MANAGER_A_EMAIL)).from("company_applicant_training_preparations").select("id")).data ?? []).toEqual(
      [],
    )
    expect((await (await asUser(OWNER_B_EMAIL)).from("company_applicant_training_preparations").select("id")).data ?? []).toEqual(
      [],
    )
    expect(JSON.stringify(DEFAULT_AUDITION_SKILLS)).not.toMatch(/trainee account|certification/i)
  })
})
