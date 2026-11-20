import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { DEFAULT_EVALUATION_CATEGORIES } from "@/lib/blueprint/candidate-review"

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

const KEY = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

function clear() {
  querySql(`
    delete from public.company_training_enrollments where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_evaluation_templates where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
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
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Apply at /join/company-a-rev." },
  social: { channel: "social", title: "DJ at Company A", body: "Apply at /join/company-a-rev." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Apply at /join/company-a-rev." },
  general: { channel: "general", title: "DJ at Company A", body: "Apply at /join/company-a-rev." },
}

const payload = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya-rev@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consent: "1",
  ownerAnswers: [],
  website: "",
}

const ratings = DEFAULT_EVALUATION_CATEGORIES.map((category, index) => ({
  category,
  rating: index === 1 ? null : 4,
  notes: index === 0 ? "Clear answers." : null,
}))

async function seedApplication() {
  const ownerA = await asUser(OWNER_A_EMAIL)
  const published = await ownerA.from("company_recruiting_pages").insert({
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    slug: "company-a-rev",
    source_fingerprint: "c".repeat(64),
    source_strategy_id: null,
    source_strategy_version: 1,
    page_content: page,
    ads_content: ads,
  })
  expect(published.error).toBeNull()
  const anon = createAnonClient()
  const submitted = await anon.rpc("submit_recruiting_application", {
    p_slug: "company-a-rev",
    p_idempotency_key: KEY,
    p_payload: payload,
    p_ip_hash: "hash-rev-1",
  })
  expect(submitted.data).toEqual({ ok: true })
  const application = await ownerA
    .from("company_applications")
    .select("id, applicant_id, answers, slug")
    .single()
  expect(application.error).toBeNull()
  return { ownerA, anon, application: application.data! }
}

describe("candidate review isolation", () => {
  it("lets an owner save evaluations, decisions, and follow-ups while blocking others", async () => {
    const { ownerA, anon, application } = await seedApplication()
    const template = await ownerA.from("company_evaluation_templates").insert({
      company_id: COMPANY_A_ID,
      slug: "company-default",
      categories: [...DEFAULT_EVALUATION_CATEGORIES],
    })
    expect(template.error).toBeNull()

    const evaluation = await ownerA.from("company_applicant_evaluations").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      categories: [...DEFAULT_EVALUATION_CATEGORIES],
      ratings,
      updated_by: OWNER_A_ID,
    })
    expect(evaluation.error).toBeNull()

    const rewriteCategories = await ownerA
      .from("company_applicant_evaluations")
      .update({ categories: ["Communication", "Availability", "Job-related skills"] })
      .eq("application_id", application.id)
    expect(rewriteCategories.error).not.toBeNull()

    const completeRatings = ratings.map((row) => ({ ...row, rating: 4 }))
    const updateRatings = await ownerA
      .from("company_applicant_evaluations")
      .update({ ratings: completeRatings, updated_by: OWNER_A_ID, completed_at: new Date().toISOString() })
      .eq("application_id", application.id)
    expect(updateRatings.error).toBeNull()

    const decision = await ownerA.from("company_applicant_decisions").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      decision: "advance",
      reason: "Strong weekends.",
      from_stage: "new_application",
      to_stage: "screening",
      created_by: OWNER_A_ID,
    })
    expect(decision.error).toBeNull()
    const mutateDecision = await ownerA
      .from("company_applicant_decisions")
      .update({ decision: "reject" })
      .eq("application_id", application.id)
    expect(mutateDecision.error).not.toBeNull()

    const reverse = await ownerA.from("company_applicant_decisions").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      decision: "hold",
      from_stage: "screening",
      to_stage: "screening",
      created_by: OWNER_A_ID,
    })
    expect(reverse.error).toBeNull()
    const history = await ownerA
      .from("company_applicant_decisions")
      .select("decision")
      .eq("application_id", application.id)
      .order("created_at")
    expect(history.data?.map((row) => row.decision)).toEqual(["advance", "hold"])

    const followUp = await ownerA.from("company_applicant_follow_ups").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      action: "review_video",
      due_on: "2026-04-01",
      status: "pending",
      updated_by: OWNER_A_ID,
    })
    expect(followUp.error).toBeNull()

    expect((await anon.from("company_applicant_evaluations").select("id")).data ?? []).toEqual([])
    expect((await anon.from("company_applicant_decisions").select("id")).data ?? []).toEqual([])
    expect((await anon.from("company_applicant_follow_ups").select("id")).data ?? []).toEqual([])

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_applicant_evaluations").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_applicant_decisions").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_applicant_follow_ups").select("id")).data ?? []).toEqual([])

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_applicant_evaluations").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applicant_decisions").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applicant_follow_ups").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_evaluation_templates").select("id")).data ?? []).toEqual([])

    const frozenAnswers = await ownerA
      .from("company_applications")
      .select("answers")
      .eq("id", application.id)
      .single()
    expect(frozenAnswers.data?.answers).toMatchObject({
      motivation: "I want to learn weddings.",
      experience: "I have DJed friends' parties.",
    })
  })
})
