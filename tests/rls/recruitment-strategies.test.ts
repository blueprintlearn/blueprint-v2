import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  MANAGER_A_EMAIL,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
} from "./helpers"
import { querySql } from "./sql"

function clearStrategies() {
  querySql(`
    delete from public.company_recruitment_strategies where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
  `)
}

beforeEach(clearStrategies)
afterAll(clearStrategies)

const inputs = {
  reason: "growth",
  useGrowthPlan: false,
  hiringTarget: 2,
  hireProfile: "beginner",
  responsibilities: null,
  availability: null,
  travel: null,
  employment: null,
  compensation: { kind: "not_provided" },
  urgency: null,
  training: null,
  budget: { kind: "unsure" },
  note: null,
}

const recommended = {
  why: { reason: "growth", explanation: "Need additional DJs." },
  hiring: { target: 2, profile: "beginner", status: "owner", explanation: "Owner set 2." },
  profile: { required: [], preferred: [], values: [] },
  employment: { arrangement: null, compensation: "Not provided.", explanation: "Not set." },
  channels: [],
  budget: { approach: "Unpaid channels first.", estimated: false },
  nextSteps: [{ text: "Recruit 2 people.", source: "recommendation" }],
}

const decisions = { stance: "accept", hiringTarget: null, hireProfile: null, channels: null, note: null }

describe("company_recruitment_strategies isolation", () => {
  it("lets owner A draft and approve; others get nothing", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const draft = await ownerA.from("company_recruitment_strategies").insert({
      company_id: COMPANY_A_ID,
      version: 1,
      status: "draft",
      source_fingerprint: "a".repeat(64),
      inputs,
      recommended,
      decisions,
      warnings: [],
    })
    expect(draft.error).toBeNull()

    const approved = await ownerA.from("company_recruitment_strategies").insert({
      company_id: COMPANY_A_ID,
      version: 2,
      status: "approved",
      source_fingerprint: "b".repeat(64),
      inputs,
      recommended,
      decisions,
      warnings: [],
      approved_by: "00000000-0000-4000-8000-0000000000b2",
      approved_at: "1999-01-01T00:00:00.000Z",
    })
    expect(approved.error).toBeNull()
    const stamped = await ownerA
      .from("company_recruitment_strategies")
      .select("approved_by, approved_at, status, version")
      .eq("version", 2)
      .single()
    expect(stamped.data?.status).toBe("approved")
    expect(stamped.data?.approved_by).not.toBe("00000000-0000-4000-8000-0000000000b2")
    expect(stamped.data?.approved_at).not.toBe("1999-01-01T00:00:00.000Z")

    const rewrite = await ownerA
      .from("company_recruitment_strategies")
      .update({ decisions: { stance: "modify" } })
      .eq("version", 2)
      .eq("company_id", COMPANY_A_ID)
    expect(rewrite.error).not.toBeNull()

    const managerA = await asUser(MANAGER_A_EMAIL)
    expect((await managerA.from("company_recruitment_strategies").select("id")).data ?? []).toEqual([])
    const managerWrite = await managerA.from("company_recruitment_strategies").insert({
      company_id: COMPANY_A_ID,
      version: 3,
      status: "approved",
      source_fingerprint: "c".repeat(64),
      inputs,
      recommended,
      decisions,
    })
    expect(managerWrite.error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_recruitment_strategies").select("id")).data ?? []).toEqual([])
    const writeA = await ownerB.from("company_recruitment_strategies").insert({
      company_id: COMPANY_A_ID,
      version: 3,
      status: "approved",
      source_fingerprint: "d".repeat(64),
      inputs,
      recommended,
      decisions,
    })
    expect(writeA.error).not.toBeNull()

    const anon = createAnonClient()
    expect((await anon.from("company_recruitment_strategies").select("id")).data ?? []).toEqual([])
  })
})
