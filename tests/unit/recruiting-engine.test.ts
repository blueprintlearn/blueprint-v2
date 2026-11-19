import { describe, expect, it } from "vitest"

import {
  APPLICATIONS_NOT_ENABLED,
  adsFromPage,
  composeRecruitingMaterials,
  isValidSlug,
  recruitingPublicPath,
  roleTitleFromProfile,
  suggestSlug,
} from "@/lib/blueprint/recruiting-engine"
import type { RecruitmentStrategyHandoff } from "@/lib/blueprint/recruitment-strategy-handoff"

const handoff = (overrides: Partial<RecruitmentStrategyHandoff> = {}): RecruitmentStrategyHandoff => ({
  companyId: "company-a",
  strategyId: "strat-1",
  version: 1,
  approvedAt: "2026-01-15T12:00:00.000Z",
  approvedBy: "user-a",
  reason: "growth",
  hiringTarget: 2,
  hireProfile: "beginner",
  candidate: {
    required: [
      "Run events to the company’s standard. Specific duties were not provided yet.",
      "Available for typical event times: Friday evenings.",
      "Able to reach event locations: Within 45 minutes.",
    ],
    preferred: ["MC work can be taught."],
    values: [
      {
        value: "Show up prepared",
        behavior: "Show “Show up prepared” in how you prepare, communicate, and run events.",
        interviewQuestion: "Tell me about a time you demonstrated “Show up prepared”.",
      },
    ],
  },
  employment: {
    arrangement: "w2",
    compensation: "Not provided. Blueprint will not invent a rate or local market price.",
  },
  channels: ["referrals", "company_page"],
  budgetApproach: "Unpaid channels first.",
  nextSteps: [],
  ownerNote: null,
  ...overrides,
})

describe("recruiting slugs and titles", () => {
  it("builds a safe slug from the company name and rejects reserved names", () => {
    expect(suggestSlug("Company C")).toBe("company-c")
    expect(suggestSlug("DJ & Lights!!!")).toBe("dj-lights")
    expect(isValidSlug("company-c")).toBe(true)
    expect(isValidSlug("JOIN")).toBe(false)
    expect(isValidSlug("join")).toBe(false)
    expect(isValidSlug("ab")).toBe(false)
    expect(isValidSlug("company_c")).toBe(false)
    expect(recruitingPublicPath("company-c")).toBe("/join/company-c")
  })

  it("names the role from the hire profile without extra claims", () => {
    expect(roleTitleFromProfile("beginner")).toBe("DJ (training provided)")
    expect(roleTitleFromProfile("experienced")).toBe("Experienced DJ")
    expect(roleTitleFromProfile("either")).toBe("DJ")
    expect(roleTitleFromProfile(null)).toBe("DJ")
  })
})

describe("composeRecruitingMaterials", () => {
  it("uses approved facts and does not invent pay, benefits, or an apply path", () => {
    const materials = composeRecruitingMaterials("Company C", handoff(), "/join/company-c")
    expect(materials.page.companyName).toBe("Company C")
    expect(materials.page.roleTitle).toBe("DJ (training provided)")
    expect(materials.page.compensation).toBeNull()
    expect(materials.page.showCompensation).toBe(false)
    expect(materials.page.arrangement).toBe("W-2 employees")
    expect(materials.page.availability).toContain("Friday evenings")
    expect(materials.page.travel).toContain("Within 45 minutes")
    expect(materials.page.values[0]?.value).toBe("Show up prepared")
    expect(materials.page.introduction).not.toMatch(/best|guarantee|competitive/i)
    for (const ad of Object.values(materials.ads)) {
      expect(ad.body).toContain("/join/company-c")
      expect(ad.body).not.toMatch(/\$\d/)
      expect(ad.body).not.toMatch(/apply now/i)
      expect(ad.body).toMatch(/applications are not open yet/i)
      expect(ad.body).not.toMatch(/health insurance|401k|unlimited events/i)
    }
    expect(APPLICATIONS_NOT_ENABLED).toMatch(/not open yet/i)
  })

  it("shows owner-provided compensation only when asked to display it", () => {
    const materials = composeRecruitingMaterials(
      "Company C",
      handoff({
        employment: { arrangement: "1099", compensation: "$40 per event (owner-provided)" },
      }),
      "/join/company-c",
    )
    expect(materials.page.compensation).toBe("$40 per event")
    expect(materials.page.showCompensation).toBe(true)
    expect(materials.ads.indeed.body).toContain("Compensation: $40 per event")
    const hidden = adsFromPage({ ...materials.page, showCompensation: false }, "/join/company-c")
    expect(hidden.indeed.body).not.toContain("Compensation:")
  })
})
