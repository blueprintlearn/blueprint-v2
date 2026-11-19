import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  guided: true,
  goals: { primary: { goal: "scale" as const }, others: [] } as { primary: { goal: string }; others: unknown[] } | null,
  team: null as null | object,
  answers: [] as { questionKey: string; state: "answered" | "estimated" | "skipped"; value: unknown }[],
  planning: null as { inputs: unknown; recommendation_response: unknown } | null,
  plans: [] as object[],
  insertPublished: vi.fn(),
  upsertDraft: vi.fn(),
  unpublish: vi.fn(),
  slugTaken: vi.fn(),
  loadPages: vi.fn(),
  loadStrategies: vi.fn(),
  sync: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentMembership: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: mocks.getCurrentMembership }))
vi.mock("@/lib/blueprint/guided-switch", () => ({ isGuidedBlueprintEnabled: () => mocks.guided }))
vi.mock("@/lib/blueprint/queries", () => ({
  getCurrentCompanyGoals: async () => mocks.goals,
  getCurrentTeamToday: async () => mocks.team,
  getCurrentBlueprintAnswers: async () => mocks.answers,
  getCurrentGrowthPlanning: async () => mocks.planning,
  getCurrentGrowthPlans: async () => mocks.plans,
}))
vi.mock("@/lib/blueprint/recruitment-store", () => ({
  loadRecruitmentRows: mocks.loadStrategies,
  syncApprovedStrategiesToFingerprint: mocks.sync,
}))
vi.mock("@/lib/blueprint/recruiting-store", () => ({
  insertPublishedPage: mocks.insertPublished,
  upsertDraftPage: mocks.upsertDraft,
  unpublishPage: mocks.unpublish,
  slugTakenByOther: mocks.slugTaken,
  loadRecruitingRows: mocks.loadPages,
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }))

import {
  publishRecruitingPage,
  saveRecruitingDraft,
  saveRecruitingEditor,
  unpublishRecruitingPage,
} from "@/lib/blueprint/recruiting-actions"
import { composeProposedStrategy, emptyRecruitInputs } from "@/lib/blueprint/recruitment"
import { emptyRecruitDecisions } from "@/lib/blueprint/recruitment-engine"
import { resolveAll } from "@/lib/blueprint/answers"
import { OWNER_ONLY_MESSAGE } from "@/lib/blueprint/questions"
import { RECRUITING_CONFIRM_MESSAGE, RECRUITING_NEED_STRATEGY, RECRUITING_SLUG_MESSAGE } from "@/lib/blueprint/recruiting"
import { composeRecruitingMaterials } from "@/lib/blueprint/recruiting-engine"
import { emptyTeamToday } from "@/lib/blueprint/team-today"

const initial = { error: null, savedAt: null }
const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

function approvedStrategy() {
  const context = {
    goals: mocks.goals!,
    teamToday: (mocks.team ?? emptyTeamToday()) as ReturnType<typeof emptyTeamToday>,
    answers: mocks.answers,
  }
  const resolved = resolveAll(context)
  const inputs = { ...emptyRecruitInputs(), reason: "growth" as const, hiringTarget: 2, hireProfile: "beginner" as const }
  const composed = composeProposedStrategy(context, resolved, null, inputs)
  return {
    id: "strat-1",
    version: 1,
    status: "approved" as const,
    sourceFingerprint: composed.fingerprint,
    inputs,
    recommended: composed.proposed,
    decisions: emptyRecruitDecisions(),
    warnings: [],
    approvedBy: "user-a",
    approvedAt: "2026-01-15T12:00:00.000Z",
  }
}

