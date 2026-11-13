import { describe, expect, it } from "vitest"

import {
  DEVELOPMENT_CHOICE_MAX_MESSAGE,
  DEVELOPMENT_CHOICE_MESSAGE,
  DEVELOPMENT_EXCLUSIVE_MESSAGE,
  DEVELOPMENT_LIST_MESSAGE,
  capChoices,
  exclusiveList,
  parseChallenges,
  parseEquipment,
  parseHandsOn,
  parseImprovements,
  parseJoinPath,
  parseLearnMethods,
  parseMaterials,
  parseReadySignals,
  parseTrainer,
  parseTrainingTime,
} from "@/lib/blueprint/development"

describe("development choice answers", () => {
  it("accepts join, trainer, equipment, and time codes, including not yet and I’m not sure", () => {
    expect(parseJoinPath("not_yet")).toEqual({ ok: true, value: "not_yet" })
    expect(parseJoinPath("mix")).toEqual({ ok: true, value: "mix" })
    expect(parseJoinPath("interns")).toEqual({ ok: false, error: DEVELOPMENT_CHOICE_MESSAGE })
    expect(parseTrainer("nobody")).toEqual({ ok: true, value: "nobody" })
    expect(parseEquipment("limited")).toEqual({ ok: true, value: "limited" })
    expect(parseTrainingTime("not_sure")).toEqual({ ok: true, value: "not_sure" })
    expect(parseTrainingTime("all_day").ok).toBe(false)
  })

  it("rejects unknown multi-select codes instead of dropping them", () => {
    expect(parseLearnMethods(["shadow", "not_a_method"])).toEqual({
      ok: false,
      error: DEVELOPMENT_CHOICE_MESSAGE,
    })
    expect(parseReadySignals(["approval", "nope"])).toEqual({
      ok: false,
      error: DEVELOPMENT_CHOICE_MESSAGE,
    })
    expect(parseMaterials([])).toEqual({ ok: false, error: DEVELOPMENT_LIST_MESSAGE })
  })

  it("keeps none and no-process selections exclusive of other options", () => {
    expect(parseLearnMethods(["shadow", "no_formal"])).toEqual({
      ok: false,
      error: DEVELOPMENT_EXCLUSIVE_MESSAGE,
    })
    expect(parseLearnMethods(["no_formal"])).toEqual({ ok: true, value: ["no_formal"] })
    expect(parseReadySignals(["no_process"])).toEqual({ ok: true, value: ["no_process"] })
    expect(parseMaterials(["written", "nothing"]).ok).toBe(false)
    expect(parseHandsOn(["no_opportunities"])).toEqual({ ok: true, value: ["no_opportunities"] })
    expect(parseChallenges(["time", "no_major"]).ok).toBe(false)
    expect(parseChallenges(["no_major"])).toEqual({ ok: true, value: ["no_major"] })
    expect(exclusiveList(["shadow", "assist", "no_formal"], "no_formal")).toEqual(["no_formal"])
    expect(exclusiveList(["no_formal", "shadow"], "no_formal")).toEqual(["shadow"])
  })

  it("caps D8 and D9 at three selections", () => {
    expect(parseChallenges(["time", "engagement", "consistency"])).toEqual({
      ok: true,
      value: ["time", "engagement", "consistency"],
    })
    expect(
      parseChallenges(["time", "engagement", "consistency", "readiness"]),
    ).toEqual({ ok: false, error: DEVELOPMENT_CHOICE_MAX_MESSAGE })
    expect(
      parseImprovements(["faster", "quality", "organized", "track"]),
    ).toEqual({ ok: false, error: DEVELOPMENT_CHOICE_MAX_MESSAGE })
    expect(capChoices(["faster", "quality", "organized", "track"])).toEqual([
      "faster",
      "quality",
      "organized",
    ])
  })
})
