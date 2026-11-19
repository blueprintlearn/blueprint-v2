import { describe, expect, it } from "vitest"

import {
  applyRecruitDecisions,
  composeRecruitStrategy,
  emptyRecruitDecisions,
  emptyRecruitInputs,
  type RecruitInputs,
  type Stage1RecruitFacts,
} from "@/lib/blueprint/recruitment-engine"
import type { RecruitmentHandoff } from "@/lib/blueprint/recruitment-handoff"

function facts(partial: Partial<Stage1RecruitFacts> = {}): Stage1RecruitFacts {
  return {
    priorities: null,
    values: null,
    skills: null,
    beginner: null,
    hiringWeight: null,
    availability: null,
    travel: null,
    arrangement: null,
    ...partial,
  }
}

function growth(partial: Partial<RecruitmentHandoff> = {}): RecruitmentHandoff {
  return {
    companyId: "company-a",
    planId: "plan-1",
    version: 2,
    approvedAt: "2026-01-15T12:00:00.000Z",
    approvedBy: "00000000-0000-4000-8000-0000000000a2",
    hiringTarget: { count: 3, status: "owner_set", source: "owner", explanation: "You set 3." },
    hireProfile: "experienced",
    recruitingApproach: { kind: "recruit", summary: "Recruit", source: "recommended" },
    training: { canSupportBeginners: true, limitations: "", preparation: "" },
    ownerDecisions: {
      acceptedRecommendations: true,
      rejectedRecommendations: false,
      note: null,
      modifications: [],
    },
    warnings: [],
    nextSteps: [],
    ...partial,
  }
}

function inputs(partial: Partial<RecruitInputs> = {}): RecruitInputs {
  return { ...emptyRecruitInputs(), ...partial }
}

