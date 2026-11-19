import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { GrowthPlanningView } from "@/app/blueprint/growth-ui"
import { resolveAll } from "@/lib/blueprint/answers"
import { completeDevelopmentAnswers } from "@/lib/blueprint/development"
import { completeEventsAnswers } from "@/lib/blueprint/events"
import { completeIdealDjAnswers } from "@/lib/blueprint/ideal-dj"
import { completeNumbersAnswers } from "@/lib/blueprint/numbers"
import { completeReviewAnswers } from "@/lib/blueprint/review"
import {
  buildGrowthPlanning,
  emptyPlanningInputs,
  overlayStaffingInputs,
  parseClosingRate,
  parseWholeCount,
  planningInputsFromUnknown,
} from "@/lib/blueprint/growth"
import { staffingInputsFromOnboarding } from "@/lib/blueprint/staffing"
import { teamTodayFixture } from "@/lib/blueprint/team-today"

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

function context(
  answers: { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[] = [],
) {
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

describe("buildGrowthPlanning approval gate", () => {
  it("withholds analysis until the Blueprint is approved", () => {
    const unapproved = context(completeEventsAnswers())
    const view = buildGrowthPlanning(unapproved, resolveAll(unapproved), null)
    expect(view.gate).toBe("needs_approval")
    expect(view.analysis).toBeNull()
    const markup = html(h(GrowthPlanningView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-gate="needs_approval"')
    expect(markup).not.toContain("data-growth-rec=")
  })

  it("does not calculate from stale approval data", () => {
    const approved = approvedContext(completeEventsAnswers())
    const stale = {
      ...approved,
      answers: approved.answers.map((row) => (row.questionKey === "E2" ? { ...row, value: 90 } : row)),
    }
    const view = buildGrowthPlanning(stale, resolveAll(stale), null)
    expect(view.gate).toBe("stale")
    expect(view.analysis).toBeNull()
    const markup = html(h(GrowthPlanningView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-gate="stale"')
    expect(markup).not.toContain("data-growth-rec=")
  })

  it("does not use historical volume as the forward-looking baseline and does not change goals", () => {
    const approved = approvedContext(approvedAnswers)
    const snapshot = structuredClone(approved.goals)
    const view = buildGrowthPlanning(approved, resolveAll(approved), null)
    expect(view.gate).toBe("current")
    expect(approved.goals).toEqual(snapshot)
    expect(view.analysis?.recommendation.value).toBeNull()
    const mapped = staffingInputsFromOnboarding(resolveAll(approved))
    expect(mapped.expectedAnnualBookingsWithoutExpansion.kind).toBe("missing")
    expect(mapped.annualEventVolume.value).toBe(80)
    const markup = html(h(GrowthPlanningView, { companyName: "Company A", view }))
    expect(text(markup)).toMatch(/not a confirmed forecast|planning proxy/)
    expect(text(markup)).not.toMatch(/we recommend hiring \d+/)
    expect(markup).toContain("Company A")
    expect(markup).not.toContain("Company B")
  })

  it("uses follow-up answers for capacity and demand without writing them into Stage 1", () => {
    const approved = approvedContext(approvedAnswers)
    const inputs = emptyPlanningInputs()
    inputs.typicalLeadCapacity = { value: 40, state: "estimated" }
    inputs.targetAnnualBookings = { value: 80, state: "answered" }
    inputs.expectedBookingsWithoutExpansion = { value: 80, state: "answered" }
    inputs.closingRatePercent = { value: 25, state: "answered" }
    inputs.trainingAvailability = { value: "yes", state: "answered" }
    const view = buildGrowthPlanning(approved, resolveAll(approved), { inputs, response: null })
    expect(view.analysis?.recommendation.value).toBe("demand")
    const overlay = overlayStaffingInputs(staffingInputsFromOnboarding(resolveAll(approved)), inputs, 3)
    expect(overlay.leadDjAnnualCapacities).toEqual([
      { annualEvents: 40, estimated: true },
      { annualEvents: 40, estimated: true },
      { annualEvents: 40, estimated: true },
    ])
    expect(overlay.expectedAnnualBookingsWithoutExpansion).toMatchObject({ value: 80, kind: "present" })
    expect(overlay.targetAnnualBookings).toMatchObject({ value: 80, kind: "present" })
    const markup = html(h(GrowthPlanningView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-rec="demand"')
    expect(text(markup)).toMatch(/does not change the team size or goal/)
  })

  it("does not invent capacity or a recommendation from skipped follow-ups", () => {
    const approved = approvedContext(approvedAnswers)
    const inputs = emptyPlanningInputs()
    inputs.typicalLeadCapacity = { value: null, state: "skipped" }
    inputs.targetAnnualBookings = { value: null, state: "skipped" }
    inputs.expectedBookingsWithoutExpansion = { value: null, state: "skipped" }
    inputs.closingRatePercent = { value: null, state: "skipped" }
    inputs.trainingAvailability = { value: null, state: "skipped" }
    const view = buildGrowthPlanning(approved, resolveAll(approved), { inputs, response: null })
    expect(view.analysis?.recommendation.value).toBeNull()
    expect(view.analysis?.recommendation.status).toBe("unavailable")
    const overlay = overlayStaffingInputs(staffingInputsFromOnboarding(resolveAll(approved)), inputs, 3)
    expect(overlay.leadDjAnnualCapacities).toBeNull()
    expect(overlay.targetAnnualBookings.kind).toBe("skipped")
    expect(overlay.expectedAnnualBookingsWithoutExpansion.kind).toBe("skipped")
    expect(overlay.closingRatePercent.kind).toBe("skipped")
  })

  it("records an owner override without changing saved goals", () => {
    const approved = approvedContext(approvedAnswers)
    const snapshot = structuredClone(approved.goals)
    const inputs = emptyPlanningInputs()
    inputs.typicalLeadCapacity = { value: 40, state: "answered" }
    inputs.targetAnnualBookings = { value: 80, state: "answered" }
    inputs.expectedBookingsWithoutExpansion = { value: 80, state: "answered" }
    inputs.trainingAvailability = { value: "yes", state: "answered" }
    const view = buildGrowthPlanning(approved, resolveAll(approved), {
      inputs,
      response: { status: "modified", selectedKind: "recruit", note: "I still want to hire." },
    })
    expect(approved.goals).toEqual(snapshot)
    const markup = html(h(GrowthPlanningView, { companyName: "Company A", view }))
    expect(markup).toContain('data-growth-owner-response="modified"')
    expect(text(markup)).toMatch(/modified/)
    expect(text(markup)).toMatch(/Saved goals were not changed/)
  })
})

describe("planning parsers", () => {
  it("rejects fractional counts and allows decimal closing rates", () => {
    expect(parseWholeCount("2.5")).toEqual({ ok: false })
    expect(parseWholeCount("40")).toEqual({ ok: true, value: 40 })
    expect(parseClosingRate("12.5")).toEqual({ ok: true, value: 12.5 })
    expect(parseClosingRate("0")).toEqual({ ok: false })
    expect(parseClosingRate("150")).toEqual({ ok: false })
    expect(planningInputsFromUnknown({ typicalLeadCapacity: { value: 40.5, state: "answered" } }).typicalLeadCapacity).toEqual(
      { value: null, state: "missing" },
    )
    expect(planningInputsFromUnknown({ closingRatePercent: { value: 12.5, state: "answered" } }).closingRatePercent).toEqual({
      value: 12.5,
      state: "answered",
    })
  })
})
