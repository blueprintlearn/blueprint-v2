import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StaffingDemandView } from "@/app/blueprint/staffing-ui"
import { resolveAll } from "@/lib/blueprint/answers"
import { completeEventsAnswers } from "@/lib/blueprint/events"
import { completeNumbersAnswers } from "@/lib/blueprint/numbers"
import { completeReviewAnswers } from "@/lib/blueprint/review"
import { buildStaffingAnalysis, staffingInputsFromOnboarding } from "@/lib/blueprint/staffing"
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

describe("buildStaffingAnalysis approval gate", () => {
  it("withholds calculations until the Blueprint is approved", () => {
    const unapproved = context(completeEventsAnswers())
    const view = buildStaffingAnalysis(unapproved, resolveAll(unapproved))
    expect(view.gate).toBe("needs_approval")
    expect(view.analysis).toBeNull()
    const markup = html(h(StaffingDemandView, { companyName: "Company A", view }))
    expect(markup).toContain('data-staffing-gate="needs_approval"')
    expect(markup).not.toContain("data-staffing-calc=")
    expect(text(markup)).not.toContain("80")
  })

  it("does not calculate from stale approval data", () => {
    const approved = approvedContext(completeEventsAnswers())
    const stale = {
      ...approved,
      answers: approved.answers.map((row) => (row.questionKey === "E2" ? { ...row, value: 90 } : row)),
    }
    const view = buildStaffingAnalysis(stale, resolveAll(stale))
    expect(view.gate).toBe("stale")
    expect(view.analysis).toBeNull()
    const markup = html(h(StaffingDemandView, { companyName: "Company A", view }))
    expect(markup).toContain('data-staffing-gate="stale"')
    expect(markup).not.toContain("data-staffing-calc=")
    expect(text(markup)).not.toContain("80")
    expect(text(markup)).not.toContain("90")
  })

  it("uses approved onboarding facts, labels estimates, and does not invent capacity, closing rate, or booking targets", () => {
    const approved = approvedContext([
      ...completeEventsAnswers().filter((row) => row.questionKey !== "E2"),
      { questionKey: "E2", state: "estimated", value: 80 },
      ...completeNumbersAnswers(),
    ])
    const snapshot = structuredClone(approved.goals)
    const view = buildStaffingAnalysis(approved, resolveAll(approved))
    expect(view.gate).toBe("current")
    expect(view.analysis).not.toBeNull()
    expect(approved.goals).toEqual(snapshot)
    expect(view.analysis?.currentStaffing.teamDjCount.value).toBe(4)
    expect(view.analysis?.currentStaffing.independentLeadCount.value).toBe(3)
    expect(view.analysis?.currentStaffing.assistantOnlyCount.value).toBe(2)
    expect(view.analysis?.currentStaffing.independentLeadCount.value).not.toBe(5)
    expect(view.analysis?.currentStaffing.ownerInvolvement.value).toBe("regularly")
    expect(view.analysis?.currentStaffing.annualEventVolume).toMatchObject({ status: "estimated", value: 80 })
    expect(view.analysis?.availableAnnualCapacity.status).toBe("unavailable")
    expect(view.analysis?.additionalBookingsNeeded.status).toBe("unavailable")
    expect(view.analysis?.additionalQualifiedLeadsAnnually.status).toBe("unavailable")
    expect(view.analysis?.potentialAdditionalGrossRevenue.status).toBe("unavailable")

    const mapped = staffingInputsFromOnboarding(resolveAll(approved))
    expect(mapped.leadDjAnnualCapacities).toBeNull()
    expect(mapped.closingRatePercent.kind).toBe("missing")
    expect(mapped.targetAnnualBookings.kind).toBe("missing")
    expect(mapped.expectedAnnualBookingsWithoutExpansion).toMatchObject({ value: 80, kind: "estimated" })
    expect(mapped.averageSales).toEqual([{ label: "Typical event price", amount: 1800, estimated: false }])

    const markup = html(h(StaffingDemandView, { companyName: "Company A", view }))
    expect(markup).toContain("Company A")
    expect(markup).not.toContain("Company B")
    expect(text(markup)).toContain("Not available yet")
    expect(text(markup)).toMatch(/does not invent a closing percentage|Closing rate was not collected/)
    expect(text(markup)).not.toMatch(/we recommend|hire \d+ DJs/)
    expect(markup).toContain('data-staffing-status="estimated"')
  })
})
