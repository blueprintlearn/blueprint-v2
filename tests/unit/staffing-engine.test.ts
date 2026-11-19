import { describe, expect, it } from "vitest"

import {
  analyzeStaffing,
  emptyNumeric,
  present,
  type StaffingEngineInput,
} from "@/lib/blueprint/staffing-engine"

function input(partial: Partial<StaffingEngineInput> = {}): StaffingEngineInput {
  return {
    teamDjCount: emptyNumeric(),
    leadCapableCount: emptyNumeric(),
    assistantOnlyCount: emptyNumeric(),
    ownerDjFrequency: null,
    ownerDjFrequencyKind: "missing",
    annualEventVolume: emptyNumeric(),
    leadDjAnnualCapacities: null,
    targetAnnualBookings: emptyNumeric(),
    expectedAnnualBookingsWithoutExpansion: emptyNumeric(),
    closingRatePercent: emptyNumeric(),
    averageSales: null,
    ...partial,
  }
}

describe("current staffing", () => {
  it("reports headcount, leads, assistants, volume, and owner involvement without adding assistants or the owner as leads", () => {
    const result = analyzeStaffing(
      input({
        teamDjCount: present(4),
        leadCapableCount: present(2),
        assistantOnlyCount: present(3),
        ownerDjFrequency: "regularly",
        ownerDjFrequencyKind: "present",
        annualEventVolume: present(80),
      }),
    )
    expect(result.currentStaffing.teamDjCount).toMatchObject({ status: "calculated", value: 4 })
    expect(result.currentStaffing.leadCapableCount).toMatchObject({ status: "calculated", value: 2 })
    expect(result.currentStaffing.assistantOnlyCount).toMatchObject({ status: "calculated", value: 3 })
    expect(result.currentStaffing.independentLeadCount).toMatchObject({ status: "calculated", value: 2 })
    expect(result.currentStaffing.independentLeadCount.value).not.toBe(5)
    expect(result.currentStaffing.independentLeadCount.value).not.toBe(3)
    expect(result.currentStaffing.ownerInvolvement).toMatchObject({ status: "calculated", value: "regularly" })
    expect(result.currentStaffing.annualEventVolume).toMatchObject({ status: "calculated", value: 80 })
    expect(result.currentStaffing.independentLeadCount.assumptions.join(" ")).toMatch(/Assistants are excluded/)
    expect(result.currentStaffing.ownerInvolvement.assumptions.join(" ")).toMatch(/not added/)
  })

  it("does not treat a missing count as zero", () => {
    const result = analyzeStaffing(input())
    expect(result.currentStaffing.teamDjCount).toMatchObject({ status: "unavailable", value: null })
    expect(result.currentStaffing.leadCapableCount.value).toBeNull()
    expect(result.currentStaffing.assistantOnlyCount.value).toBeNull()
    expect(result.currentStaffing.independentLeadCount.value).toBeNull()
  })

  it("rejects a lead-capable count higher than team DJs", () => {
    const result = analyzeStaffing(input({ teamDjCount: present(2), leadCapableCount: present(5) }))
    expect(result.currentStaffing.independentLeadCount).toMatchObject({ status: "unavailable", value: null })
  })
})

describe("staffing capacity", () => {
  it("is unavailable when individual DJ capacity is missing and does not assume 20, 30, or 40 events", () => {
    const result = analyzeStaffing(input({ leadCapableCount: present(3), annualEventVolume: present(90) }))
    expect(result.availableAnnualCapacity).toMatchObject({ status: "unavailable", value: null })
    expect(result.availableAnnualCapacity.explanation).toMatch(/does not assume 20, 30, or 40/)
    expect(result.capacityGap).toMatchObject({ status: "unavailable", value: null })
  })

  it("sums provided lead-DJ capacities and labels estimates", () => {
    const calculated = analyzeStaffing(
      input({
        leadDjAnnualCapacities: [
          { annualEvents: 40, estimated: false },
          { annualEvents: 25, estimated: false },
        ],
        targetAnnualBookings: present(80),
      }),
    )
    expect(calculated.availableAnnualCapacity).toMatchObject({ status: "calculated", value: 65 })
    expect(calculated.capacityGap).toMatchObject({ status: "calculated", value: 15 })

    const estimated = analyzeStaffing(
      input({
        leadDjAnnualCapacities: [
          { annualEvents: 40, estimated: false },
          { annualEvents: 20, estimated: true },
        ],
      }),
    )
    expect(estimated.availableAnnualCapacity).toMatchObject({ status: "estimated", value: 60 })
  })
})

