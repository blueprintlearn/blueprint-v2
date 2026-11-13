import { describe, expect, it } from "vitest"

import {
  getInputStates,
  getMissingInputs,
  resolveAll,
  resolveQuestion,
  resolvedValue,
  type AnswerContext,
  type StoredAnswer,
} from "@/lib/blueprint/answers"
import { QUESTION_BY_KEY, QUESTIONS } from "@/lib/blueprint/questions"
import { teamTodayFixture } from "@/lib/blueprint/team-today"

const context = (
  goals: AnswerContext["goals"],
  teamToday: AnswerContext["teamToday"],
  answers: StoredAnswer[] = [],
): AnswerContext => ({ goals, teamToday, answers })

describe("answer resolution", () => {
  it("resolves every state and lets a value win over a skip", () => {
    const skipped: StoredAnswer = { questionKey: "G1", state: "skipped", value: null }
    expect(resolveQuestion(QUESTION_BY_KEY.G1, context(null, null)).state).toBe("unanswered")
    expect(resolveQuestion(QUESTION_BY_KEY.G1, context(null, null, [skipped])).state).toBe("skipped")
    expect(
      resolveQuestion(QUESTION_BY_KEY.G1, context({ primary: { goal: "scale" }, others: [] }, null, [skipped])).state,
    ).toBe("answered")
    expect(resolvedValue(resolveQuestion(QUESTION_BY_KEY.G1, context(null, null, [skipped])))).toBeNull()
  })

  it("treats G2 as not applicable with fewer than two goals", () => {
    expect(resolveQuestion(QUESTION_BY_KEY.G2, context(null, null)).state).toBe("not_applicable")
    expect(
      resolveQuestion(QUESTION_BY_KEY.G2, context({ primary: { goal: "scale" }, others: [] }, null)).state,
    ).toBe("not_applicable")
    expect(
      resolveQuestion(
        QUESTION_BY_KEY.G2,
        context({ primary: { goal: "scale" }, others: [{ goal: "expand" }] }, null),
      ).state,
    ).toBe("answered")
  })

  it("keeps an estimated untyped answer as estimated after reload", () => {
    const estimated: StoredAnswer = { questionKey: "G3", state: "estimated", value: "within_6_months" }
    const resolved = resolveQuestion(QUESTION_BY_KEY.G3, context(null, null, [estimated]))
    expect(resolved.state).toBe("estimated")
    expect(resolved.isEstimate).toBe(true)
    expect(resolved.value).toBe("within_6_months")
  })

  it("never substitutes a default for skipped or unanswered", () => {
    for (const row of resolveAll(context(null, null, [{ questionKey: "G1", state: "skipped", value: null }]))) {
      if (row.state === "skipped" || row.state === "unanswered") {
        expect(resolvedValue(row)).toBeNull()
      }
    }
  })
})

describe("missing inputs and input states", () => {
  it("returns skipped and unanswered applicable keys with why and href", () => {
    const missing = getMissingInputs(context(null, null, [{ questionKey: "G1", state: "skipped", value: null }]), [
      "G1",
      "G2",
      "G3",
      "T1",
    ])
    expect(missing.map((row) => row.questionKey)).toEqual(["G1", "G3", "T1"])
    expect(missing[0]).toMatchObject({
      state: "skipped",
      section: "goals",
      href: "/blueprint/goals#q-G1",
      whyNeeded: QUESTION_BY_KEY.G1.whyNeeded,
    })
    expect(missing.find((row) => row.questionKey === "G2")).toBeUndefined()
  })

  it("never returns answered, estimated or not-applicable keys", () => {
    const ctx = context(
      { primary: { goal: "scale" }, others: [] },
      teamTodayFixture({
        currentDjCount: 2,
        desiredDjCount: 4,
        countBasis: "excludes_owner",
        desiredCountBasis: "excludes_owner",
      }),
      [{ questionKey: "G3", state: "estimated", value: "no_set_date" }],
    )
    expect(getMissingInputs(ctx, ["G1", "G2", "G3", "T1", "T6"])).toEqual([])
    const states = getInputStates(ctx, ["G1", "G2", "G3"])
    expect(states.find((row) => row.questionKey === "G3")).toMatchObject({ state: "estimated", isEstimate: true })
    expect(states.find((row) => row.questionKey === "G2")).toMatchObject({ state: "not_applicable", isEstimate: false })
  })
})

