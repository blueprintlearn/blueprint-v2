import { describe, expect, it } from "vitest"

import {
  MARKET_CHOICE_MAX_MESSAGE,
  SERVICE_OTHER_MESSAGE,
  SERVICE_TYPES_CHOOSE_MESSAGE,
  inheritOfferedOther,
  labeledServiceOptions,
  namedOtherLabel,
  newServiceOptions,
  offeredServiceOptions,
  overlapsOffered,
  parseCompete,
  parsePositioning,
  parseServiceGoal,
  parseServiceTypesValue,
  parseWhyChosen,
  isSubsetOfOffered,
  type ServiceCode,
} from "@/lib/blueprint/services"

describe("service type answers", () => {
  it("requires at least one service and other text when Other is chosen", () => {
    expect(parseServiceTypesValue({ codes: [], other: null }).ok).toBe(false)
    expect(parseServiceTypesValue({ codes: ["nope"], other: null })).toEqual({
      ok: false,
      error: SERVICE_TYPES_CHOOSE_MESSAGE,
    })
    expect(parseServiceTypesValue({ codes: ["other"], other: null })).toEqual({
      ok: false,
      error: SERVICE_OTHER_MESSAGE,
    })
    expect(parseServiceTypesValue({ codes: ["dj_mc", "other"], other: "Laser shows" })).toEqual({
      ok: true,
      value: { codes: ["dj_mc", "other"], other: "Laser shows" },
    })
  })

  it("keeps offered options on current services and new services off of them", () => {
    expect(offeredServiceOptions(["dj_mc", "uplighting"]).map((option) => option.value)).toEqual([
      "dj_mc",
      "uplighting",
    ])
    expect(newServiceOptions(["dj_mc", "uplighting"]).map((option) => option.value)).toEqual([
      "ceremony_audio",
      "dance_floor_lighting",
      "photo_booths",
      "special_effects",
      "corporate_av",
      "karaoke",
      "other",
    ])
    expect(isSubsetOfOffered(["dj_mc"], ["dj_mc", "uplighting"])).toBe(true)
    expect(isSubsetOfOffered(["photo_booths"], ["dj_mc"])).toBe(false)
    expect(overlapsOffered(["dj_mc"], ["dj_mc", "uplighting"])).toBe(true)
    expect(overlapsOffered(["other"], ["dj_mc", "other"])).toBe(false)
  })

  it("shows a saved custom service name instead of Other on later questions", () => {
    const offered = { codes: ["dj_mc", "other"] as ServiceCode[], other: "Laser shows" }
    expect(namedOtherLabel(offered)).toBe("Laser shows")
    expect(labeledServiceOptions(offered.codes, offered.other).find((option) => option.value === "other")).toEqual({
      value: "other",
      label: "Laser shows",
    })
    expect(inheritOfferedOther(["other"], null, offered)).toBe("Laser shows")
    expect(inheritOfferedOther(["dj_mc"], null, offered)).toBeNull()
  })
})

describe("market perceptions", () => {
  it("accepts a positioning choice, including I’m not sure", () => {
    expect(parsePositioning("premium")).toEqual({ ok: true, value: "premium" })
    expect(parsePositioning("not_sure")).toEqual({ ok: true, value: "not_sure" })
    expect(parsePositioning("cheap").ok).toBe(false)
  })

  it("caps why-chosen and compete answers at three", () => {
    expect(parseWhyChosen(["dj_talent", "professionalism"])).toEqual({
      ok: true,
      value: ["dj_talent", "professionalism"],
    })
    expect(parseWhyChosen(["dj_talent", "professionalism", "music_expertise", "reputation"])).toEqual({
      ok: false,
      error: MARKET_CHOICE_MAX_MESSAGE,
    })
    expect(parseCompete(["finding_djs", "standing_out"])).toEqual({
      ok: true,
      value: ["finding_djs", "standing_out"],
    })
    expect(parseCompete([])).toEqual({ ok: false, error: "Choose at least one option." })
  })

  it("accepts a service goal, including Not sure yet", () => {
    expect(parseServiceGoal("train_djs")).toEqual({ ok: true, value: "train_djs" })
    expect(parseServiceGoal("not_sure")).toEqual({ ok: true, value: "not_sure" })
    expect(parseServiceGoal("grow_forever").ok).toBe(false)
  })
})
