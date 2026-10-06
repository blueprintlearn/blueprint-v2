import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import { COMPANY_A_ID, COMPANY_B_ID, createAnonClient, SEED_PASSWORD } from "../rls/helpers"

describe("create_company", () => {
  it("makes the signed-in user owner_admin of only the new company", async () => {
    const email = `owner-${randomUUID()}@blueprint.test`
    const client = createAnonClient()

    const { error: signUpError } = await client.auth.signUp({
      email,
      password: SEED_PASSWORD,
    })
    expect(signUpError).toBeNull()

    const companyName = `Company ${randomUUID()}`
    const { data, error } = await client.rpc("create_company", { p_name: companyName })

    expect(error).toBeNull()
    expect(data?.name).toBe(companyName)

    const { data: visibleCompanies } = await client.from("companies").select("id, name")
    expect(visibleCompanies).toEqual([{ id: data?.id, name: companyName }])

    const { data: memberships } = await client
      .from("company_memberships")
      .select("company_id, role, status")
    expect(memberships).toEqual([
      { company_id: data?.id, role: "owner_admin", status: "active" },
    ])

    const { data: companyA } = await client.from("companies").select("id").eq("id", COMPANY_A_ID)
    const { data: companyB } = await client.from("companies").select("id").eq("id", COMPANY_B_ID)
    expect(companyA ?? []).toEqual([])
    expect(companyB ?? []).toEqual([])
  })

  it("rejects unauthenticated create_company calls", async () => {
    const client = createAnonClient()
    const { error } = await client.rpc("create_company", { p_name: "Unauthenticated Co" })
    expect(error).not.toBeNull()
  })
})
