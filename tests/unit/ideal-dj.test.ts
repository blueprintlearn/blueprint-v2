import { describe, expect, it } from "vitest"

import {
  IDEAL_DJ_CHOICE_MESSAGE,
  IDEAL_DJ_PRIORITY_MAX_MESSAGE,
  IDEAL_DJ_QUALITY_MAX_MESSAGE,
  IDEAL_DJ_SKILL_MESSAGE,
  IDEAL_DJ_SUBSET_MESSAGE,
  IDEAL_DJ_VALUES_MESSAGE,
  IDEAL_DJ_VALUE_LENGTH_MESSAGE,
  parseArrangement,
  parseAvailability,
  parseBeginner,
  parseCoreValues,
  parsePerson,
  parsePoorFit,
  parsePriorities,
  parseQualities,
  parseSkillRatings,
  prioritiesMatchQualities,
  qualityLabel,
} from "@/lib/blueprint/ideal-dj"

describe("ideal DJ choice answers", () => {
  it("accepts person, beginner, and arrangement codes, including no one in mind and not sure", () => {
    expect(parsePerson("none")).toEqual({ ok: true, value: "none" })
    expect(parsePerson("current_dj")).toEqual({ ok: true, value: "current_dj" })
    expect(parsePerson("named_friend").ok).toBe(false)
    expect(parseBeginner("yes_personality")).toEqual({ ok: true, value: "yes_personality" })
    expect(parseArrangement("not_sure")).toEqual({ ok: true, value: "not_sure" })
    expect(qualityLabel("none")).toBe("Which qualities would you want in a future DJ? Choose up to five.")
    expect(qualityLabel("current_dj")).toBe("What makes that person a great fit? Choose up to five.")
  })

  it("rejects unknown quality codes and more than five qualities", () => {
    expect(parseQualities(["dependable", "not_a_quality"])).toEqual({
      ok: false,
      error: IDEAL_DJ_CHOICE_MESSAGE,
    })
    expect(
      parseQualities(["dependable", "friendly", "confident", "professional", "organized", "coachable"]),
    ).toEqual({ ok: false, error: IDEAL_DJ_QUALITY_MAX_MESSAGE })
  })

  it("requires I3 selections to come from I2 and caps them at three", () => {
    expect(parsePriorities(["dependable", "friendly"], ["dependable", "friendly", "coachable"])).toEqual({
      ok: true,
      value: ["dependable", "friendly"],
    })
    expect(parsePriorities(["dependable", "professional"], ["dependable", "friendly"])).toEqual({
      ok: false,
      error: IDEAL_DJ_SUBSET_MESSAGE,
    })
    expect(
      parsePriorities(["dependable", "friendly", "coachable", "organized"], ["dependable", "friendly", "coachable", "organized"]),
    ).toEqual({ ok: false, error: IDEAL_DJ_PRIORITY_MAX_MESSAGE })
    expect(prioritiesMatchQualities(["dependable"], ["dependable", "friendly"])).toBe(true)
    expect(prioritiesMatchQualities(["dependable", "professional"], ["dependable", "friendly"])).toBe(false)
  })

  it("lets owners skip defining values or enter up to three short ones", () => {
    expect(parseCoreValues("none")).toEqual({ ok: true, value: { defined: false } })
    expect(parseCoreValues(["Show up ready", "  Care  "])).toEqual({
      ok: true,
      value: { defined: true, values: ["Show up ready", "Care"] },
    })
    expect(parseCoreValues([])).toEqual({ ok: false, error: IDEAL_DJ_VALUES_MESSAGE })
    expect(parseCoreValues(["x".repeat(41)])).toEqual({ ok: false, error: IDEAL_DJ_VALUE_LENGTH_MESSAGE })
  })

  it("requires a rating for every skill and rejects unknown ratings", () => {
    expect(parseSkillRatings({ djing: "can_teach" })).toEqual({ ok: false, error: IDEAL_DJ_SKILL_MESSAGE })
    expect(
      parseSkillRatings({
        djing: "can_teach",
        music: "can_teach",
        speaking: "must_have",
        customer_service: "must_have",
        events: "can_teach",
        audio: "not_important",
        lighting: "not_sure",
        sales: "can_teach",
      }).ok,
    ).toBe(true)
    expect(
      parseSkillRatings({
        djing: "wizard",
        music: "can_teach",
        speaking: "must_have",
        customer_service: "must_have",
        events: "can_teach",
        audio: "not_important",
        lighting: "not_sure",
        sales: "can_teach",
      }).ok,
    ).toBe(false)
  })

  it("keeps availability varies exclusive and caps poor-fit choices at three", () => {
    expect(parseAvailability(["saturday", "varies"]).ok).toBe(false)
    expect(parseAvailability(["varies"])).toEqual({ ok: true, value: ["varies"] })
    expect(parsePoorFit(["unreliable", "poor_communication", "no_feedback", "unprofessional"])).toEqual({
      ok: false,
      error: IDEAL_DJ_PRIORITY_MAX_MESSAGE,
    })
  })
})
