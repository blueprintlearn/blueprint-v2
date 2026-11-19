import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RecruitingMaterialsView } from "@/app/blueprint/recruiting-ui"
import { JoinRecruitingPage } from "@/app/join-page-ui"
import {
  RECRUITING_NEED_STRATEGY,
  RECRUITING_SLUG_MESSAGE,
  RECRUITING_STALE_STRATEGY,
  buildRecruitingView,
  fingerprintOf,
  parseRecruitingEditor,
  type StoredRecruitingPage,
} from "@/lib/blueprint/recruiting"
import { composeRecruitingMaterials } from "@/lib/blueprint/recruiting-engine"
import { recruitingApplicationHandoffFromPublished } from "@/lib/blueprint/recruiting-application-handoff"
import type { RecruitmentStrategyHandoff } from "@/lib/blueprint/recruitment-strategy-handoff"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const handoff: RecruitmentStrategyHandoff = {
  companyId: "company-a",
  strategyId: "strat-1",
  version: 1,
  approvedAt: "2026-01-15T12:00:00.000Z",
  approvedBy: "user-a",
  reason: "growth",
  hiringTarget: 2,
  hireProfile: "experienced",
  candidate: {
    required: ["Lead typical events to the company’s standard."],
    preferred: [],
    values: [],
  },
  employment: {
    arrangement: null,
    compensation: "Not provided. Blueprint will not invent a rate or local market price.",
  },
  channels: ["indeed"],
  budgetApproach: "Unpaid channels first.",
  nextSteps: [],
  ownerNote: null,
}

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

const generated = composeRecruitingMaterials("Company A", handoff, "/join/company-a")

const editorFields = {
  slug: "company-a",
  companyName: generated.page.companyName,
  headline: generated.page.headline,
  introduction: generated.page.introduction,
  roleTitle: generated.page.roleTitle,
  roleDescription: generated.page.roleDescription,
  responsibilities: generated.page.responsibilities.join("\n"),
  required: generated.page.required.join("\n"),
  preferred: generated.page.preferred.join("\n"),
  indeedTitle: generated.ads.indeed.title,
  indeedBody: generated.ads.indeed.body,
  socialTitle: generated.ads.social.title,
  socialBody: generated.ads.social.body,
  referralTitle: generated.ads.referral.title,
  referralBody: generated.ads.referral.body,
  generalTitle: generated.ads.general.title,
  generalBody: generated.ads.general.body,
}

function stored(status: StoredRecruitingPage["status"], overrides: Partial<StoredRecruitingPage> = {}): StoredRecruitingPage {
  return {
    id: `${status}-1`,
    version: 1,
    status,
    slug: "company-a",
    sourceFingerprint: fingerprintOf(handoff),
    sourceStrategyId: handoff.strategyId,
    sourceStrategyVersion: handoff.version,
    page: generated.page,
    ads: generated.ads,
    publishedBy: status === "draft" ? null : "user-a",
    publishedAt: status === "draft" ? null : "2026-01-16T12:00:00.000Z",
    ...overrides,
  }
}

describe("recruiting editor parsing", () => {
  it("rejects an unsafe slug and accepts a valid editor", () => {
    expect(parseRecruitingEditor(form({ ...editorFields, slug: "JOIN" }))).toEqual({
      ok: false,
      error: RECRUITING_SLUG_MESSAGE,
    })
    expect(parseRecruitingEditor(form({ ...editorFields, slug: "a/../b" })).ok).toBe(false)
    const parsed = parseRecruitingEditor(form(editorFields))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.slug).toBe("company-a")
    expect(parsed.value.ads.indeed.title).toBe(generated.ads.indeed.title)
  })
})

describe("buildRecruitingView", () => {
  it("sends the owner to Stage 3.1 when there is no current approved strategy", () => {
    const view = buildRecruitingView({ companyName: "Company A", handoff: null, rows: [] })
    expect(view.strategyStatus).toBe("missing")
    expect(view.pageStatus).toBe("none")
    const markup = html(h(RecruitingMaterialsView, { companyName: "Company A", view }))
    expect(markup).toContain(RECRUITING_NEED_STRATEGY)
    expect(markup).toContain("href=\"/blueprint/recruit\"")
    expect(markup).not.toContain("data-recruiting-form=\"editor\"")
  })

  it("keeps published copy when the strategy fingerprint changes", () => {
    const published = stored("published")
    const staleHandoff = { ...handoff, version: 2, approvedAt: "2026-02-01T12:00:00.000Z" }
    const view = buildRecruitingView({
      companyName: "Company A",
      handoff: staleHandoff,
      rows: [published],
    })
    expect(view.needsStrategyReview).toBe(true)
    expect(view.published?.page.headline).toBe(published.page.headline)
    expect(view.pageStatus).toBe("published")
    const markup = html(h(RecruitingMaterialsView, { companyName: "Company A", view }))
    expect(markup).toContain(RECRUITING_STALE_STRATEGY)
    expect(markup).toContain("Live published version")
  })

  it("treats a published page with no current strategy as needing review, not missing", () => {
    const published = stored("published")
    const view = buildRecruitingView({ companyName: "Company A", handoff: null, rows: [published] })
    expect(view.strategyStatus).toBe("stale")
    expect(view.needsStrategyReview).toBe(true)
    expect(view.pageStatus).toBe("published")
  })
})

describe("public recruiting page", () => {
  it("keeps applications closed on an owner preview", () => {
    const markup = html(h(JoinRecruitingPage, { page: generated.page, preview: true }))
    expect(markup).toContain("data-apply=\"disabled\"")
    expect(markup).toContain("Applications are not open yet")
    expect(markup).not.toMatch(/Submit application/)
  })
})

describe("stage 3.3 application handoff", () => {
  it("identifies the published campaign and sends applications to the hosted form", () => {
    expect(
      recruitingApplicationHandoffFromPublished({
        companyId: "company-a",
        pageId: "page-1",
        pageVersion: 2,
        slug: "company-a",
        strategyId: "strat-1",
        strategyVersion: 1,
        roleTitle: "Experienced DJ",
      }),
    ).toEqual({
      companyId: "company-a",
      pageId: "page-1",
      pageVersion: 2,
      slug: "company-a",
      strategyId: "strat-1",
      strategyVersion: 1,
      roleTitle: "Experienced DJ",
      campaignStatus: "published",
      applicationDestination: "blueprint_form",
    })
  })
})
