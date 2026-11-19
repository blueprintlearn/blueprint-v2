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

function clearPlans() {
  querySql(`
    delete from public.company_growth_plans where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
    delete from public.company_growth_planning where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');
  `)
}

beforeEach(clearPlans)
afterAll(clearPlans)

const recommended = {
  summary: {
    staffing: "3 independent lead DJs",
    demand: "Target covered",
    training: "Training available",
    primaryObstacle: { kind: "demand", label: "Increase booking demand before hiring", explanation: "Demand first.", status: "calculated" },
  },
  hiring: {
    recommendedTarget: { status: "calculated", value: 0, explanation: "No hire.", missing: [] },
    recommendedProfile: "unspecified",
    explanation: "Demand first.",
  },
  recruiting: { kind: "demand", approach: "Focus on demand.", notes: [] },
  training: { canSupportBeginners: true, limitations: "Can train.", preparation: "Keep trainers ready." },
  nextSteps: [{ text: "Increase demand.", source: "recommendation" }],
}

const decisions = { stance: "accept", hiringTarget: null, hireProfile: null, recruitingKind: null, note: null }

describe("company_growth_plans isolation", () => {
  it("lets owner A draft and approve; others get nothing", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const draft = await ownerA.from("company_growth_plans").insert({
      company_id: COMPANY_A_ID,
      version: 1,
      status: "draft",
      source_fingerprint: "a".repeat(64),
      recommended,
      decisions,
      warnings: [],
    })
    expect(draft.error).toBeNull()

    const approved = await ownerA.from("company_growth_plans").insert({
      company_id: COMPANY_A_ID,
      version: 2,
      status: "approved",
      source_fingerprint: "b".repeat(64),
      recommended,
      decisions,
      warnings: [],
      approved_by: "00000000-0000-4000-8000-0000000000b2",
      approved_at: "1999-01-01T00:00:00.000Z",
    })
    expect(approved.error).toBeNull()
    const stamped = await ownerA
      .from("company_growth_plans")
      .select("approved_by, approved_at, status, version")
      .eq("version", 2)
      .single()
    expect(stamped.data?.status).toBe("approved")
    expect(stamped.data?.approved_by).not.toBe("00000000-0000-4000-8000-0000000000b2")
    expect(stamped.data?.approved_at).not.toBe("1999-01-01T00:00:00.000Z")

    const rewrite = await ownerA
      .from("company_growth_plans")
      .update({ decisions: { stance: "reject" } })
      .eq("version", 2)
      .eq("company_id", COMPANY_A_ID)
    expect(rewrite.error).not.toBeNull()

    const managerA = await asUser(MANAGER_A_EMAIL)
    expect((await managerA.from("company_growth_plans").select("id")).data ?? []).toEqual([])
    const managerWrite = await managerA.from("company_growth_plans").insert({
      company_id: COMPANY_A_ID,
      version: 3,
      status: "approved",
      source_fingerprint: "c".repeat(64),
      recommended,
      decisions,
    })
    expect(managerWrite.error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_growth_plans").select("id")).data ?? []).toEqual([])
    const writeA = await ownerB.from("company_growth_plans").insert({
      company_id: COMPANY_A_ID,
      version: 3,
      status: "approved",
      source_fingerprint: "d".repeat(64),
      recommended,
      decisions,
    })
    expect(writeA.error).not.toBeNull()

    const anon = createAnonClient()
    expect((await anon.from("company_growth_plans").select("id")).data ?? []).toEqual([])
  })
})
