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

function clearPages() {
  querySql(`
    delete from public.company_applicants where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_recruiting_pages where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
  `)
}

beforeEach(clearPages)
afterAll(clearPages)

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
}

const ads = {
  indeed: { channel: "indeed", title: "DJ at Company A", body: "Read the role at /join/company-a. Applications are not open yet." },
  social: { channel: "social", title: "DJ at Company A", body: "Read the role at /join/company-a. Applications are not open yet." },
  referral: { channel: "referral", title: "DJ at Company A", body: "Read the role at /join/company-a. Applications are not open yet." },
  general: { channel: "general", title: "DJ at Company A", body: "Read the role at /join/company-a. Applications are not open yet." },
}

describe("company_recruiting_pages isolation", () => {
  it("lets owner A draft and publish; others cannot read drafts or ads", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const draft = await ownerA.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 1,
      status: "draft",
      slug: "company-a-jobs",
      source_fingerprint: "a".repeat(64),
      source_strategy_id: null,
      source_strategy_version: 1,
      page_content: page,
      ads_content: ads,
    })
    expect(draft.error).toBeNull()

    const published = await ownerA.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 2,
      status: "published",
      slug: "company-a-jobs",
      source_fingerprint: "b".repeat(64),
      page_content: page,
      ads_content: ads,
      published_by: "00000000-0000-4000-8000-0000000000b2",
      published_at: "1999-01-01T00:00:00.000Z",
    })
    expect(published.error).toBeNull()
    const stamped = await ownerA
      .from("company_recruiting_pages")
      .select("published_by, published_at, status, version, ads_content")
      .eq("version", 2)
      .single()
    expect(stamped.data?.status).toBe("published")
    expect(stamped.data?.published_by).not.toBe("00000000-0000-4000-8000-0000000000b2")
    expect(stamped.data?.published_at).not.toBe("1999-01-01T00:00:00.000Z")
    expect(stamped.data?.ads_content).toEqual(ads)

    const rewrite = await ownerA
      .from("company_recruiting_pages")
      .update({ page_content: { ...page, headline: "Changed silently" } })
      .eq("version", 2)
      .eq("company_id", COMPANY_A_ID)
    expect(rewrite.error).not.toBeNull()

    const managerA = await asUser(MANAGER_A_EMAIL)
    expect((await managerA.from("company_recruiting_pages").select("id")).data ?? []).toEqual([])
    const managerWrite = await managerA.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 3,
      status: "published",
      slug: "stolen",
      source_fingerprint: "c".repeat(64),
      page_content: page,
      ads_content: ads,
    })
    expect(managerWrite.error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_recruiting_pages").select("id")).data ?? []).toEqual([])
    const writeA = await ownerB.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 3,
      status: "draft",
      slug: "stolen-b",
      source_fingerprint: "d".repeat(64),
      page_content: page,
      ads_content: ads,
    })
    expect(writeA.error).not.toBeNull()

    const anon = createAnonClient()
    expect((await anon.from("company_recruiting_pages").select("id")).data ?? []).toEqual([])
    const publicPage = await anon.rpc("get_published_recruiting_page", { p_slug: "company-a-jobs" })
    expect(publicPage.error).toBeNull()
    expect(publicPage.data).toMatchObject({
      slug: "company-a-jobs",
      page_content: page,
    })
    expect(JSON.stringify(publicPage.data)).not.toContain("indeed")
    const draftLookup = await anon.rpc("get_published_recruiting_page", { p_slug: "missing-page" })
    expect(draftLookup.data).toBeNull()
  })

  it("rejects an invalid slug and keeps slugs unique across companies", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const bad = await ownerA.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 1,
      status: "draft",
      slug: "JOIN",
      source_fingerprint: "a".repeat(64),
      page_content: page,
      ads_content: ads,
    })
    expect(bad.error).not.toBeNull()

    const ok = await ownerA.from("company_recruiting_pages").insert({
      company_id: COMPANY_A_ID,
      version: 1,
      status: "draft",
      slug: "company-a-jobs",
      source_fingerprint: "a".repeat(64),
      page_content: page,
      ads_content: ads,
    })
    expect(ok.error).toBeNull()

    expect(() =>
      querySql(`
        insert into public.company_recruiting_pages (
          company_id, version, status, slug, source_fingerprint, page_content, ads_content
        ) values (
          '${COMPANY_B_ID}', 1, 'draft', 'company-a-jobs', '${"b".repeat(64)}',
          '${JSON.stringify(page).replace(/'/g, "''")}'::jsonb,
          '${JSON.stringify(ads).replace(/'/g, "''")}'::jsonb
        );
      `),
    ).toThrow(/slug is taken/)
  })
})
