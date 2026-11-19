import { describe, expect, it } from "vitest"

import { analyzeGrowth, emptyChoice, presentChoice } from "@/lib/blueprint/growth-engine"
import {
  applyOwnerDecisions,
  composeRecommendedGrowthPlan,
  emptyDecisions,
  recommendedHiringTarget,
} from "@/lib/blueprint/growth-plan-engine"
import { analyzeStaffing, emptyNumeric, present, type StaffingEngineInput } from "@/lib/blueprint/staffing-engine"

function staffingInput(partial: Partial<StaffingEngineInput> = {}): StaffingEngineInput {
  return {
    teamDjCount: present(4),
    leadCapableCount: present(3),
    assistantOnlyCount: present(1),
    ownerDjFrequency: "regularly",
    ownerDjFrequencyKind: "present",
    annualEventVolume: present(80),
    leadDjAnnualCapacities: [
      { annualEvents: 40, estimated: true },
      { annualEvents: 40, estimated: true },
      { annualEvents: 40, estimated: true },
    ],
    targetAnnualBookings: present(80),
    expectedAnnualBookingsWithoutExpansion: present(80),
    closingRatePercent: emptyNumeric(),
    averageSales: null,
    ...partial,
  }
}

function planFrom(staffingPartial: Partial<StaffingEngineInput> = {}, training: "yes" | "no" | "limited" | null = "yes") {
  const staffing = analyzeStaffing(staffingInput(staffingPartial))
  const analysis = analyzeGrowth({
    staffing,
    desiredDjCount: present(6),
    targetAnnualBookings: staffingInput(staffingPartial).targetAnnualBookings,
    hiringReason: emptyChoice(),
    primaryGoal: presentChoice("scale"),
    goalTimeline: presentChoice("1_to_2_years"),
    joinPath: presentChoice("no_experience"),
    beginnerPreference: presentChoice("yes"),
    hiringWeight: presentChoice("character"),
    financialPriority: presentChoice("increase_revenue"),
    trainingAvailability: training ? presentChoice(training) : emptyChoice(),
    typicalLeadCapacity: present(40, true),
  })
  return composeRecommendedGrowthPlan({
    analysis,
    capacityGap: staffing.capacityGap,
    typicalLeadCapacity: 40,
    typicalEstimated: true,
    training,
    urgent: false,
  })
}

describe("recommended hiring target", () => {
  it("stays unavailable when the next step is unknown", () => {
    const staffing = analyzeStaffing(staffingInput({ leadDjAnnualCapacities: null, targetAnnualBookings: emptyNumeric() }))
    const analysis = analyzeGrowth({
      staffing,
      desiredDjCount: present(6),
      targetAnnualBookings: emptyNumeric(),
      hiringReason: emptyChoice(),
      primaryGoal: presentChoice("scale"),
      goalTimeline: presentChoice("1_to_2_years"),
      joinPath: emptyChoice(),
      beginnerPreference: emptyChoice(),
      hiringWeight: emptyChoice(),
      financialPriority: emptyChoice(),
      trainingAvailability: emptyChoice(),
      typicalLeadCapacity: emptyNumeric(),
    })
    const target = recommendedHiringTarget(analysis.recommendation, staffing.capacityGap, null, false)
    expect(target.status).toBe("unavailable")
    expect(target.value).toBeNull()
  })

  it("is 0 when demand or utilization is the first constraint", () => {
    const staffing = analyzeStaffing(staffingInput())
    const analysis = analyzeGrowth({
      staffing,
      desiredDjCount: present(6),
      targetAnnualBookings: present(80),
      hiringReason: emptyChoice(),
      primaryGoal: presentChoice("scale"),
      goalTimeline: presentChoice("1_to_2_years"),
      joinPath: presentChoice("mix"),
      beginnerPreference: presentChoice("yes_personality"),
      hiringWeight: presentChoice("character"),
      financialPriority: presentChoice("increase_revenue"),
      trainingAvailability: presentChoice("yes"),
      typicalLeadCapacity: present(40, true),
    })
    expect(analysis.recommendation.value).toBe("demand")
    expect(recommendedHiringTarget(analysis.recommendation, staffing.capacityGap, 40, true).value).toBe(0)
  })

  it("uses ceil(gap / typical capacity) when recruiting is supported", () => {
    const staffing = analyzeStaffing(
      staffingInput({
        targetAnnualBookings: present(200),
        expectedAnnualBookingsWithoutExpansion: present(80),
      }),
    )
    const analysis = analyzeGrowth({
      staffing,
      desiredDjCount: present(6),
      targetAnnualBookings: present(200),
      hiringReason: emptyChoice(),
      primaryGoal: presentChoice("scale"),
      goalTimeline: presentChoice("1_to_2_years"),
      joinPath: presentChoice("no_experience"),
      beginnerPreference: presentChoice("yes"),
      hiringWeight: presentChoice("character"),
      financialPriority: presentChoice("increase_revenue"),
      trainingAvailability: presentChoice("yes"),
      typicalLeadCapacity: present(40, true),
    })
    expect(analysis.recommendation.value).toBe("beginner")
    expect(staffing.capacityGap.value).toBe(80)
    const target = recommendedHiringTarget(analysis.recommendation, staffing.capacityGap, 40, true)
    expect(target.value).toBe(2)
    expect(target.status).toBe("estimated")
  })
})