function editorFields() {
  const strategy = approvedStrategy()
  const handoff = {
    companyId: "company-a",
    strategyId: strategy.id,
    version: strategy.version,
    approvedAt: strategy.approvedAt,
    approvedBy: strategy.approvedBy,
    reason: "growth" as const,
    hiringTarget: 2,
    hireProfile: "beginner" as const,
    candidate: { required: ["Run events."], preferred: [], values: [] },
    employment: { arrangement: null, compensation: "Not provided. Blueprint will not invent a rate or local market price." },
    channels: [],
    budgetApproach: "",
    nextSteps: [],
    ownerNote: null,
  }
  const materials = composeRecruitingMaterials("Company A", handoff, "/join/company-a")
  return {
    slug: "company-a",
    companyName: materials.page.companyName,
    headline: materials.page.headline,
    introduction: materials.page.introduction,
    roleTitle: materials.page.roleTitle,
    roleDescription: materials.page.roleDescription,
    responsibilities: materials.page.responsibilities.join("\n"),
    required: materials.page.required.join("\n"),
    preferred: materials.page.preferred.join("\n"),
    indeedTitle: materials.ads.indeed.title,
    indeedBody: materials.ads.indeed.body,
    socialTitle: materials.ads.social.title,
    socialBody: materials.ads.social.body,
    referralTitle: materials.ads.referral.title,
    referralBody: materials.ads.referral.body,
    generalTitle: materials.ads.general.title,
    generalBody: materials.ads.general.body,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.membership = { companyId: "company-a", companyName: "Company A", role: "owner_admin" }
  mocks.getCurrentMembership.mockImplementation(async () => mocks.membership)
  mocks.guided = true
  mocks.goals = { primary: { goal: "scale" }, others: [] }
  mocks.team = emptyTeamToday()
  mocks.answers = []
  mocks.planning = null
  mocks.plans = []
  mocks.insertPublished.mockResolvedValue({ error: null })
  mocks.upsertDraft.mockResolvedValue({ error: null })
  mocks.unpublish.mockResolvedValue({ error: null })
  mocks.slugTaken.mockResolvedValue(false)
  mocks.loadPages.mockResolvedValue([])
  mocks.loadStrategies.mockResolvedValue([approvedStrategy()])
  mocks.sync.mockResolvedValue(undefined)
})

describe("recruiting actions", () => {
  it("rejects non-owners before writing", async () => {
    mocks.membership = { companyId: "company-a", companyName: "Company A", role: "manager" }
    expect(await publishRecruitingPage(initial, form({ ...editorFields(), confirmPublish: "1" }))).toEqual({
      error: OWNER_ONLY_MESSAGE,
      savedAt: null,
    })
    expect(mocks.insertPublished).not.toHaveBeenCalled()
  })

  it("does not use a missing strategy", async () => {
    mocks.loadStrategies.mockResolvedValue([])
    expect(await saveRecruitingDraft(initial, form(editorFields()))).toEqual({
      error: RECRUITING_NEED_STRATEGY,
      savedAt: null,
    })
    expect(mocks.upsertDraft).not.toHaveBeenCalled()
  })

  it("does not publish from a draft save", async () => {
    expect((await saveRecruitingEditor(initial, form({ ...editorFields(), intent: "draft" }))).error).toBeNull()
    expect(mocks.upsertDraft).toHaveBeenCalled()
    expect(mocks.insertPublished).not.toHaveBeenCalled()
  })

  it("requires an explicit confirmation before publishing", async () => {
    expect(await publishRecruitingPage(initial, form(editorFields()))).toEqual({
      error: RECRUITING_CONFIRM_MESSAGE,
      savedAt: null,
    })
    expect(mocks.insertPublished).not.toHaveBeenCalled()
  })

  it("publishes only after the owner confirms", async () => {
    const result = await publishRecruitingPage(initial, form({ ...editorFields(), confirmPublish: "1" }))
    expect(result.error).toBeNull()
    expect(mocks.insertPublished).toHaveBeenCalled()
    expect(mocks.upsertDraft).not.toHaveBeenCalled()
  })

  it("rejects an invalid slug without writing", async () => {
    expect(await saveRecruitingDraft(initial, form({ ...editorFields(), slug: "JOIN" }))).toEqual({
      error: RECRUITING_SLUG_MESSAGE,
      savedAt: null,
    })
    expect(mocks.upsertDraft).not.toHaveBeenCalled()
  })

  it("unpublishes only for an authorized owner", async () => {
    mocks.loadPages.mockResolvedValue([{ status: "published", slug: "company-a" }])
    expect((await unpublishRecruitingPage(initial, form({}))).error).toBeNull()
    expect(mocks.unpublish).toHaveBeenCalledWith({}, "company-a")
  })
})
