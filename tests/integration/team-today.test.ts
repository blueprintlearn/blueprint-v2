import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import { COMPANY_A_ID, COMPANY_B_ID, createAnonClient, SEED_PASSWORD } from "../rls/helpers"

describe("team today persistence", () => {
  it("lets a new owner save only their company DJ count", async () => {
    const email = `team-today-${randomUUID()}@blueprint.test`
    const client = createAnonClient()

    const { error: signUpError } = await client.auth.signUp({
      email,
      password: SEED_PASSWORD,
    })
    expect(signUpError).toBeNull()

    const { data: company, error: companyError } = await client.rpc("create_company", {
      p_name: `Team Today Co ${randomUUID()}`,
    })
    expect(companyError).toBeNull()
    expect(company?.id).toBeTruthy()
    const companyId = company?.id as string

    const empty = await client.from("company_team_today").select("company_id")
    expect(empty.data ?? []).toEqual([])

    const { error: saveError } = await client.from("company_team_today").insert({
      company_id: companyId,
      current_dj_count: 0,
    })
    expect(saveError).toBeNull()

    const { data: visible } = await client
      .from("company_team_today")
      .select("company_id, current_dj_count")
    expect(visible).toEqual([
      {
        company_id: companyId,
        current_dj_count: 0,
      },
    ])

    const companyA = await client
      .from("company_team_today")
      .select("company_id")
      .eq("company_id", COMPANY_A_ID)
    const companyB = await client
      .from("company_team_today")
      .select("company_id")
      .eq("company_id", COMPANY_B_ID)
    expect(companyA.data ?? []).toEqual([])
    expect(companyB.data ?? []).toEqual([])
  })

  it("rejects unauthenticated DJ count writes", async () => {
    const client = createAnonClient()
    const { error } = await client.from("company_team_today").insert({
      company_id: COMPANY_A_ID,
      current_dj_count: 3,
    })
    expect(error).not.toBeNull()
  })

  it("does not create a row when saving desired DJ count first", async () => {
    const email = `desired-first-${randomUUID()}@blueprint.test`
    const client = createAnonClient()

    const { error: signUpError } = await client.auth.signUp({
      email,
      password: SEED_PASSWORD,
    })
    expect(signUpError).toBeNull()

    const { data: company, error: companyError } = await client.rpc("create_company", {
      p_name: `Desired First Co ${randomUUID()}`,
    })
    expect(companyError).toBeNull()
    expect(company?.id).toBeTruthy()
    const companyId = company?.id as string

    const { data: updated, error: updateError } = await client
      .from("company_team_today")
      .update({ desired_dj_count: 8 })
      .eq("company_id", companyId)
      .select("company_id")
    expect(updateError).toBeNull()
    expect(updated ?? []).toEqual([])

    const empty = await client.from("company_team_today").select("company_id")
    expect(empty.data ?? []).toEqual([])
  })

  it("persists desired DJ count without clearing current DJ count", async () => {
    const email = `desired-keep-${randomUUID()}@blueprint.test`
    const client = createAnonClient()

    const { error: signUpError } = await client.auth.signUp({
      email,
      password: SEED_PASSWORD,
    })
    expect(signUpError).toBeNull()

    const { data: company, error: companyError } = await client.rpc("create_company", {
      p_name: `Desired Keep Co ${randomUUID()}`,
    })
    expect(companyError).toBeNull()
    const companyId = company?.id as string

    const { error: insertError } = await client.from("company_team_today").insert({
      company_id: companyId,
      current_dj_count: 3,
    })
    expect(insertError).toBeNull()

    const unset = await client
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", companyId)
      .maybeSingle()
    expect(unset.data?.desired_dj_count).toBeNull()

    const { error: desiredError } = await client
      .from("company_team_today")
      .update({ desired_dj_count: 12 })
      .eq("company_id", companyId)
    expect(desiredError).toBeNull()

    const { error: currentError } = await client.from("company_team_today").upsert(
      {
        company_id: companyId,
        current_dj_count: 5,
      },
      { onConflict: "company_id" },
    )
    expect(currentError).toBeNull()

    const { data: kept } = await client
      .from("company_team_today")
      .select("current_dj_count, desired_dj_count")
      .eq("company_id", companyId)
      .maybeSingle()
    expect(kept).toEqual({
      current_dj_count: 5,
      desired_dj_count: 12,
    })
  })
})