describe("composeRecruitStrategy", () => {
  it("uses a current growth plan only when the owner opts in", () => {
    const used = composeRecruitStrategy({
      facts: facts(),
      growth: growth(),
      inputs: inputs({ reason: "growth", useGrowthPlan: true }),
    })
    expect(used.recommended.hiring.target).toBe(3)
    expect(used.recommended.hiring.profile).toBe("experienced")
    expect(used.recommended.hiring.status).toBe("from_growth_plan")

    const skipped = composeRecruitStrategy({
      facts: facts(),
      growth: growth(),
      inputs: inputs({ reason: "growth", useGrowthPlan: false }),
    })
    expect(skipped.recommended.hiring.target).toBeNull()
    expect(skipped.recommended.hiring.status).toBe("unavailable")
    expect(skipped.recommended.hiring.explanation).toMatch(/will not invent a staffing requirement/)
  })

  it("does not use a missing growth plan even if the owner asked to", () => {
    const result = composeRecruitStrategy({
      facts: facts(),
      growth: null,
      inputs: inputs({ reason: "growth", useGrowthPlan: true, hiringTarget: 2 }),
    })
    expect(result.recommended.hiring.target).toBe(2)
    expect(result.recommended.hiring.status).toBe("owner")
    expect(result.warnings.some((row) => row.title === "The approved growth plan is not current")).toBe(true)
  })

  it("lets replacement hiring continue without a growth plan", () => {
    const result = composeRecruitStrategy({
      facts: facts({ availability: ["saturday"], travel: "miles_30" }),
      growth: null,
      inputs: inputs({
        reason: "replacement",
        hiringTarget: 1,
        hireProfile: "experienced",
        responsibilities: "Cover the events the departing DJ ran.",
      }),
    })
    expect(result.recommended.why.reason).toBe("replacement")
    expect(result.recommended.hiring.target).toBe(1)
    expect(result.recommended.profile.required.some((item) => item.text.includes("Saturdays"))).toBe(true)
    expect(result.recommended.profile.required.some((item) => item.text.includes("30 miles"))).toBe(true)
  })

  it("leaves missing hiring and pay unavailable instead of inventing them", () => {
    const result = composeRecruitStrategy({
      facts: facts(),
      growth: null,
      inputs: inputs({ reason: "capacity" }),
    })
    expect(result.recommended.hiring.target).toBeNull()
    expect(result.recommended.employment.compensation).toMatch(/Not provided/)
    expect(result.recommended.employment.arrangement).toBeNull()
    expect(result.recommended.budget.estimated).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/\$\d+ per hour(?! \(owner-provided\))/)
  })

  it("translates owner core values into job behaviors, not protected traits", () => {
    const result = composeRecruitStrategy({
      facts: facts({
        values: { defined: true, values: ["Show up prepared", "Treat clients well", "Own the night"] },
        skills: {
          djing: "must_have",
          music: "can_teach",
          speaking: "can_teach",
          customer_service: "must_have",
          events: "can_teach",
          audio: "can_teach",
          lighting: "not_important",
          sales: "not_sure",
        },
      }),
      growth: null,
      inputs: inputs({ reason: "growth", hiringTarget: 2, hireProfile: "beginner" }),
    })
    expect(result.recommended.profile.values).toHaveLength(3)
    expect(result.recommended.profile.values[0]?.interviewQuestion).toMatch(/Show up prepared/)
    const screening = `${result.recommended.profile.values.map((row) => `${row.behavior} ${row.interviewQuestion}`).join(" ")} ${result.recommended.profile.required.map((item) => item.text).join(" ")}`
    expect(screening).not.toMatch(/\b(age|gender|race|religion|national origin|disability|pregnancy)\b/i)
    expect(result.recommended.profile.required.some((item) => item.text.includes("DJing"))).toBe(true)
    expect(result.recommended.profile.preferred.some((item) => item.text.includes("Music knowledge"))).toBe(true)
  })

  it("recommends unpaid channels first and does not claim a budget will produce applicants", () => {
    const result = composeRecruitStrategy({
      facts: facts(),
      growth: null,
      inputs: inputs({
        reason: "growth",
        hiringTarget: 1,
        hireProfile: "beginner",
        urgency: "flexible",
        budget: { kind: "none" },
        training: "yes",
      }),
    })
    const recommended = result.recommended.channels.filter((row) => row.recommended).map((row) => row.id)
    expect(recommended).toContain("referrals")
    expect(recommended).toContain("company_page")
    expect(recommended).not.toContain("indeed")
    expect(result.recommended.budget.approach).toMatch(/will not invent a local ad price/)
    expect(result.recommended.budget.approach).not.toMatch(/guarantee/)
  })
})

describe("applyRecruitDecisions", () => {
  it("records owner modifications without inventing a headcount", () => {
    const composed = composeRecruitStrategy({
      facts: facts(),
      growth: null,
      inputs: inputs({ reason: "growth", hiringTarget: 2, hireProfile: "beginner" }),
    })
    const effective = applyRecruitDecisions(
      composed.recommended,
      {
        stance: "modify",
        hiringTarget: 4,
        hireProfile: "experienced",
        channels: ["referrals", "indeed"],
        note: "Focus on weekend coverage.",
      },
      composed.warnings,
    )
    expect(effective.hiringTarget).toBe(4)
    expect(effective.hireProfile).toBe("experienced")
    expect(effective.channels.find((row) => row.id === "indeed")?.recommended).toBe(true)
    expect(effective.modifications.length).toBeGreaterThan(0)
    expect(effective.nextSteps.some((step) => step.text.includes("Focus on weekend coverage"))).toBe(true)
  })

  it("keeps accept stance on the recommended strategy", () => {
    const composed = composeRecruitStrategy({
      facts: facts(),
      growth: growth(),
      inputs: inputs({ reason: "growth", useGrowthPlan: true }),
    })
    const effective = applyRecruitDecisions(composed.recommended, emptyRecruitDecisions(), composed.warnings)
    expect(effective.hiringTarget).toBe(3)
    expect(effective.modifications).toEqual([])
  })
})
