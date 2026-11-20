import { createHash, randomBytes } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { hashInterviewToken } from "@/lib/blueprint/interview-store"
import { DEFAULT_INTERVIEW_QUESTIONS, interviewStoragePath } from "@/lib/blueprint/interviews"

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

const KEY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const ANSWER_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
]

function clear() {
  querySql(`
    delete from public.company_training_enrollments where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_interview_templates where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_applicants where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_recruiting_pages where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_interview_attempts;
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
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Apply at /join/company-a-int." },
  social: { channel: "social", title: "DJ at Company A", body: "Apply at /join/company-a-int." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Apply at /join/company-a-int." },
  general: { channel: "general", title: "DJ at Company A", body: "Apply at /join/company-a-int." },
}

const payload = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya-int@example.com",
  phone: "555-010-0199",
  location: "Austin, TX",
  availability: "Most Saturday nights.",
  experience: "I have DJed friends' parties.",
  motivation: "I want to learn weddings.",
  consent: "1",
  ownerAnswers: [],
  website: "",
}

function tokenPair() {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashInterviewToken(token) }
}

async function seedApplication() {
  const ownerA = await asUser(OWNER_A_EMAIL)
  const published = await ownerA.from("company_recruiting_pages").insert({
    company_id: COMPANY_A_ID,
    version: 1,
    status: "published",
    slug: "company-a-int",
    source_fingerprint: "b".repeat(64),
    source_strategy_id: null,
    source_strategy_version: 1,
    page_content: page,
    ads_content: ads,
  })
  expect(published.error).toBeNull()
  const anon = createAnonClient()
  const submitted = await anon.rpc("submit_recruiting_application", {
    p_slug: "company-a-int",
    p_idempotency_key: KEY,
    p_payload: payload,
    p_ip_hash: "hash-int-1",
  })
  expect(submitted.data).toEqual({ ok: true })
  const application = await ownerA.from("company_applications").select("id, applicant_id, recruiting_page_id, slug").single()
  expect(application.error).toBeNull()
  return { ownerA, anon, application: application.data! }
}

describe("video interview isolation", () => {
  it("freezes questions on invite and ignores later template edits", async () => {
    const { ownerA, application } = await seedApplication()
    const { token, tokenHash } = tokenPair()
    const invited = await ownerA.from("company_video_interviews").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      recruiting_page_id: application.recruiting_page_id,
      slug: application.slug,
      token_hash: tokenHash,
      questions: DEFAULT_INTERVIEW_QUESTIONS,
      status: "invited",
      deadline_at: new Date(Date.now() + 86400000).toISOString(),
      retention_until: new Date(Date.now() + 365 * 86400000).toISOString(),
    })
    expect(invited.error).toBeNull()
    const template = await ownerA.from("company_interview_templates").insert({
      company_id: COMPANY_A_ID,
      slug: application.slug,
      questions: DEFAULT_INTERVIEW_QUESTIONS.map((row, index) => ({
        ...row,
        prompt: index === 0 ? "Edited after invite" : row.prompt,
      })),
    })
    expect(template.error).toBeNull()
    const rewrite = await ownerA
      .from("company_video_interviews")
      .update({ questions: [{ prompt: "hack", timeLimitSeconds: 60 }] })
      .eq("application_id", application.id)
    expect(rewrite.error).not.toBeNull()
    const anon = createAnonClient()
    const opened = await anon.rpc("open_video_interview", { p_token: token, p_ip_hash: "hash-open" })
    expect(opened.error).toBeNull()
    expect(opened.data).toMatchObject({ ok: true })
    const questions = (opened.data as { questions: { prompt: string }[] }).questions
    expect(questions[0]?.prompt).toBe(DEFAULT_INTERVIEW_QUESTIONS[0]?.prompt)
    expect(questions[0]?.prompt).not.toBe("Edited after invite")
  })

  it("rejects expired tokens, duplicate submit, incomplete answers, and cross-tenant video reads", async () => {
    const { ownerA, anon, application } = await seedApplication()
    const live = tokenPair()
    const expired = tokenPair()
    await ownerA.from("company_video_interviews").insert({
      company_id: COMPANY_A_ID,
      application_id: application.id,
      applicant_id: application.applicant_id,
      recruiting_page_id: application.recruiting_page_id,
      slug: application.slug,
      token_hash: live.tokenHash,
      questions: DEFAULT_INTERVIEW_QUESTIONS,
      status: "invited",
      deadline_at: new Date(Date.now() + 86400000).toISOString(),
      retention_until: new Date(Date.now() + 365 * 86400000).toISOString(),
    })
    const opened = await anon.rpc("open_video_interview", { p_token: live.token, p_ip_hash: "hash-live" })
    expect(opened.data).toMatchObject({ ok: true, status: "opened" })

    const expiredInvite = await ownerA
      .from("company_video_interviews")
      .update({ deadline_at: new Date(Date.now() - 1000).toISOString() })
      .eq("token_hash", live.tokenHash)
    expect(expiredInvite.error).toBeNull()
    const late = await anon.rpc("open_video_interview", { p_token: live.token, p_ip_hash: "hash-late" })
    expect(late.data).toEqual({ ok: false, error: "expired" })

    const rotated = await ownerA
      .from("company_video_interviews")
      .update({
        token_hash: expired.tokenHash,
        status: "invited",
        deadline_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .eq("application_id", application.id)
      .select("id, status, token_hash, deadline_at")
    expect(rotated.error).toBeNull()
    expect(rotated.data?.[0]?.status).toBe("invited")
    expect(rotated.data?.[0]?.token_hash).toBe(expired.tokenHash)

    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00])
    const path0 = interviewStoragePath(expired.tokenHash, ANSWER_IDS[0]!, "video/webm")!
    expect(path0).toBeTruthy()
    const upload = await anon.storage.from("interview-videos").upload(path0, bytes, {
      contentType: "video/webm",
      upsert: false,
    })
    expect(upload.error).toBeNull()

    const registered = await anon.rpc("register_video_answer", {
      p_token: expired.token,
      p_ip_hash: "hash-reg",
      p_question_index: 0,
      p_storage_path: path0,
      p_content_type: "video/webm",
      p_byte_size: bytes.byteLength,
      p_duration_ms: 1200,
    })
    expect(registered.data).toEqual({ ok: true })

    const incomplete = await anon.rpc("complete_video_interview", {
      p_token: expired.token,
      p_ip_hash: "hash-complete",
    })
    expect(incomplete.data).toEqual({ ok: false, error: "incomplete" })

    for (const [index, answerId] of ANSWER_IDS.entries()) {
      if (index === 0) continue
      const path = interviewStoragePath(expired.tokenHash, answerId, "video/webm")!
      expect(
        (
          await anon.storage.from("interview-videos").upload(path, bytes, {
            contentType: "video/webm",
            upsert: false,
          })
        ).error,
      ).toBeNull()
      expect(
        (
          await anon.rpc("register_video_answer", {
            p_token: expired.token,
            p_ip_hash: `hash-reg-${index}`,
            p_question_index: index,
            p_storage_path: path,
            p_content_type: "video/webm",
            p_byte_size: bytes.byteLength,
            p_duration_ms: 1200,
          })
        ).data,
      ).toEqual({ ok: true })
    }

    const completed = await anon.rpc("complete_video_interview", {
      p_token: expired.token,
      p_ip_hash: "hash-done",
    })
    expect(completed.data).toEqual({ ok: true })
    const again = await anon.rpc("complete_video_interview", {
      p_token: expired.token,
      p_ip_hash: "hash-again",
    })
    expect(again.data).toEqual({ ok: true, already: true })
    const afterSubmit = await anon.rpc("register_video_answer", {
      p_token: expired.token,
      p_ip_hash: "hash-dup",
      p_question_index: 0,
      p_storage_path: path0,
      p_content_type: "video/webm",
      p_byte_size: bytes.byteLength,
      p_duration_ms: 1200,
    })
    expect(afterSubmit.data).toEqual({ ok: false, error: "submitted" })

    expect((await anon.from("company_video_interviews").select("id")).data ?? []).toEqual([])
    expect((await anon.storage.from("interview-videos").list("invites")).data ?? []).toEqual([])
    const listed = await anon.storage.from("interview-videos").createSignedUrl(path0, 60)
    expect(listed.error).not.toBeNull()

    const manager = await asUser(MANAGER_A_EMAIL)
    expect((await manager.from("company_video_interviews").select("id")).data ?? []).toEqual([])
    expect((await manager.storage.from("interview-videos").createSignedUrl(path0, 60)).error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_video_interviews").select("id")).data ?? []).toEqual([])
    expect((await ownerB.storage.from("interview-videos").createSignedUrl(path0, 60)).error).not.toBeNull()

    const playback = await ownerA.storage.from("interview-videos").createSignedUrl(path0, 60)
    expect(playback.error).toBeNull()
    expect(playback.data?.signedUrl).toContain("token=")

    expect(createHash("sha256").update(expired.token, "utf8").digest("hex")).toBe(expired.tokenHash)
  })
})
