import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RecruitStrategyView } from "@/app/blueprint/recruit-ui"
import { resolveAll } from "@/lib/blueprint/answers"
import { completeIdealDjAnswers } from "@/lib/blueprint/ideal-dj"
import {
  buildRecruitView,
  composeProposedStrategy,
  emptyRecruitDecisions,
  emptyRecruitInputs,
  parseRecruitDecisions,
  parseRecruitInputs,
  recruitmentSourceFingerprint,
  stage1RecruitFacts,
  type StoredRecruitStrategy,
} from "@/lib/blueprint/recruitment"
import {
  currentApprovedStrategyForAds,
  recruitmentStrategyHandoffFromApproved,
} from "@/lib/blueprint/recruitment-strategy-handoff"
import { teamTodayFixture } from "@/lib/blueprint/team-today"
import type { RecruitmentHandoff } from "@/lib/blueprint/recruitment-handoff"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const goals = { primary: { goal: "scale" as const }, others: [] }
const team = teamTodayFixture({
  currentDjCount: 4,
  desiredDjCount: 6,
  countBasis: "excludes_owner",
  desiredCountBasis: "excludes_owner",
  assistantOnlyCount: 2,
  ownerDjFrequency: "regularly",
  leadCapableCount: 3,
})

function context(
  answers: { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[] = [],
) {
  return { goals, teamToday: team, answers }
}

function form(fields: Record<string, string | string[]>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((item) => data.append(key, item))
    else data.set(key, value)
  }
  return data
}

const growth: RecruitmentHandoff = {
  companyId: "company-a",
  planId: "plan-1",
  version: 2,
  approvedAt: "2026-01-15T12:00:00.000Z",
  approvedBy: "00000000-0000-4000-8000-0000000000a2",
  hiringTarget: { count: 3, status: "owner_set", source: "owner", explanation: "You set 3." },
  hireProfile: "experienced",
  recruitingApproach: { kind: "recruit", summary: "Recruit", source: "recommended" },
  training: { canSupportBeginners: true, limitations: "", preparation: "" },
  ownerDecisions: {
    acceptedRecommendations: true,
    rejectedRecommendations: false,
    note: null,
    modifications: [],
  },
  warnings: [],
  nextSteps: [],
}

describe("recruitment parsers and fingerprints", () => {
  it("rejects a fractional hiring target and allows a missing number", () => {
    expect(parseRecruitInputs(form({ reason: "growth", hiringTarget: "1.5" })).ok).toBe(false)
    expect(parseRecruitInputs(form({ reason: "replacement" }))).toMatchObject({
      ok: true,
      value: { hiringTarget: null, reason: "replacement" },
    })
  })

  it("requires an explicit modify stance before owner overrides", () => {
    expect(parseRecruitDecisions(form({ stance: "accept" }))).toMatchObject({
      ok: true,
      value: { stance: "accept", hiringTarget: null },
    })
    expect(
      parseRecruitDecisions(form({ stance: "modify", decisionHiringTarget: "2", decisionHireProfile: "beginner" })),
    ).toMatchObject({ ok: true, value: { hiringTarget: 2, hireProfile: "beginner" } })
    expect(parseRecruitDecisions(form({ stance: "modify", decisionHiringTarget: "2.5" })).ok).toBe(false)
  })

  it("changes the fingerprint when Stage 1 facts, growth identity, or inputs change", () => {
    const resolved = resolveAll(context(completeIdealDjAnswers()))
    const facts = stage1RecruitFacts(resolved)
    const inputs = { ...emptyRecruitInputs(), reason: "growth" as const, hiringTarget: 2 }
    const first = recruitmentSourceFingerprint({ facts, growth: null, inputs })
    const changedFacts = { ...facts, beginner: "no" as const }
    expect(recruitmentSourceFingerprint({ facts: changedFacts, growth: null, inputs })).not.toBe(first)
    expect(
      recruitmentSourceFingerprint({
        facts,
        growth: { id: "plan-1", version: 2, fingerprint: "x" },
        inputs,
      }),
    ).not.toBe(first)
    expect(recruitmentSourceFingerprint({ facts, growth: null, inputs: { ...inputs, hiringTarget: 3 } })).not.toBe(
      first,
    )
  })
})

