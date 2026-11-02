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
      "TL1",
    ])
    expect(missing.map((row) => row.questionKey)).toEqual(["G1", "G3", "TL1"])
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
      { currentDjCount: 2, desiredDjCount: 4 },
      [{ questionKey: "G3", state: "estimated", value: "no_set_date" }],
    )
    expect(getMissingInputs(ctx, ["G1", "G2", "G3", "TL1", "TL6"])).toEqual([])
    const states = getInputStates(ctx, ["G1", "G2", "G3"])
    expect(states.find((row) => row.questionKey === "G3")).toMatchObject({ state: "estimated", isEstimate: true })
    expect(states.find((row) => row.questionKey === "G2")).toMatchObject({ state: "not_applicable", isEstimate: false })
  })
})

describe("question registry", () => {
  it("uses the approved keys, skip flags and why-it's-needed sentences", () => {
    expect(QUESTIONS.map((question) => question.key)).toEqual(["G1", "G2", "G3", "TL1", "TL6"])
    expect(QUESTIONS.every((question) => /^[A-Z]{1,2}[0-9]{1,2}[a-z]?$/.test(question.key))).toBe(true)
    expect(QUESTIONS.some((question) => question.key.startsWith("N"))).toBe(false)
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
  })
})
