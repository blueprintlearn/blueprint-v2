import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { GrowthPlanView } from "@/app/blueprint/growth-plan-ui"
import { resolveAll } from "@/lib/blueprint/answers"
import { completeDevelopmentAnswers } from "@/lib/blueprint/development"
import { completeEventsAnswers } from "@/lib/blueprint/events"
import { completeIdealDjAnswers } from "@/lib/blueprint/ideal-dj"
import { completeNumbersAnswers } from "@/lib/blueprint/numbers"
import { completeReviewAnswers } from "@/lib/blueprint/review"
import {
  buildGrowthPlanView,
  emptyDecisions,
  growthPlanSourceFingerprint,
  parseGrowthPlanDecisions,
} from "@/lib/blueprint/growth-plan"
import { emptyPlanningInputs, parseWholeCount as parseCount } from "@/lib/blueprint/growth"
import { teamTodayFixture } from "@/lib/blueprint/team-today"
import { currentApprovedPlanForRecruitment, recruitmentHandoffFromApproved } from "@/lib/blueprint/recruitment-handoff"
import type { StoredGrowthPlan } from "@/lib/blueprint/growth-plan"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

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

function context(answers: { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[] = []) {
  return { goals, teamToday: team, answers }
}

function approvedContext(
  answers: { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[] = [],
) {
  const withoutReview = answers.filter((row) => row.questionKey !== "R1")
  const base = context(withoutReview)
  return context([...withoutReview, ...completeReviewAnswers(base)])
}

const approvedAnswers = [
  ...completeEventsAnswers(),
  ...completeNumbersAnswers(),
  ...completeDevelopmentAnswers(),
  ...completeIdealDjAnswers(),
  { questionKey: "G3", state: "answered" as const, value: "1_to_2_years" },
]

function filledInputs() {
  const inputs = emptyPlanningInputs()
  inputs.typicalLeadCapacity = { value: 40, state: "answered" }
  inputs.targetAnnualBookings = { value: 80, state: "answered" }
  inputs.expectedBookingsWithoutExpansion = { value: 80, state: "answered" }
  inputs.trainingAvailability = { value: "yes", state: "answered" }
  return inputs
}

describe("buildGrowthPlanView", () => {
  it("withholds the plan until the Blueprint is approved", () => {
    const unapproved = context(completeEventsAnswers())
    const view = buildGrowthPlanView(unapproved, resolveAll(unapproved), null, [])
    expect(view.gate).toBe("needs_approval")
    expect(view.proposed).toBeNull()
    const markup = html(h(GrowthPlanView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-plan-gate="needs_approval"')
    expect(markup).not.toContain("data-growth-plan-hiring=")
  })

  it("does not use a stale Blueprint as a current plan", () => {
    const approved = approvedContext(completeEventsAnswers())
    const stale = {
      ...approved,
      answers: approved.answers.map((row) => (row.questionKey === "E2" ? { ...row, value: 90 } : row)),
    }
    const view = buildGrowthPlanView(stale, resolveAll(stale), null, [])
    expect(view.gate).toBe("stale")
    expect(view.currentApproved).toBeNull()
    const markup = html(h(GrowthPlanView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-plan-gate="stale"')
  })

  it("marks hiring unavailable when follow-ups are missing", () => {
    const approved = approvedContext(approvedAnswers)
    const snapshot = structuredClone(approved.goals)
    const view = buildGrowthPlanView(approved, resolveAll(approved), null, [])
    expect(approved.goals).toEqual(snapshot)
    expect(view.proposed?.hiring.recommendedTarget.status).toBe("unavailable")
    const markup = html(h(GrowthPlanView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-plan-hiring="unavailable"')
    expect(text(markup)).toMatch(/Not available yet/)
  })

  it("builds a demand-first plan from follow-ups without changing goals", () => {
    const approved = approvedContext(approvedAnswers)
    const snapshot = structuredClone(approved.goals)
    const view = buildGrowthPlanView(approved, resolveAll(approved), { inputs: filledInputs(), response: null }, [])
    expect(approved.goals).toEqual(snapshot)
    expect(view.proposed?.summary.primaryObstacle.kind).toBe("demand")
    expect(view.proposed?.hiring.recommendedTarget.value).toBe(0)
    const markup = html(h(GrowthPlanView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-plan-obstacle="demand"')
    expect(markup).toContain('data-growth-plan-hiring="0"')
  })

  it("keeps a previously approved version when inputs change", () => {
    const approved = approvedContext(approvedAnswers)
    const first = buildGrowthPlanView(approved, resolveAll(approved), { inputs: filledInputs(), response: null }, [])
    const stored: StoredGrowthPlan = {
      id: "plan-1",
      version: 1,
      status: "needs_review",
      sourceFingerprint: "old",
      recommended: first.proposed!,
      decisions: {
        stance: "modify",
        hiringTarget: 3,
        hireProfile: "experienced",
        recruitingKind: "recruit",
        note: null,
      },
      warnings: [],
      approvedBy: "00000000-0000-4000-8000-0000000000a2",
      approvedAt: "2026-01-15T12:00:00.000Z",
    }
    const changed = filledInputs()
    changed.typicalLeadCapacity = { value: 30, state: "answered" }
    const view = buildGrowthPlanView(approved, resolveAll(approved), { inputs: changed, response: null }, [stored])
    expect(view.planStatus).toBe("needs_review")
    expect(view.previousApproved?.version).toBe(1)
    expect(view.currentApproved).toBeNull()
    const markup = html(h(GrowthPlanView, { companyName: "Company A", view }))
    expect(markup).toContain("data-growth-plan-needs-review")
    expect(markup).toContain('data-growth-plan-previous="1"')
    expect(text(markup)).toMatch(/were not changed/)
    expect(text(markup)).toMatch(/Approved hiring target: 3 additional DJs/)
  })

  it("does not treat an owner hiring number as a Blueprint estimate or duplicate warnings", () => {
    const approved = approvedContext(approvedAnswers)
    const first = buildGrowthPlanView(approved, resolveAll(approved), { inputs: filledInputs(), response: null }, [])
    const stored: StoredGrowthPlan = {
      id: "plan-1",
      version: 1,
      status: "approved",
      sourceFingerprint: first.fingerprint!,
      recommended: first.proposed!,
      decisions: {
        stance: "modify",
        hiringTarget: 3,
        hireProfile: "experienced",
        recruitingKind: "recruit",
        note: null,
      },
      warnings: [
        {
          title: "Your hiring target conflicts with the analysis",
          explanation: "Stored copy of the same warning.",
        },
      ],
      approvedBy: "00000000-0000-4000-8000-0000000000a2",
      approvedAt: "2026-01-15T12:00:00.000Z",
    }
    const view = buildGrowthPlanView(approved, resolveAll(approved), { inputs: filledInputs(), response: null }, [stored])
    expect(view.effective?.hiringTarget.value).toBe(3)
    expect(view.effective?.warnings.filter((row) => row.title === "Your hiring target conflicts with the analysis")).toHaveLength(1)
    const markup = html(h(GrowthPlanView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-plan-hiring-source="owner"')
    const hiringHtml = markup.slice(
      markup.indexOf("data-growth-plan-hiring="),
      markup.indexOf("growth-plan-recruiting-title"),
    )
    expect(hiringHtml).not.toContain("Blueprint estimated this")
    expect(hiringHtml).toContain("You set the hiring target to 3")
    expect((markup.match(/Your hiring target conflicts with the analysis/g) ?? []).length).toBe(1)
  })
})

describe("fingerprints and parsers", () => {
  it("changes the fingerprint when planning inputs change, not when goals objects are reused", () => {
    const approved = approvedContext(approvedAnswers)
    const stage1 = JSON.stringify(approved.goals)
    const first = growthPlanSourceFingerprint("stage-1", filledInputs(), null)
    const changed = filledInputs()
    changed.targetAnnualBookings = { value: 120, state: "answered" }
    const second = growthPlanSourceFingerprint("stage-1", changed, null)
    expect(first).not.toBe(second)
    expect(JSON.stringify(approved.goals)).toBe(stage1)
  })

  it("rejects fractional hiring targets", () => {
    expect(parseCount("2.5")).toEqual({ ok: false })
    expect(parseGrowthPlanDecisions({
      stance: "modify",
      hiringTarget: "2.5",
      hireProfile: "experienced",
      recruitingKind: "recruit",
      note: "",
    }).ok).toBe(false)
    expect(parseGrowthPlanDecisions({
      stance: "modify",
      hiringTarget: "2",
      hireProfile: "experienced",
      recruitingKind: "recruit",
      note: "",
    })).toMatchObject({ ok: true, value: { hiringTarget: 2 } })
  })
})

describe("recruitment handoff", () => {
  it("returns only a current approved plan", () => {
    const approved = approvedContext(approvedAnswers)
    const view = buildGrowthPlanView(approved, resolveAll(approved), { inputs: filledInputs(), response: null }, [])
    const fingerprint = view.fingerprint!
    const current: StoredGrowthPlan = {
      id: "plan-2",
      version: 2,
      status: "approved",
      sourceFingerprint: fingerprint,
      recommended: view.proposed!,
      decisions: emptyDecisions(),
      warnings: [],
      approvedBy: "00000000-0000-4000-8000-0000000000a2",
      approvedAt: "2026-01-15T12:00:00.000Z",
    }
    const stale: StoredGrowthPlan = { ...current, id: "plan-1", version: 1, status: "needs_review", sourceFingerprint: "old" }
    expect(currentApprovedPlanForRecruitment([stale, current], fingerprint)?.id).toBe("plan-2")
    expect(currentApprovedPlanForRecruitment([stale], fingerprint)).toBeNull()
    const handoff = recruitmentHandoffFromApproved("company-a", current, fingerprint)
    expect(handoff?.hiringTarget.count).toBe(0)
    expect(handoff?.ownerDecisions.acceptedRecommendations).toBe(true)
    expect(recruitmentHandoffFromApproved("company-a", stale, fingerprint)).toBeNull()
  })
})
