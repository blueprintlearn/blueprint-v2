import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  MANAGER_A_EMAIL,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
} from "./helpers"
import { querySql } from "./sql"

const KEY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const KEY_TWO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function clearApplicants() {
  querySql(`
    delete from public.company_applicants where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_recruiting_pages where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_application_attempts;
  `)
}

beforeEach(clearApplicants)
afterAll(clearApplicants)

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
  applicationQuestions: ["Can you work New Year's Eve?"],
}

const ads = {
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Apply at /join/company-a-apply." },
  social: { channel: "social", title: "DJ at Company A", body: "Apply at /join/company-a-apply." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Apply at /join/company-a-apply." },
  general: { channel: "general", title: "DJ at Company A", body: "Apply at /join/company-a-apply." },
}

const payload = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consent: "1",
  ownerAnswers: ["Yes, I can."],
  website: "",
}

async function publishPage() {
  const ownerA = await asUser(OWNER_A_EMAIL)
  const published = await ownerA.from("company_recruiting_pages").insert({
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    slug: "company-a-apply",
    source_fingerprint: "a".repeat(64),
    source_strategy_id: null,
    source_strategy_version: 1,
    page_content: page,
    ads_content: ads,
  })
  expect(published.error).toBeNull()
  return ownerA
}

describe("company applicant isolation", () => {
  it("lets a public visitor apply to a published page and keeps the record in company A", async () => {
    const ownerA = await publishPage()
    const anon = createAnonClient()
    const submitted = await anon.rpc("submit_recruiting_application", {
      p_slug: "company-a-apply",
      p_idempotency_key: KEY,
      p_payload: payload,
      p_ip_hash: "hash-apply-1",
    })
    expect(submitted.error).toBeNull()
    expect(submitted.data).toEqual({ ok: true })

    const retry = await anon.rpc("submit_recruiting_application", {
      p_slug: "company-a-apply",
      p_idempotency_key: KEY,
      p_payload: payload,
      p_ip_hash: "hash-apply-1",
    })
    expect(retry.data).toEqual({ ok: true })

    const later = await anon.rpc("submit_recruiting_application", {
      p_slug: "company-a-apply",
      p_idempotency_key: KEY_TWO,
      p_payload: { ...payload, motivation: "I applied again after another event season." },
      p_ip_hash: "hash-apply-1",
    })
    expect(later.data).toEqual({ ok: true })

    expect((await anon.from("company_applicants").select("id")).data ?? []).toEqual([])
    expect((await anon.from("company_applications").select("id")).data ?? []).toEqual([])
    expect(JSON.stringify(submitted)).not.toMatch(/already|exists/i)

    const people = await ownerA.from("company_applicants").select("email, first_name")
    expect(people.data).toHaveLength(1)
    expect(people.data?.[0]?.email).toBe("maya@example.com")
    const applications = await ownerA
      .from("company_applications")
      .select("stage, answers, slug, role_title")
      .order("submitted_at")
    expect(applications.data).toHaveLength(2)
    expect(applications.data?.every((row) => row.stage === "new_application")).toBe(true)
    expect(applications.data?.[0]?.answers).toMatchObject({
      firstName: "Maya",
      ownerQuestions: [{ prompt: "Can you work New Year's Eve?", answer: "Yes, I can." }],
    })
    expect(applications.data?.[1]?.answers).toMatchObject({
      motivation: "I applied again after another event season.",
    })
  })

  it("refuses unpublished pages and does not leak applicant rows", async () => {
    const ownerA = await publishPage()
    await ownerA.from("company_recruiting_pages").update({ status: "unpublished" }).eq("slug", "company-a-apply")
    const anon = createAnonClient()
    const denied = await anon.rpc("submit_recruiting_application", {
      p_slug: "company-a-apply",
      p_idempotency_key: KEY,
      p_payload: payload,
      p_ip_hash: "hash-closed",
    })
    expect(denied.data).toEqual({ ok: false, error: "not_accepting" })
    expect((await ownerA.from("company_applications").select("id")).data ?? []).toEqual([])
  })

  it("blocks managers, other companies, and public reads of the pipeline", async () => {
    await publishPage()
    const anon = createAnonClient()
    await anon.rpc("submit_recruiting_application", {
      p_slug: "company-a-apply",
      p_idempotency_key: KEY,
      p_payload: payload,
      p_ip_hash: "hash-iso",
    })

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_applicants").select("id")).data ?? []).toEqual([])
    expect((await manager.from("company_applications").select("id")).data ?? []).toEqual([])

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_applicants").select("id")).data ?? []).toEqual([])
    expect((await ownerB.from("company_applications").select("id")).data ?? []).toEqual([])

    const ownerA = await asUser(OWNER_A_EMAIL)
    const application = await ownerA.from("company_applications").select("id, answers, stage").single()
    expect(application.error).toBeNull()
    const rewrite = await ownerA
      .from("company_applications")
      .update({ answers: { ...payload, motivation: "changed" } })
      .eq("id", application.data!.id)
    expect(rewrite.error).not.toBeNull()
    const moved = await ownerA
      .from("company_applications")
      .update({ stage: "screening" })
      .eq("id", application.data!.id)
    expect(moved.error).toBeNull()
    const events = await ownerA
      .from("company_applicant_stage_events")
      .select("from_stage, to_stage")
      .order("changed_at")
    expect(events.data?.map((row) => row.to_stage)).toEqual(["new_application", "screening"])

    const note = await ownerA.from("company_applicant_notes").insert({
      company_id: COMPANY_A_ID,
      applicant_id: (await ownerA.from("company_applicants").select("id").single()).data!.id,
      application_id: application.data!.id,
      body: "Call after Friday.",
      created_by: "00000000-0000-4000-8000-0000000000a2",
    })
    expect(note.error).toBeNull()
    expect((await ownerB.from("company_applicant_notes").select("id")).data ?? []).toEqual([])
  })

  it("treats a filled honeypot as success without creating an applicant", async () => {
    await publishPage()
    const anon = createAnonClient()
    const spam = await anon.rpc("submit_recruiting_application", {
      p_slug: "company-a-apply",
      p_idempotency_key: KEY,
      p_payload: { ...payload, website: "https://spam.example" },
      p_ip_hash: "hash-spam",
    })
    expect(spam.data).toEqual({ ok: true })
    const ownerA = await asUser(OWNER_A_EMAIL)
    expect((await ownerA.from("company_applicants").select("id")).data ?? []).toEqual([])
  })
})