describe("question registry", () => {
  it("uses the approved keys, skip flags and why-it's-needed sentences", () => {
    expect(QUESTIONS.map((question) => question.key)).toEqual([
      "G1",
      "G2",
      "G3",
      "T0",
      "T1",
      "T1b",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
      "T8",
      "E1",
      "E2",
      "E3",
      "E4",
      "E5",
      "E6",
      "E7",
      "E8",
      "E9",
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
      "N1",
      "N2",
      "N3",
      "N4",
      "N5",
      "N6",
      "N7",
      "N8",
      "N9",
    ])
    expect(QUESTIONS.every((question) => /^[A-Z]{1,2}[0-9]{1,2}[a-z]?$/.test(question.key))).toBe(true)
    expect(QUESTIONS.filter((question) => question.key.startsWith("N")).map((question) => question.key)).toEqual([
      "N1",
      "N2",
      "N3",
      "N4",
      "N5",
      "N6",
      "N7",
      "N8",
      "N9",
    ])
    expect(QUESTION_BY_KEY.G1.skipAllowed).toBe(true)
    expect(QUESTION_BY_KEY.G2.skipAllowed).toBe(false)
    expect(QUESTION_BY_KEY.G3.skipAllowed).toBe(false)
    expect(QUESTION_BY_KEY.G3.level).toBe("go_deeper")
    expect(QUESTION_BY_KEY.G1.guidance).not.toBeNull()
    expect(QUESTION_BY_KEY.G2.guidance).not.toBeNull()
    expect(QUESTION_BY_KEY.G2.guidance?.why).toBe(
      "When your goals pull in different directions, Blueprint follows your main goal first.",
    )
    expect(QUESTION_BY_KEY.G1.guidance?.examples.filter((example) => !example.desktopOnly)).toHaveLength(2)
    expect(QUESTIONS.every((question) => question.whyNeeded.length > 0)).toBe(true)
    expect(QUESTION_BY_KEY.T0.skipAllowed).toBe(false)
    expect(QUESTION_BY_KEY.T1.skipAllowed).toBe(true)
    expect(QUESTION_BY_KEY.T1.estimable).toBe(false)
    expect(QUESTION_BY_KEY.T7.level).toBe("go_deeper")
    expect(QUESTION_BY_KEY.E1.section).toBe("events")
    expect(QUESTION_BY_KEY.E2.estimable).toBe(true)
    expect(QUESTION_BY_KEY.E2.skipAllowed).toBe(true)
    expect(QUESTIONS.filter((question) => question.section === "events").every((question) => question.skipAllowed)).toBe(
      true,
    )
    expect(QUESTION_BY_KEY.S1.section).toBe("services")
    expect(QUESTIONS.filter((question) => question.section === "services").every((question) => question.skipAllowed)).toBe(
      true,
    )
    expect(QUESTION_BY_KEY.N1.section).toBe("numbers")
    expect(QUESTION_BY_KEY.N2.estimable).toBe(true)
    expect(QUESTION_BY_KEY.N9.level).toBe("go_deeper")
    expect(QUESTIONS.filter((question) => question.section === "numbers").every((question) => question.skipAllowed)).toBe(
      true,
    )
  })
})

describe("N2 shares E2 volume", () => {
  it("resolves N2 from the E2 row and ignores a stray N2 copy", () => {
    const fromEvents = resolveQuestion(
      QUESTION_BY_KEY.N2,
      context(null, null, [{ questionKey: "E2", state: "answered", value: 80 }]),
    )
    expect(fromEvents).toMatchObject({ key: "N2", state: "answered", value: 80, isEstimate: false })

    const estimated = resolveQuestion(
      QUESTION_BY_KEY.N2,
      context(null, null, [{ questionKey: "E2", state: "estimated", value: 96 }]),
    )
    expect(estimated).toMatchObject({ state: "estimated", value: 96, isEstimate: true })

    const skipped = resolveQuestion(
      QUESTION_BY_KEY.N2,
      context(null, null, [{ questionKey: "E2", state: "skipped", value: null }]),
    )
    expect(skipped.state).toBe("skipped")

    const stray = resolveQuestion(
      QUESTION_BY_KEY.N2,
      context(null, null, [{ questionKey: "N2", state: "answered", value: 12 }]),
    )
    expect(stray.state).toBe("unanswered")
    expect(stray.value).toBeNull()
  })

  it("marks N7 not applicable when other direct costs are none", () => {
    expect(resolveQuestion(QUESTION_BY_KEY.N7, context(null, null)).state).toBe("unanswered")
    expect(
      resolveQuestion(
        QUESTION_BY_KEY.N7,
        context(null, null, [{ questionKey: "N6", state: "answered", value: { codes: ["none"] } }]),
      ).state,
    ).toBe("not_applicable")
    expect(
      resolveQuestion(
        QUESTION_BY_KEY.N7,
        context(null, null, [
          { questionKey: "N6", state: "answered", value: { codes: ["none"] } },
          { questionKey: "N7", state: "answered", value: { amount: 150 } },
        ]),
      ),
    ).toMatchObject({ state: "not_applicable", value: null })
    expect(
      resolveQuestion(
        QUESTION_BY_KEY.N7,
        context(null, null, [{ questionKey: "N6", state: "answered", value: { codes: ["travel"] } }]),
      ).state,
    ).toBe("unanswered")
  })
})