describe("composeRecommendedGrowthPlan", () => {
  it("marks hiring unavailable instead of inventing a number", () => {
    const plan = planFrom({ leadDjAnnualCapacities: null, targetAnnualBookings: emptyNumeric() }, null)
    expect(plan.hiring.recommendedTarget.value).toBeNull()
    expect(plan.hiring.recommendedTarget.status).toBe("unavailable")
    expect(plan.summary.primaryObstacle.kind).toBeNull()
    expect(plan.recruiting.approach).toMatch(/will not invent/)
    expect(plan.nextSteps.some((step) => step.text.includes("Do not treat an unknown"))).toBe(true)
  })

  it("recommends beginners with a hiring target when training exists", () => {
    const plan = planFrom({
      targetAnnualBookings: present(200),
      expectedAnnualBookingsWithoutExpansion: present(80),
    })
    expect(plan.summary.primaryObstacle.kind).toBe("beginner")
    expect(plan.hiring.recommendedTarget.value).toBe(2)
    expect(plan.hiring.recommendedProfile).toBe("beginner")
    expect(plan.training.canSupportBeginners).toBe(true)
    expect(plan.recruiting.notes.some((note) => note.includes("advertising budget"))).toBe(true)
  })
})

describe("applyOwnerDecisions", () => {
  it("warns when the owner hires against a demand-first recommendation", () => {
    const recommended = planFrom()
    expect(recommended.summary.primaryObstacle.kind).toBe("demand")
    const effective = applyOwnerDecisions(
      recommended,
      { stance: "modify", hiringTarget: 3, hireProfile: "experienced", recruitingKind: "recruit", note: "I still want to hire." },
      recommended.summary.primaryObstacle.kind
        ? []
        : [],
    )
    expect(effective.hiringTarget.value).toBe(3)
    expect(effective.modifications.some((item) => item.includes("Hiring target changed"))).toBe(true)
    expect(effective.warnings.some((row) => row.title.includes("conflicts with the analysis"))).toBe(true)
    expect(effective.acceptedRecommendations).toBe(false)
    const again = applyOwnerDecisions(
      recommended,
      { stance: "modify", hiringTarget: 3, hireProfile: "experienced", recruitingKind: "recruit", note: null },
      effective.warnings,
    )
    expect(again.warnings.filter((row) => row.title.includes("conflicts with the analysis"))).toHaveLength(1)
  })

  it("keeps a rejection from becoming a recruiting plan", () => {
    const recommended = planFrom()
    const effective = applyOwnerDecisions(recommended, { ...emptyDecisions(), stance: "reject", note: "Not now." }, [])
    expect(effective.rejectedRecommendations).toBe(true)
    expect(effective.nextSteps[0]?.source).toBe("owner")
  })
})