describe("buildRecruitView", () => {
  it("lets the owner recruit without a growth plan", () => {
    const ctx = context(completeIdealDjAnswers())
    const view = buildRecruitView(ctx, resolveAll(ctx), null, [])
    expect(view.growthAvailable).toBe(false)
    expect(view.growthStale).toBe(false)
    const markup = html(h(RecruitStrategyView, { companyName: "Company A", view }))
    expect(markup).toContain("data-recruit-growth=\"none\"")
    expect(markup).toContain("You can recruit without completing a growth plan")
    expect(markup).toContain('data-recruit-form="need"')
    expect(markup).not.toContain("data-recruit-hiring=")
  })

  it("offers a current growth plan and does not treat a stale plan as current", () => {
    const ctx = context(completeIdealDjAnswers())
    const resolved = resolveAll(ctx)
    const withPlan = buildRecruitView(ctx, resolved, growth, [], { growthStale: false })
    expect(withPlan.growthAvailable).toBe(true)
    expect(html(h(RecruitStrategyView, { companyName: "Company A", view: withPlan }))).toContain(
      "data-recruit-growth=\"available\"",
    )
    const stale = buildRecruitView(ctx, resolved, null, [], { growthStale: true })
    const staleHtml = html(h(RecruitStrategyView, { companyName: "Company A", view: stale }))
    expect(staleHtml).toContain("data-recruit-growth=\"stale\"")
    expect(staleHtml).toContain("is not used as a recruiting recommendation")
  })

  it("keeps an approved version when inputs change", () => {
    const ctx = context(completeIdealDjAnswers())
    const resolved = resolveAll(ctx)
    const inputs = { ...emptyRecruitInputs(), reason: "growth" as const, hiringTarget: 2, hireProfile: "beginner" as const }
    const composed = composeProposedStrategy(ctx, resolved, null, inputs)
    const approved: StoredRecruitStrategy = {
      id: "rec-1",
      version: 1,
      status: "approved",
      sourceFingerprint: composed.fingerprint,
      inputs,
      recommended: composed.proposed,
      decisions: emptyRecruitDecisions(),
      warnings: [],
      approvedBy: "00000000-0000-4000-8000-0000000000a2",
      approvedAt: "2026-01-15T12:00:00.000Z",
    }
    const current = buildRecruitView(ctx, resolved, null, [approved])
    expect(current.planStatus).toBe("approved")
    expect(current.currentApproved?.version).toBe(1)

    const changedInputs = { ...inputs, hiringTarget: 5 }
    const changed = composeProposedStrategy(ctx, resolved, null, changedInputs)
    const staleApproved: StoredRecruitStrategy = { ...approved, sourceFingerprint: "old" }
    const draft: StoredRecruitStrategy = {
      ...approved,
      id: "rec-2",
      version: 2,
      status: "draft",
      sourceFingerprint: changed.fingerprint,
      inputs: changedInputs,
      recommended: changed.proposed,
      approvedBy: null,
      approvedAt: null,
    }
    const review = buildRecruitView(ctx, resolved, null, [draft, staleApproved])
    expect(review.planStatus).toBe("needs_review")
    expect(review.previousApproved?.version).toBe(1)
    expect(review.effective?.hiringTarget).toBe(5)
    const markup = html(h(RecruitStrategyView, { companyName: "Company A", view: review }))
    expect(markup).toContain("data-recruit-previous=\"1\"")
    expect(markup).toContain("These decisions were not changed")
  })
})

describe("stage 3.2 handoff", () => {
  it("returns only a current approved strategy", () => {
    const ctx = context(completeIdealDjAnswers())
    const resolved = resolveAll(ctx)
    const inputs = { ...emptyRecruitInputs(), reason: "capacity" as const, hiringTarget: 1 }
    const composed = composeProposedStrategy(ctx, resolved, null, inputs)
    const current: StoredRecruitStrategy = {
      id: "rec-2",
      version: 2,
      status: "approved",
      sourceFingerprint: composed.fingerprint,
      inputs,
      recommended: composed.proposed,
      decisions: emptyRecruitDecisions(),
      warnings: [],
      approvedBy: "00000000-0000-4000-8000-0000000000a2",
      approvedAt: "2026-01-15T12:00:00.000Z",
    }
    const stale: StoredRecruitStrategy = { ...current, id: "rec-1", version: 1, status: "needs_review", sourceFingerprint: "old" }
    expect(currentApprovedStrategyForAds([stale, current], composed.fingerprint)?.id).toBe("rec-2")
    expect(currentApprovedStrategyForAds([stale], composed.fingerprint)).toBeNull()
    const handoff = recruitmentStrategyHandoffFromApproved("company-a", current, composed.fingerprint)
    expect(handoff?.hiringTarget).toBe(1)
    expect(handoff?.reason).toBe("capacity")
    expect(recruitmentStrategyHandoffFromApproved("company-a", stale, composed.fingerprint)).toBeNull()
  })
})
