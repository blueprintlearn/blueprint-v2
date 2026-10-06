import { describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
} from "./helpers"

async function expectOwnerIsolation(
  ownerEmail: string,
  ownCompanyId: string,
  ownCompanyName: string,
  otherCompanyId: string,
) {
  const client = await asUser(ownerEmail)

  const { data: ownCompany, error: ownError } = await client
    .from("companies")
    .select("id, name")
    .eq("id", ownCompanyId)
    .maybeSingle()

  expect(ownError).toBeNull()
  expect(ownCompany).toEqual({ id: ownCompanyId, name: ownCompanyName })

  const { data: ownMemberships, error: membershipError } = await client
    .from("company_memberships")
    .select("company_id, role, status")

  expect(membershipError).toBeNull()
  expect(ownMemberships).toEqual([
    { company_id: ownCompanyId, role: "owner_admin", status: "active" },
  ])

  const { data: otherCompany } = await client
    .from("companies")
    .select("id, name")
    .eq("id", otherCompanyId)

  expect(otherCompany ?? []).toEqual([])

  const { error: companyInsertError } = await client.from("companies").insert({
    name: "Should Not Exist",
  })
  expect(companyInsertError).not.toBeNull()

  const { error: membershipInsertError } = await client.from("company_memberships").insert({
    company_id: otherCompanyId,
    user_id: "00000000-0000-4000-8000-0000000000a2",
    role: "owner_admin",
    status: "active",
  })
  expect(membershipInsertError).not.toBeNull()
}

describe("tenant isolation", () => {
  it("lets Company A owner read A and denies A access to B", async () => {
    await expectOwnerIsolation(OWNER_A_EMAIL, COMPANY_A_ID, "Company A", COMPANY_B_ID)
  })

  it("lets Company B owner read B and denies B access to A", async () => {
    await expectOwnerIsolation(OWNER_B_EMAIL, COMPANY_B_ID, "Company B", COMPANY_A_ID)
  })

  it("does not let Company A change Company B", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    await companyAOwner.from("companies").update({ name: "Hacked" }).eq("id", COMPANY_B_ID)

    const companyBOwner = await asUser(OWNER_B_EMAIL)
    const { data, error } = await companyBOwner
      .from("companies")
      .select("name")
      .eq("id", COMPANY_B_ID)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.name).toBe("Company B")
  })

  it("does not let Company B change Company A", async () => {
    const companyBOwner = await asUser(OWNER_B_EMAIL)
    await companyBOwner.from("companies").update({ name: "Hacked" }).eq("id", COMPANY_A_ID)

    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const { data, error } = await companyAOwner
      .from("companies")
      .select("name")
      .eq("id", COMPANY_A_ID)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.name).toBe("Company A")
  })

  it("denies anonymous reads of companies and memberships", async () => {
    const anon = createAnonClient()

    const companies = await anon.from("companies").select("id")
    const memberships = await anon.from("company_memberships").select("id")

    expect(companies.data ?? []).toEqual([])
    expect(memberships.data ?? []).toEqual([])
    expect(companies.error ?? memberships.error).toBeTruthy()
  })
})
