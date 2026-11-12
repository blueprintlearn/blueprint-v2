import { describe, expect, it } from "vitest"

import {
  EVENT_OTHER_MESSAGE,
  EVENT_TYPES_CHOOSE_MESSAGE,
  EVENTS_RANGE_MESSAGE,
  estimateAnnualVolume,
  inheritOfferedOther,
  labeledEventOptions,
  namedOtherLabel,
  newTypeOptions,
  overlapsOffered,
  parseAnnualEventCount,
  parseEventTypesValue,
  parseFutureFocus,
  parseNewDjPath,
  parseOptionalAnnualEventCount,
  isSubsetOfOffered,
  staffingOptions,
  type EventTypeCode,
} from "@/lib/blueprint/events"

describe("event type answers", () => {
  it("requires at least one type and other text when Other is chosen", () => {
    expect(parseEventTypesValue({ codes: [], other: null }).ok).toBe(false)
    expect(parseEventTypesValue({ codes: ["nope"], other: null })).toEqual({
      ok: false,
      error: EVENT_TYPES_CHOOSE_MESSAGE,
    })
    expect(parseEventTypesValue({ codes: ["other"], other: null })).toEqual({
      ok: false,
      error: EVENT_OTHER_MESSAGE,
    })
    expect(parseEventTypesValue({ codes: ["wedding", "other"], other: "Bar mitzvahs" })).toEqual({
      ok: true,
      value: { codes: ["wedding", "other"], other: "Bar mitzvahs" },
    })
  })

  it("keeps staffing options on offered types and new types off of them", () => {
    expect(staffingOptions(["wedding", "corporate"]).map((option) => option.value)).toEqual([
      "wedding",
      "corporate",
    ])
    expect(newTypeOptions(["wedding", "corporate"]).map((option) => option.value)).toEqual([
      "school_dance",
      "private_party",
      "bar_club",
      "other",
    ])
    expect(isSubsetOfOffered(["wedding"], ["wedding", "corporate"])).toBe(true)
    expect(isSubsetOfOffered(["school_dance"], ["wedding"])).toBe(false)
    expect(overlapsOffered(["wedding"], ["wedding", "corporate"])).toBe(true)
    expect(overlapsOffered(["other"], ["wedding", "other"])).toBe(false)
  })

  it("shows a saved custom type name instead of Other on later questions", () => {
    const offered = { codes: ["wedding", "other"] as EventTypeCode[], other: "Bar mitzvahs" }
    expect(namedOtherLabel(offered)).toBe("Bar mitzvahs")
    expect(labeledEventOptions(offered.codes, offered.other).find((option) => option.value === "other")).toEqual({
      value: "other",
      label: "Bar mitzvahs",
    })
    expect(inheritOfferedOther(["other"], null, offered)).toBe("Bar mitzvahs")
    expect(inheritOfferedOther(["wedding"], null, offered)).toBeNull()
  })
})

describe("annual event volume", () => {
  it("accepts a whole number from 0 to 9,999", () => {
    expect(parseAnnualEventCount("0")).toBe(0)
    expect(parseAnnualEventCount("80")).toBe(80)
    expect(parseAnnualEventCount("9999")).toBe(9999)
    expect(parseAnnualEventCount("10000")).toBeNull()
    expect(parseAnnualEventCount("12.5")).toBeNull()
    expect(parseAnnualEventCount("")).toBeNull()
    expect(parseOptionalAnnualEventCount("")).toEqual({ ok: true, value: null })
    expect(parseOptionalAnnualEventCount("nope")).toEqual({ ok: false })
    expect(EVENTS_RANGE_MESSAGE).toContain("9,999")
  })

  it("estimates from a typical month times 12", () => {
    expect(estimateAnnualVolume({ typicalMonth: 8 })).toBe(96)
    expect(estimateAnnualVolume({ typicalMonth: 0 })).toBe(0)
    expect(estimateAnnualVolume({ typicalMonth: 1.5 })).toBeNull()
  })
})

describe("staffing path and future focus", () => {
  it("accepts the three new-DJ paths and the three future-focus codes", () => {
    expect(parseNewDjPath("assistant")).toEqual({ ok: true, value: "assistant" })
    expect(parseNewDjPath("lead")).toEqual({ ok: true, value: "lead" })
    expect(parseNewDjPath("mixed")).toEqual({ ok: true, value: "mixed" })
    expect(parseNewDjPath("other").ok).toBe(false)
    expect(parseFutureFocus("both")).toEqual({ ok: true, value: "both" })
    expect(parseFutureFocus("more_bookings")).toEqual({ ok: true, value: "more_bookings" })
    expect(parseFutureFocus("less_involvement")).toEqual({ ok: true, value: "less_involvement" })
    expect(parseFutureFocus("profit").ok).toBe(false)
  })
})
