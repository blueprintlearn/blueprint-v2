import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import { createAnonClient, SEED_PASSWORD } from "../rls/helpers"

describe("team today v2 guided persistence", () => {
  it("lets an owner skip T1 and still save T1b and T2 on a row without a current count", async () => {
    const email = `team-v2-${randomUUID()}@blueprint.test`
    const client = createAnonClient()
    expect((await client.auth.signUp({ email, password: SEED_PASSWORD })).error).toBeNull()
    const { data: company, error: companyError } = await client.rpc("create_company", {
      p_name: `Team V2 ${randomUUID()}`,
    })
    expect(companyError).toBeNull()
    const companyId = company?.id as string

    const saved = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_assistant_only_count: 2,
      p_owner_dj_frequency: "no",
    })
    expect(saved.error).toBeNull()

    const { data } = await client
      .from("company_team_today")
      .select("current_dj_count, assistant_only_count, owner_dj_frequency, count_basis, earlier_dj_count")
      .eq("company_id", companyId)
      .maybeSingle()
    expect(data).toEqual({
      current_dj_count: null,
      assistant_only_count: 2,
      owner_dj_frequency: "no",
      count_basis: "unknown",
      earlier_dj_count: null,
    })
  })

  it("preserves an earlier count through T0 Yes and a later confirmed T1", async () => {
    const email = `team-history-${randomUUID()}@blueprint.test`
    const client = createAnonClient()
    expect((await client.auth.signUp({ email, password: SEED_PASSWORD })).error).toBeNull()
    const { data: company } = await client.rpc("create_company", {
      p_name: `History ${randomUUID()}`,
    })
    const companyId = company?.id as string

    expect(
      (
        await client.from("company_team_today").insert({
          company_id: companyId,
          current_dj_count: 6,
        })
      ).error,
    ).toBeNull()

    const afterLegacy = await client
      .from("company_team_today")
      .select("earlier_dj_count, count_basis, current_dj_count")
      .eq("company_id", companyId)
      .maybeSingle()
    expect(afterLegacy.data).toMatchObject({
      current_dj_count: 6,
      count_basis: "unknown",
      earlier_dj_count: null,
    })

    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_count_basis: "includes_owner",
        })
      ).error,
    ).toBeNull()

    const afterYes = await client
      .from("company_team_today")
      .select("current_dj_count, count_basis, earlier_dj_count")
      .eq("company_id", companyId)
      .maybeSingle()
    expect(afterYes.data).toMatchObject({
      current_dj_count: 6,
      count_basis: "includes_owner",
      earlier_dj_count: null,
    })

    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_current_dj_count: 4,
          p_count_basis: "excludes_owner",
        })
      ).error,
    ).toBeNull()

    const afterT1 = await client
      .from("company_team_today")
      .select("current_dj_count, count_basis, earlier_dj_count")
      .eq("company_id", companyId)
      .maybeSingle()
    expect(afterT1.data).toMatchObject({
      current_dj_count: 4,
      count_basis: "excludes_owner",
      earlier_dj_count: null,
    })
  })
})
