import { describe, expect, it } from "vitest"

import {
  NUMBERS_AMOUNT_MESSAGE,
  NUMBERS_COST_EXCLUSIVE_MESSAGE,
  NUMBERS_DJ_UNIT_MESSAGE,
  NUMBERS_PERCENT_MESSAGE,
  NUMBERS_PERIOD_MESSAGE,
  compensationUnitForMethod,
  estimateAnnualRevenue,
  estimateTypicalBooking,
  exclusiveDirectCosts,
  formatUsd,
  noneDirectCosts,
  parseDirectCostTypes,
  parseDjCostValue,
  parseFinancialPriority,
  parseMoneyAmount,
  parseOptionalMoneyAmount,
  parsePayMethod,
  parsePercent,
  parseRevenueValue,
} from "@/lib/blueprint/numbers"

describe("money amounts", () => {
  it("accepts whole dollars from 0 to 99,999,999", () => {
    expect(parseMoneyAmount("0")).toBe(0)
    expect(parseMoneyAmount("250000")).toBe(250000)
    expect(parseMoneyAmount(99_999_999)).toBe(99_999_999)
    expect(parseMoneyAmount("100000000")).toBeNull()
    expect(parseMoneyAmount("12.5")).toBeNull()
    expect(parseMoneyAmount("-1")).toBeNull()
    expect(parseOptionalMoneyAmount("")).toEqual({ ok: true, value: null })
    expect(parseOptionalMoneyAmount("nope")).toEqual({ ok: false })
    expect(formatUsd(250000)).toBe("$250,000")
    expect(NUMBERS_AMOUNT_MESSAGE).toContain("$99,999,999")
  })

  it("requires a period with annual revenue and keeps the amount as revenue", () => {
    expect(parseRevenueValue({ amount: 250000 })).toEqual({ ok: false, error: NUMBERS_PERIOD_MESSAGE })
    expect(parseRevenueValue({ amount: 250000, period: "last_year" })).toEqual({
      ok: true,
      value: { amount: 250000, period: "last_year" },
    })
    expect(parseRevenueValue({ amount: 12.5, period: "this_year" }).ok).toBe(false)
  })
})

describe("percent and compensation units", () => {
  it("accepts a whole percent from 0 to 100", () => {
    expect(parsePercent("0")).toBe(0)
    expect(parsePercent("30")).toBe(30)
    expect(parsePercent("101")).toBeNull()
    expect(parsePercent("12.5")).toBeNull()
    expect(NUMBERS_PERCENT_MESSAGE).toContain("0 to 100")
  })

  it("matches dollar or percent compensation to the pay method", () => {
    expect(compensationUnitForMethod("percentage")).toBe("percent")
    expect(compensationUnitForMethod("flat")).toBe("usd")
    expect(compensationUnitForMethod("varies")).toBe("usd")
    expect(compensationUnitForMethod("not_sure")).toBeNull()
    expect(parseDjCostValue({ amount: 30, unit: "percent" }, "percentage")).toEqual({
      ok: true,
      value: { amount: 30, unit: "percent" },
    })
    expect(parseDjCostValue({ amount: 400, unit: "usd" }, "percentage")).toEqual({
      ok: false,
      error: NUMBERS_DJ_UNIT_MESSAGE,
    })
    expect(parseDjCostValue({ amount: 30, unit: "percent" }, "flat").ok).toBe(false)
  })
})

describe("direct costs and estimates", () => {
  it("keeps None and Not sure exclusive of other cost types", () => {
    expect(exclusiveDirectCosts(["travel", "none"])).toEqual(["none"])
    expect(exclusiveDirectCosts(["none", "travel"])).toEqual(["travel"])
    expect(parseDirectCostTypes({ codes: ["none", "travel"] })).toEqual({
      ok: false,
      error: NUMBERS_COST_EXCLUSIVE_MESSAGE,
    })
    expect(parseDirectCostTypes({ codes: ["travel", "supplies"] })).toEqual({
      ok: true,
      value: { codes: ["travel", "supplies"] },
    })
    expect(noneDirectCosts({ codes: ["none"] })).toBe(true)
    expect(noneDirectCosts({ codes: ["travel"] })).toBe(false)
  })

  it("estimates annual revenue from monthly sales and a typical booking from DJ-event revenue", () => {
    expect(estimateAnnualRevenue({ typicalMonth: 20000 })).toBe(240000)
    expect(estimateTypicalBooking({ eventRevenue: 144000, bookings: 80 })).toBe(1800)
    expect(estimateTypicalBooking({ eventRevenue: 250000, bookings: 0 })).toBeNull()
  })

  it("accepts a financial priority code", () => {
    expect(parsePayMethod("flat")).toEqual({ ok: true, value: "flat" })
    expect(parsePayMethod("salary")).toEqual({ ok: true, value: "salary" })
    expect(parseFinancialPriority("increase_revenue")).toEqual({ ok: true, value: "increase_revenue" })
    expect(parseFinancialPriority("health_score").ok).toBe(false)
  })
})
