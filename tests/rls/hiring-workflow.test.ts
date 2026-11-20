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

const KEY = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

function clear() {
  querySql(`
    delete from public.company_training_enrollments where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_hiring_outcomes where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_auditions where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_conversations where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_hiring_activities where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicant_hiring_paths where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
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
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Apply at /join/company-a-hire." },
  social: { channel: "social", title: "DJ at Company A", body: "Apply at /join/company-a-hire." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Apply at /join/company-a-hire." },
  general: { channel: "general", title: "DJ at Company A", body: "Apply at /join/company-a-hire." },
}

const payload = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya-hire@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consent: "1",
  ownerAnswers: [],
  website: "",
}

async function seedApplication() {
  const ownerA = await asUser(OWNER_A_EMAIL)
  const published = await ownerA.from("company_recruiting_pages").insert({
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    slug: "company-a-hire",
    source_fingerprint: "d".repeat(64),
    source_strategy_id: null,
    source_strategy_version: 1,
    page_content: page,
    ads_content: ads,
  })
  expect(published.error).toBeNull()
  const anon = createAnonClient()
  const submitted = await anon.rpc("submit_recruiting_application", {
    p_slug: "company-a-hire",
    p_idempotency_key: KEY,
    p_payload: payload,
    p_ip_hash: "hash-hire-1",
  })
  expect(submitted.data).toEqual({ ok: true })
  const application = await ownerA
    .from("company_applications")
    .select("id, applicant_id")
    .single()
  expect(application.error).toBeNull()
  return { ownerA, anon, application: application.data! }
}

describe("hiring workflow isolation", () => {
  it("lets an owner record hiring work while blocking others and keeping outcomes append-only", async () => {
    const { ownerA, anon, application } = await seedApplication()

    const path = await ownerA.from("company_applicant_hiring_paths").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      path_kind: "beginner",
      updated_by: OWNER_A_ID,
    })
    expect(path.error).toBeNull()

    const activity = await ownerA.from("company_applicant_hiring_activities").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      activity_key: "review_application",
      title: "Review application",
      required: true,
      sort_order: 0,
      status: "pending",
      updated_by: OWNER_A_ID,
    })
    expect(activity.error).toBeNull()

    const complete = await ownerA
      .from("company_applicant_hiring_activities")
      .update({ status: "complete", completed_at: new Date().toISOString(), completed_by: OWNER_A_ID, updated_by: OWNER_A_ID })
      .eq("application_id", application.id)
    expect(complete.error).toBeNull()

    const rewriteKey = await ownerA
      .from("company_applicant_hiring_activities")
      .update({ activity_key: "custom" })
      .eq("application_id", application.id)
    expect(rewriteKey.error).not.toBeNull()

    const conversation = await ownerA.from("company_applicant_conversations").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      conversation_type: "phone",
      planned_at: "2026-04-02T15:00:00.000Z",
      status: "planned",
      notes: "Ask about weekends.",
      next_action: "Offer an audition if it goes well.",
      person_responsible: "Alex",
      created_by: OWNER_A_ID,
      updated_by: OWNER_A_ID,
    })
    expect(conversation.error).toBeNull()

    const ratings = DEFAULT_AUDITION_SKILLS.map((category) => ({ category, rating: 4, notes: null }))
    const audition = await ownerA.from("company_applicant_auditions").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      title: "Saturday setup check",
      description: "Set up two speakers.",
      skills: [...DEFAULT_AUDITION_SKILLS],
      scheduled_at: "2026-04-10T18:00:00.000Z",
      location_or_format: "Studio",
      evaluator_name: "Alex",
      status: "planned",
      notes: "Optional check, not a certification.",
      skill_ratings: ratings,
      created_by: OWNER_A_ID,
      updated_by: OWNER_A_ID,
    })
    expect(audition.error).toBeNull()

    const decision = await ownerA.from("company_applicant_decisions").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      decision: "hired",
      reason: "Ready to start.",
      from_stage: "decision",
      to_stage: "hired",
      created_by: OWNER_A_ID,
    })
    expect(decision.error).toBeNull()
    const decisionRow = await ownerA
      .from("company_applicant_decisions")
      .select("id")
      .eq("application_id", application.id)
      .single()

    const outcome = await ownerA.from("company_applicant_hiring_outcomes").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      decision_id: decisionRow.data?.id,
      outcome: "hired",
      intended_role: "DJ",
      planned_start_date: "2026-05-01",
      engagement_model: "w2",
      notes: "Owner-provided W-2 intention.",
      created_by: OWNER_A_ID,
    })
    expect(outcome.error).toBeNull()

    const mutateOutcome = await ownerA
      .from("company_applicant_hiring_outcomes")
      .update({ outcome: "reversed" })
      .eq("application_id", application.id)
    expect(mutateOutcome.error).not.toBeNull()

    const reverse = await ownerA.from("company_applicant_hiring_outcomes").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      outcome: "reversed",
      intended_role: "DJ",
      engagement_model: "w2",
      notes: "Correcting after a second conversation.",
      created_by: OWNER_A_ID,
    })
    expect(reverse.error).toBeNull()
    const history = await ownerA
      .from("company_applicant_hiring_outcomes")
      .select("outcome")
      .eq("application_id", application.id)
      .order("created_at")
    expect(history.data?.map((row) => row.outcome)).toEqual(["hired", "reversed"])

    expect((await anon.from("company_applicant_hiring_paths").select("id")).data ?? []).toEqual([])
    expect((await anon.from("company_applicant_conversations").select("id")).data ?? []).toEqual([])
    expect((await anon.from("company_applicant_auditions").select("id")).data ?? []).toEqual([])
    expect((await anon.from("company_applicant_hiring_outcomes").select("id")).data ?? []).toEqual([])

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_applicant_conversations").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_applicant_auditions").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_applicant_hiring_outcomes").select("id")).data ?? []).toEqual([])

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_applicant_hiring_paths").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applicant_conversations").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applicant_auditions").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applicant_hiring_outcomes").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applicant_hiring_activities").select("id")).data ?? []).toEqual([])
  })
})
