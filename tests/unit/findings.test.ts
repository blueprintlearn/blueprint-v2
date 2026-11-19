import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BusinessFindingsView } from "@/app/blueprint/findings-ui"
import { resolveAll } from "@/lib/blueprint/answers"
import { completeDevelopmentAnswers } from "@/lib/blueprint/development"
import { completeEventsAnswers } from "@/lib/blueprint/events"
import {
  FINDINGS_NEEDS_APPROVAL,
  FINDINGS_STALE,
  NOT_COLLECTED,
  buildBusinessFindings,
  findingsAreCurrent,
  findingsGate,
} from "@/lib/blueprint/findings"
import { completeIdealDjAnswers } from "@/lib/blueprint/ideal-dj"
import { completeNumbersAnswers } from "@/lib/blueprint/numbers"
import { completeReviewAnswers } from "@/lib/blueprint/review"
import { completeServicesAnswers } from "@/lib/blueprint/services"
import { teamTodayFixture } from "@/lib/blueprint/team-today"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

const goals = { primary: { goal: "scale" as const }, others: [{ goal: "expand" as const }] }
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
  savedGoals: typeof goals | null = goals,
) {
  return { goals: savedGoals, teamToday: team, answers }
}

function approvedContext(
  answers: { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[] = [],
  savedGoals: typeof goals | null = goals,
) {
  const withoutReview = answers.filter((row) => row.questionKey !== "R1")
  const base = context(withoutReview, savedGoals)
  return context([...withoutReview, ...completeReviewAnswers(base)], savedGoals)
}

describe("findingsGate", () => {
  it("needs approval until R1 is an approved stamp that still holds", () => {
    expect(findingsGate(context())).toBe("needs_approval")
    expect(findingsGate(context([{ questionKey: "R1", state: "skipped", value: null }]))).toBe("needs_approval")
    expect(
      findingsGate(context([{ questionKey: "R1", state: "answered", value: { code: "not_yet" } }])),
    ).toBe("needs_approval")
    const current = approvedContext([{ questionKey: "E2", state: "answered", value: 80 }])
    expect(findingsGate(current)).toBe("current")
    expect(findingsAreCurrent(current)).toBe(true)
  })

  it("is stale when an earlier answer changes after approval, even if the old fingerprint could match again later", () => {
    const approved = approvedContext([{ questionKey: "E2", state: "answered", value: 80 }])
    const changed = {
      ...approved,
      answers: approved.answers.map((row) =>
        row.questionKey === "E2" ? { ...row, value: 90 } : row,
      ),
    }
    expect(findingsGate(changed)).toBe("stale")
    expect(findingsAreCurrent(changed)).toBe(false)
  })
})

describe("buildBusinessFindings", () => {
  it("reflects saved answers, marks estimates, and never invents missing values", () => {
    const answers = [
      ...completeEventsAnswers().filter((row) => row.questionKey !== "E2"),
      { questionKey: "E2", state: "estimated" as const, value: 80 },
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
      ...completeDevelopmentAnswers().filter((row) => row.questionKey !== "D1"),
      { questionKey: "D1", state: "skipped" as const, value: null },
      ...completeIdealDjAnswers(),
    ]
    const ctx = approvedContext(answers, null)
    const findings = buildBusinessFindings(ctx, resolveAll(ctx))
    expect(findings.gate).toBe("current")

    const eventCount = findings.groups
      .find((group) => group.id === "demand")
      ?.facts.find((fact) => fact.key === "E2")
    expect(eventCount).toMatchObject({ display: "80", kind: "estimated" })

    const goalsFact = findings.groups
      .find((group) => group.id === "growth")
      ?.facts.find((fact) => fact.key === "G1")
    expect(goalsFact).toMatchObject({ display: "Not answered yet", kind: "missing" })
    expect(goalsFact?.display).not.toMatch(/Scale|Expand/)

    const trainer = findings.groups
      .find((group) => group.id === "training")
      ?.facts.find((fact) => fact.key === "D3")
    expect(trainer).toMatchObject({ kind: "confirmed", display: "Owner" })

    expect(findings.needsClarification.some((fact) => fact.key === "G1" && fact.kind === "missing")).toBe(true)
    expect(findings.needsClarification.some((fact) => fact.key === "D1" && fact.kind === "skipped")).toBe(true)
    expect(findings.groups.flatMap((group) => group.facts).some((fact) => fact.key === "N2")).toBe(false)
    expect(findings.notCollected).toEqual(NOT_COLLECTED)
    expect(JSON.stringify(findings)).not.toMatch(/you need \d+ DJs|staffing calculator|training plan|we recommend|readiness score/)
  })

  it("lists unanswered cores as missing and omits unanswered go-deeper and not-applicable rows", () => {
    const ctx = approvedContext([{ questionKey: "E2", state: "answered", value: 80 }])
    const findings = buildBusinessFindings(ctx, resolveAll(ctx))
    const demand = findings.groups.find((group) => group.id === "demand")?.facts ?? []
    expect(demand.find((fact) => fact.key === "E1")).toMatchObject({ display: "Not answered yet", kind: "missing" })
    expect(demand.find((fact) => fact.key === "E2")).toMatchObject({ display: "80", kind: "confirmed" })
    expect(findings.groups.flatMap((group) => group.facts).some((fact) => fact.key === "T0")).toBe(false)
    expect(findings.groups.flatMap((group) => group.facts).some((fact) => fact.key === "G3")).toBe(false)
    expect(findings.needsClarification.some((fact) => fact.key === "E1" && fact.kind === "missing")).toBe(true)
    expect(findings.needsClarification.some((fact) => fact.key === "G3")).toBe(false)
    expect(findings.needsClarification.some((fact) => fact.key === "R1")).toBe(false)
  })
})

describe("BusinessFindingsView", () => {
  it("shows current findings and withholds them when approval is missing or stale", () => {
    const answers = [
      ...completeEventsAnswers(),
      ...completeServicesAnswers(),
      ...completeNumbersAnswers(),
      ...completeDevelopmentAnswers(),
      ...completeIdealDjAnswers(),
    ]
    const currentCtx = approvedContext(answers)
    const current = html(
      h(BusinessFindingsView, {
        companyName: "Company A",
        findings: buildBusinessFindings(currentCtx, resolveAll(currentCtx)),
      }),
    )
    expect(current).toContain('data-findings-gate="current"')
    expect(current).toContain("Company A")
    expect(current).not.toContain("Company B")
    expect(current).toContain('data-findings-key="E2"')
    expect(text(current)).toContain("80")
    expect(text(current)).toContain("Current team")
    expect(text(current)).toContain("Desired growth")
    expect(text(current)).toContain("Event demand")
    expect(text(current)).toContain("Pricing")
    expect(text(current)).toContain("Training resources")
    expect(text(current)).toContain("Not collected yet")
    expect(text(current)).not.toMatch(/we recommend|you need \d+ DJs/)

    const empty = html(
      h(BusinessFindingsView, {
        companyName: "Company A",
        findings: buildBusinessFindings(context(), resolveAll(context())),
      }),
    )
    expect(empty).toContain('data-findings-gate="needs_approval"')
    expect(empty).toContain(FINDINGS_NEEDS_APPROVAL)
    expect(empty).not.toContain('data-findings-key=')
    expect(text(empty)).not.toContain("80")

    const staleCtx = {
      ...currentCtx,
      answers: currentCtx.answers.map((row) => (row.questionKey === "E2" ? { ...row, value: 90 } : row)),
    }
    const stale = html(
      h(BusinessFindingsView, {
        companyName: "Company A",
        findings: buildBusinessFindings(staleCtx, resolveAll(staleCtx)),
      }),
    )
    expect(stale).toContain('data-findings-gate="stale"')
    expect(stale).toContain(FINDINGS_STALE)
    expect(stale).not.toContain('data-findings-key=')
    expect(text(stale)).not.toContain("80")
    expect(text(stale)).not.toContain("90")
  })
})
