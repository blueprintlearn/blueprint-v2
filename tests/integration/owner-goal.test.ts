import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import { COMPANY_A_ID, COMPANY_B_ID, createAnonClient, SEED_PASSWORD } from "../rls/helpers"

describe("owner goal persistence", () => {
  it("lets a new owner save only their company goal", async () => {
    const email = `owner-goal-${randomUUID()}@blueprint.test`
    const client = createAnonClient()

    const { error: signUpError } = await client.auth.signUp({
      email,
      password: SEED_PASSWORD,
    })
    expect(signUpError).toBeNull()

    const { data: company, error: companyError } = await client.rpc("create_company", {
      p_name: `Goal Co ${randomUUID()}`,
    })
    expect(companyError).toBeNull()
    expect(company?.id).toBeTruthy()
    const companyId = company?.id as string

    const empty = await client.from("company_blueprints").select("company_id")
    expect(empty.data ?? []).toEqual([])

    const { error: saveError } = await client.from("company_blueprints").insert({
      company_id: companyId,
      owner_goal: "other",
      owner_goal_other: "Open a second city",
    })
    expect(saveError).toBeNull()

    const { data: visible } = await client
      .from("company_blueprints")
      .select("company_id, owner_goal, owner_goal_other")
    expect(visible).toEqual([
      {
        company_id: companyId,
        owner_goal: "other",
        owner_goal_other: "Open a second city",
      },
    ])

    const companyA = await client
      .from("company_blueprints")
      .select("company_id")
      .eq("company_id", COMPANY_A_ID)
    const companyB = await client
      .from("company_blueprints")
      .select("company_id")
      .eq("company_id", COMPANY_B_ID)
    expect(companyA.data ?? []).toEqual([])
    expect(companyB.data ?? []).toEqual([])
  })

  it("rejects unauthenticated owner goal writes", async () => {
    const client = createAnonClient()
    const { error } = await client.from("company_blueprints").insert({
      company_id: COMPANY_A_ID,
      owner_goal: "scale",
      owner_goal_other: null,
    })
    expect(error).not.toBeNull()
  })
})