describe("booking demand", () => {
  it("uses an owner-confirmed forward-looking baseline and reports zero additional bookings when the target is already covered", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(80),
        expectedAnnualBookingsWithoutExpansion: present(80),
      }),
    )
    expect(result.additionalBookingsNeeded).toMatchObject({ status: "calculated", value: 0 })
    expect(result.additionalBookingsNeeded.formula).toMatch(/max\(0/)
    expect(result.additionalBookingsNeeded.assumptions.join(" ")).toMatch(/not automatically that baseline/)
  })

  it("does not use current or historical volume as a substitute target", () => {
    const result = analyzeStaffing(
      input({
        annualEventVolume: present(80),
        expectedAnnualBookingsWithoutExpansion: present(80),
      }),
    )
    expect(result.additionalBookingsNeeded).toMatchObject({ status: "unavailable", value: null })
    expect(result.additionalBookingsNeeded.missing).toContain("Target annual bookings")
    expect(result.additionalBookingsNeeded.explanation).toMatch(/not used as a substitute target/)
  })

  it("does not treat current or historical volume as a confirmed forward-looking baseline", () => {
    const result = analyzeStaffing(
      input({
        annualEventVolume: present(80),
        targetAnnualBookings: present(100),
      }),
    )
    expect(result.additionalBookingsNeeded).toMatchObject({ status: "unavailable", value: null })
    expect(result.additionalBookingsNeeded.value).not.toBe(20)
    expect(result.additionalBookingsNeeded.missing).toContain("Expected annual bookings without expansion")
    expect(result.additionalBookingsNeeded.explanation).toMatch(/not used as that baseline/)
    expect(result.currentStaffing.annualEventVolume).toMatchObject({ status: "calculated", value: 80 })
    expect(result.currentStaffing.annualEventVolume.explanation).toMatch(/not a confirmed forecast/)
    expect(result.currentStaffing.annualEventVolume.assumptions.join(" ")).toMatch(/historical planning proxy/)
  })

  it("keeps the target and marks the increment unknown when the forward-looking baseline is missing", () => {
    const result = analyzeStaffing(input({ targetAnnualBookings: present(100) }))
    expect(result.additionalBookingsNeeded).toMatchObject({ status: "unavailable", value: null })
    expect(result.additionalBookingsNeeded.explanation).toMatch(/forward-looking baseline/)
  })
})

describe("lead requirements", () => {
  it("is unavailable when closing rate is missing and does not invent a percentage", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(100),
        expectedAnnualBookingsWithoutExpansion: present(80),
      }),
    )
    expect(result.additionalBookingsNeeded.value).toBe(20)
    expect(result.additionalQualifiedLeadsAnnually).toMatchObject({ status: "unavailable", value: null })
    expect(result.additionalQualifiedLeadsAnnually.explanation).toMatch(/does not invent/)
    expect(result.additionalQualifiedLeadsMonthly.value).toBeNull()
  })

  it("divides additional bookings by closing rate and labels a company-wide assumption", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(100),
        expectedAnnualBookingsWithoutExpansion: present(80),
        closingRatePercent: present(25),
      }),
    )
    expect(result.additionalQualifiedLeadsAnnually).toMatchObject({ status: "calculated", value: 80 })
    expect(result.additionalQualifiedLeadsMonthly).toMatchObject({ status: "calculated", value: 80 / 12 })
    expect(result.additionalQualifiedLeadsAnnually.assumptions.join(" ")).toMatch(/company-wide/)
  })

  it("returns zero additional leads when zero additional bookings are needed", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(50),
        expectedAnnualBookingsWithoutExpansion: present(80),
      }),
    )
    expect(result.additionalBookingsNeeded.value).toBe(0)
    expect(result.additionalQualifiedLeadsAnnually).toMatchObject({ status: "calculated", value: 0 })
  })
})

