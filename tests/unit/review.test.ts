import { describe, expect, it } from "vitest"

import { resolveAll } from "@/lib/blueprint/answers"
import {
  REVIEW_CHOICE_MESSAGE,
  approvalStillHolds,
  buildBusinessSnapshot,
  parseApproval,
  snapshotDisplay,
  snapshotFingerprint,
} from "@/lib/blueprint/review"
import { completeEventsAnswers } from "@/lib/blueprint/events"
import { completeIdealDjAnswers } from "@/lib/blueprint/ideal-dj"
import { completeNumbersAnswers } from "@/lib/blueprint/numbers"
import { completeServicesAnswers } from "@/lib/blueprint/services"
import { teamTodayFixture } from "@/lib/blueprint/team-today"

const goals = { primary: { goal: "scale" }, others: [{ goal: "expand" }] }
const team = teamTodayFixture({
  currentDjCount: 3,
  desiredDjCount: 5,
  countBasis: "excludes_owner",
  desiredCountBasis: "excludes_owner",
  assistantOnlyCount: 1,
  ownerDjFrequency: "sometimes",
  leadCapableCount: 2,
})

function context(
  answers: { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[] = [],
) {
  return { goals, teamToday: team, answers }
}

describe("review approval answers", () => {
  it("accepts approve, not yet, and not sure, and rejects unknown codes", () => {
    expect(parseApproval("approved").ok).toBe(true)
    expect(parseApproval("not_yet").ok).toBe(true)
    expect(parseApproval({ code: "not_sure", fingerprint: "abc" })).toEqual({
      ok: true,
      value: { code: "not_sure", fingerprint: "abc" },
    })
    expect(parseApproval("hire_now")).toEqual({ ok: false, error: REVIEW_CHOICE_MESSAGE })
  })

  it("keeps an approved snapshot only while the fingerprint still matches", () => {
    expect(approvalStillHolds({ code: "approved", fingerprint: "same" }, "same")).toBe(true)
    expect(approvalStillHolds({ code: "approved", fingerprint: "old" }, "new")).toBe(false)
    expect(approvalStillHolds({ code: "not_yet", fingerprint: "old" }, "new")).toBe(true)
    expect(approvalStillHolds({ code: "approved" }, "anything")).toBe(true)
  })

  it("changes the fingerprint when an earlier answer changes", () => {
    const first = snapshotFingerprint(context([{ questionKey: "E2", state: "answered", value: 80 }]))
    const second = snapshotFingerprint(context([{ questionKey: "E2", state: "answered", value: 90 }]))
    expect(first).not.toBe(second)
    expect(snapshotFingerprint(context([{ questionKey: "R1", state: "answered", value: { code: "approved" } }]))).toBe(
      snapshotFingerprint(context()),
    )
  })
})

describe("business snapshot", () => {
  it("uses friendly labels, keeps skipped and unanswered honest, and does not invent values", () => {
    const answers = [
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
      ...completeIdealDjAnswers(),
      { questionKey: "D1", state: "skipped" as const, value: null },
      { questionKey: "E2", state: "estimated" as const, value: 80 },
    ]
    const ctx = context(answers)
    const resolved = resolveAll(ctx)
    expect(snapshotDisplay(resolved.find((row) => row.key === "G1")!, goals)).toContain("Scale")
    expect(snapshotDisplay(resolved.find((row) => row.key === "G1")!, goals)).toContain("Expand")
    expect(snapshotDisplay(resolved.find((row) => row.key === "E2")!, goals)).toBe("80")
    expect(resolved.find((row) => row.key === "E2")?.isEstimate).toBe(true)
    expect(snapshotDisplay(resolved.find((row) => row.key === "N1")!, goals)).toContain("$")
    expect(snapshotDisplay(resolved.find((row) => row.key === "I1")!, goals)).toBe("I don’t have anyone in mind")
    expect(snapshotDisplay(resolved.find((row) => row.key === "D1")!, goals)).toBe("Skipped")
    expect(snapshotDisplay(resolved.find((row) => row.key === "D2")!, goals)).toBe("Not answered yet")

    const groups = buildBusinessSnapshot(ctx, resolved)
    expect(groups.map((group) => group.slug)).toEqual([
      "goals",
      "team",
      "events",
      "services",
      "numbers",
      "development",
      "ideal-dj",
    ])
    expect(groups.every((group) => group.href === `/blueprint/${group.slug}`)).toBe(true)
    expect(groups.find((group) => group.slug === "numbers")?.privacyNote).toContain("private")
    expect(groups.find((group) => group.slug === "development")?.rows.some((row) => row.display === "Not answered yet")).toBe(
      true,
    )
    expect(JSON.stringify(groups)).not.toMatch(/wedding|can_teach|yes_personality|finding_candidates/)
  })
})