describe("edited numbers answers stay consistent", () => {
  it("ignores a saved N5 amount when the pay method unit no longer matches, then restores it if the method matches again", () => {
    const usd = { questionKey: "N5", state: "answered" as const, value: { amount: 400, unit: "usd" } }
    const incompatible = resolveQuestion(
      QUESTION_BY_KEY.N5,
      context(null, null, [
        { questionKey: "N4", state: "answered", value: "percentage" },
        usd,
      ]),
    )
    expect(incompatible).toMatchObject({ key: "N5", state: "unanswered", value: null, isEstimate: false })

    const restored = resolveQuestion(
      QUESTION_BY_KEY.N5,
      context(null, null, [
        { questionKey: "N4", state: "answered", value: "flat" },
        usd,
      ]),
    )
    expect(restored).toMatchObject({ state: "answered", value: { amount: 400, unit: "usd" } })

    const sameFamily = resolveQuestion(
      QUESTION_BY_KEY.N5,
      context(null, null, [
        { questionKey: "N4", state: "answered", value: "hourly" },
        usd,
      ]),
    )
    expect(sameFamily.state).toBe("answered")
  })
})

describe("unconfirmed team counts", () => {
  it("keeps unknown and includes_owner values out of input states and M2 inputs", () => {
    const unknown = teamTodayFixture({ currentDjCount: 6, desiredDjCount: 8 })
    const included = teamTodayFixture({
      currentDjCount: 6,
      desiredDjCount: 8,
      countBasis: "includes_owner",
    })
    for (const team of [unknown, included]) {
      const ctx = context(null, team)
      expect(getInputStates(ctx, ["T1", "T6"]).map((row) => row.value)).toEqual([null, null])
      const missing = getMissingInputs(ctx, ["T1", "T6"])
      expect(missing.map((row) => row.questionKey)).toEqual(["T1", "T6"])
      expect(missing[0].href).toBe("/blueprint/team#q-T1")
      expect(team.currentDjCount).toBe(6)
      expect(team.desiredDjCount).toBe(8)
    }
  })

  it("treats T1 and T6 as answered only with excludes_owner", () => {
    const confirmed = teamTodayFixture({
      currentDjCount: 4,
      desiredDjCount: 6,
      countBasis: "excludes_owner",
      desiredCountBasis: "excludes_owner",
    })
    const ctx = context(null, confirmed)
    expect(resolveQuestion(QUESTION_BY_KEY.T1, ctx)).toMatchObject({ state: "answered", value: 4 })
    expect(resolveQuestion(QUESTION_BY_KEY.T6, ctx)).toMatchObject({ state: "answered", value: 6 })
    expect(resolveQuestion(QUESTION_BY_KEY.T0, ctx).state).toBe("not_applicable")
  })

  it("shows T0 only when the saved current count has an unknown basis", () => {
    expect(resolveQuestion(QUESTION_BY_KEY.T0, context(null, teamTodayFixture({ currentDjCount: 6 }))).state).toBe(
      "unanswered",
    )
    expect(
      resolveQuestion(
        QUESTION_BY_KEY.T0,
        context(null, teamTodayFixture({ currentDjCount: 6, countBasis: "includes_owner" })),
      ).state,
    ).toBe("not_applicable")
    expect(resolveQuestion(QUESTION_BY_KEY.T0, context(null, null)).state).toBe("not_applicable")
  })
})
