import { describe, expect, it } from "vitest"

import {
  analyzeGrowth,
  emptyChoice,
  presentChoice,
  type GrowthEngineInput,
} from "@/lib/blueprint/growth-engine"
import {
  analyzeStaffing,
  emptyNumeric,
  present,
  type StaffingEngineInput,
} from "@/lib/blueprint/staffing-engine"

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

function growthInput(partial: Partial<GrowthEngineInput> = {}): GrowthEngineInput {
  return {
    staffing: analyzeStaffing(staffingInput()),
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
    ...partial,
  }
}

describe("missing planning data", () => {
  it("does not recommend when capacity, target, or forward-looking baseline is missing", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            leadDjAnnualCapacities: null,
            targetAnnualBookings: emptyNumeric(),
            expectedAnnualBookingsWithoutExpansion: emptyNumeric(),
          }),
        ),
        targetAnnualBookings: emptyNumeric(),
      }),
    )
    expect(result.recommendation.value).toBeNull()
    expect(result.recommendation.status).toBe("unavailable")
    expect(result.recommendation.explanation).toMatch(/does not have enough information/)
  })

  it("does not treat historical volume as a confirmed future baseline", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            annualEventVolume: present(80),
            expectedAnnualBookingsWithoutExpansion: emptyNumeric(),
            targetAnnualBookings: present(100),
          }),
        ),
        targetAnnualBookings: present(100),
      }),
    )
    expect(result.recommendation.value).toBeNull()
    expect(result.areas.demand).toMatch(/not a confirmed forecast/)
    expect(result.historicalUtilization.explanation).toMatch(/not a forecast/)
  })
})

describe("recommendations", () => {
  it("recommends increasing demand when the owner wants more DJs than the target requires", () => {
    const result = analyzeGrowth(growthInput())
    expect(result.recommendation.value).toBe("demand")
    expect(result.recommendation.explanation).toMatch(/Increase demand before adding people/)
    expect(result.conflicts.some((row) => row.title.includes("Desired team size"))).toBe(true)
    expect(result.conflicts.some((row) => row.explanation.includes("will not silently change"))).toBe(true)
  })

  it("recommends utilization when spare capacity can cover additional bookings", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            targetAnnualBookings: present(100),
            expectedAnnualBookingsWithoutExpansion: present(80),
          }),
        ),
        desiredDjCount: present(3),
        targetAnnualBookings: present(100),
      }),
    )
    expect(result.recommendation.value).toBe("utilize")
    expect(result.recommendation.explanation).toMatch(/Use current DJs more fully/)
  })

  it("recommends training before recruiting beginners when training is not available", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            targetAnnualBookings: present(200),
            expectedAnnualBookingsWithoutExpansion: present(80),
          }),
        ),
        targetAnnualBookings: present(200),
        trainingAvailability: presentChoice("no"),
        goalTimeline: presentChoice("1_to_2_years"),
      }),
    )
    expect(result.recommendation.value).toBe("train")
  })

  it("recommends experienced DJs when beginners cannot be trained on a short timeline", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            targetAnnualBookings: present(200),
            expectedAnnualBookingsWithoutExpansion: present(80),
          }),
        ),
        targetAnnualBookings: present(200),
        trainingAvailability: presentChoice("no"),
        goalTimeline: presentChoice("within_6_months"),
      }),
    )
    expect(result.recommendation.value).toBe("experienced")
  })

  it("recommends beginners when training is available and the path includes new DJs", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            targetAnnualBookings: present(200),
            expectedAnnualBookingsWithoutExpansion: present(80),
          }),
        ),
        targetAnnualBookings: present(200),
        trainingAvailability: presentChoice("yes"),
        joinPath: presentChoice("no_experience"),
        beginnerPreference: presentChoice("yes"),
        goalTimeline: presentChoice("1_to_2_years"),
      }),
    )
    expect(result.recommendation.value).toBe("beginner")
  })

  it("keeps a generic recruit recommendation when training is missing", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            targetAnnualBookings: present(200),
            expectedAnnualBookingsWithoutExpansion: present(80),
          }),
        ),
        targetAnnualBookings: present(200),
        trainingAvailability: emptyChoice(),
      }),
    )
    expect(result.recommendation.value).toBe("recruit")
    expect(result.recommendation.status).toBe("estimated")
    expect(result.recommendation.missing).toContain("Training availability in the next 12 months")
  })
})

describe("invalid counts", () => {
  it("rejects a fractional typical capacity through staffing capacity", () => {
    const result = analyzeGrowth(
      growthInput({
        staffing: analyzeStaffing(
          staffingInput({
            leadDjAnnualCapacities: [{ annualEvents: 40.5, estimated: false }],
          }),
        ),
      }),
    )
    expect(result.recommendation.value).toBeNull()
    expect(result.recommendation.status).toBe("unavailable")
  })
})