describe("revenue opportunity", () => {
  it("multiplies additional bookings by a single typical sale and labels it as an estimate of gross revenue", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(100),
        expectedAnnualBookingsWithoutExpansion: present(80),
        averageSales: [{ label: "Typical event price", amount: 1800, estimated: true }],
      }),
    )
    expect(result.potentialAdditionalGrossRevenue).toMatchObject({ status: "estimated", value: 36000 })
    expect(result.potentialAdditionalGrossRevenue.explanation).toMatch(/not guaranteed revenue or profit/)
    expect(result.potentialAdditionalGrossRevenue.assumptions.join(" ")).toMatch(/not mixed/)
  })

  it("does not mix different average sales across pricing tiers", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(100),
        expectedAnnualBookingsWithoutExpansion: present(80),
        averageSales: [
          { label: "Standard", amount: 1500, estimated: false },
          { label: "Premium", amount: 2800, estimated: false },
        ],
      }),
    )
    expect(result.potentialAdditionalGrossRevenue).toMatchObject({ status: "unavailable", value: null })
    expect(result.potentialAdditionalGrossRevenue.explanation).toMatch(/mix pricing tiers/)
  })
})

describe("invalid inputs", () => {
  it("rejects negative counts and zero or out-of-range closing rates", () => {
    expect(analyzeStaffing(input({ teamDjCount: present(-1) })).currentStaffing.teamDjCount.value).toBeNull()
    expect(
      analyzeStaffing(
        input({
          targetAnnualBookings: present(100),
          expectedAnnualBookingsWithoutExpansion: present(80),
          closingRatePercent: present(0),
        }),
      ).additionalQualifiedLeadsAnnually.value,
    ).toBeNull()
    expect(
      analyzeStaffing(
        input({
          targetAnnualBookings: present(100),
          expectedAnnualBookingsWithoutExpansion: present(80),
          closingRatePercent: present(150),
        }),
      ).additionalQualifiedLeadsAnnually.value,
    ).toBeNull()
    expect(
      analyzeStaffing(
        input({
          targetAnnualBookings: present(100),
          expectedAnnualBookingsWithoutExpansion: present(80),
          closingRatePercent: { value: -5, kind: "present" },
        }),
      ).additionalQualifiedLeadsAnnually.status,
    ).toBe("unavailable")
    expect(
      analyzeStaffing(input({ leadDjAnnualCapacities: [{ annualEvents: -10, estimated: false }] }))
        .availableAnnualCapacity.value,
    ).toBeNull()
  })

  it("rejects fractional DJ counts, event counts, booking targets, and per-DJ capacities", () => {
    expect(analyzeStaffing(input({ teamDjCount: present(2.5) })).currentStaffing.teamDjCount.value).toBeNull()
    expect(analyzeStaffing(input({ leadCapableCount: present(1.5) })).currentStaffing.leadCapableCount.value).toBeNull()
    expect(
      analyzeStaffing(input({ assistantOnlyCount: present(0.5) })).currentStaffing.assistantOnlyCount.value,
    ).toBeNull()
    expect(
      analyzeStaffing(input({ annualEventVolume: present(80.5) })).currentStaffing.annualEventVolume.value,
    ).toBeNull()
    expect(
      analyzeStaffing(
        input({
          targetAnnualBookings: present(100.25),
          expectedAnnualBookingsWithoutExpansion: present(80),
        }),
      ).additionalBookingsNeeded.value,
    ).toBeNull()
    expect(
      analyzeStaffing(
        input({
          targetAnnualBookings: present(100),
          expectedAnnualBookingsWithoutExpansion: present(80.5),
        }),
      ).additionalBookingsNeeded.value,
    ).toBeNull()
    expect(
      analyzeStaffing(input({ leadDjAnnualCapacities: [{ annualEvents: 40.5, estimated: false }] }))
        .availableAnnualCapacity.value,
    ).toBeNull()
    expect(
      analyzeStaffing(
        input({
          leadDjAnnualCapacities: [{ annualEvents: 40, estimated: false }],
          targetAnnualBookings: present(90.5),
        }),
      ).capacityGap.value,
    ).toBeNull()
  })

  it("allows valid decimal closing rates and currency amounts", () => {
    const result = analyzeStaffing(
      input({
        targetAnnualBookings: present(100),
        expectedAnnualBookingsWithoutExpansion: present(80),
        closingRatePercent: present(12.5),
        averageSales: [{ label: "Typical event price", amount: 1800.5, estimated: false }],
      }),
    )
    expect(result.additionalQualifiedLeadsAnnually).toMatchObject({ status: "calculated", value: 160 })
    expect(result.potentialAdditionalGrossRevenue).toMatchObject({ status: "calculated", value: 36010 })
  })
})
