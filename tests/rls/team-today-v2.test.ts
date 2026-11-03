import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  createAnonClient,
  MANAGER_A_EMAIL,
  OWNER_B_EMAIL,
  SEED_PASSWORD,
} from "./helpers"

async function newOwner() {
  const email = `team-v2-${randomUUID()}@blueprint.test`
  const client = createAnonClient()
  expect((await client.auth.signUp({ email, password: SEED_PASSWORD })).error).toBeNull()
  const { data: company, error } = await client.rpc("create_company", {
    p_name: `Team V2 ${email}`,
  })
  expect(error).toBeNull()
  return { client, companyId: company?.id as string }
}

async function readTeam(client: Awaited<ReturnType<typeof newOwner>>["client"], companyId: string) {
  const { data, error } = await client
    .from("company_team_today")
    .select(
      "company_id, current_dj_count, desired_dj_count, count_basis, desired_count_basis, count_confirmed_at, desired_confirmed_at, assistant_only_count, owner_dj_frequency, lead_capable_count, earlier_dj_count, earlier_desired_dj_count",
    )
    .eq("company_id", companyId)
    .maybeSingle()
  expect(error).toBeNull()
  return data
}

describe("team today v2 security", () => {
  it("lets the owner confirm through save_team_today_v2 and keeps historical counts", async () => {
    const { client, companyId } = await newOwner()
    const seed = await client.from("company_team_today").upsert(
      { company_id: companyId, current_dj_count: 6, desired_dj_count: 8 },
      { onConflict: "company_id" },
    )
    expect(seed.error).toBeNull()

    const before = await readTeam(client, companyId)
    expect(before?.count_basis).toBe("unknown")
    const earlier = before?.earlier_dj_count ?? null

    const t0Yes = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_count_basis: "includes_owner",
    })
    expect(t0Yes.error).toBeNull()

    const afterYes = await readTeam(client, companyId)
    expect(afterYes).toMatchObject({
      current_dj_count: 6,
      count_basis: "includes_owner",
      earlier_dj_count: earlier,
    })
    expect(afterYes?.count_confirmed_at).toBeTruthy()

    const t1 = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_current_dj_count: 4,
      p_count_basis: "excludes_owner",
      p_assistant_only_count: 1,
      p_owner_dj_frequency: "sometimes",
      p_lead_capable_count: 2,
    })
    expect(t1.error).toBeNull()

    const afterT1 = await readTeam(client, companyId)
    expect(afterT1).toMatchObject({
      current_dj_count: 4,
      count_basis: "excludes_owner",
      assistant_only_count: 1,
      owner_dj_frequency: "sometimes",
      lead_capable_count: 2,
      earlier_dj_count: earlier,
    })
  })

  it("lets T6 save on its own and keeps a null current count", async () => {
    const { client, companyId } = await newOwner()
    const saved = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_desired_dj_count: 9,
      p_desired_count_basis: "excludes_owner",
    })
    expect(saved.error).toBeNull()

    expect(await readTeam(client, companyId)).toMatchObject({
      current_dj_count: null,
      desired_dj_count: 9,
      desired_count_basis: "excludes_owner",
      count_basis: "unknown",
      earlier_dj_count: null,
    })
  })

  it("resets the matching basis when a legacy upsert changes a count", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_current_dj_count: 4,
          p_count_basis: "excludes_owner",
          p_desired_dj_count: 7,
          p_desired_count_basis: "excludes_owner",
        })
      ).error,
    ).toBeNull()

    const before = await readTeam(client, companyId)
    const legacy = await client.from("company_team_today").upsert(
      { company_id: companyId, current_dj_count: 5 },
      { onConflict: "company_id" },
    )
    expect(legacy.error).toBeNull()

    const row = await readTeam(client, companyId)
    expect(row).toMatchObject({
      current_dj_count: 5,
      count_basis: "unknown",
      count_confirmed_at: null,
      desired_dj_count: 7,
      desired_count_basis: "excludes_owner",
      earlier_dj_count: before?.earlier_dj_count ?? null,
    })
  })

  it("blocks authenticated direct writes to basis, timestamps, v2 fields and history", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_current_dj_count: 4,
          p_count_basis: "excludes_owner",
        })
      ).error,
    ).toBeNull()

    const denied = await Promise.all([
      client.from("company_team_today").update({ count_basis: "excludes_owner" }).eq("company_id", companyId),
      client.from("company_team_today").update({ count_confirmed_at: new Date().toISOString() }).eq("company_id", companyId),
      client.from("company_team_today").update({ assistant_only_count: 3 }).eq("company_id", companyId),
      client.from("company_team_today").update({ owner_dj_frequency: "regularly" }).eq("company_id", companyId),
      client.from("company_team_today").update({ lead_capable_count: 1 }).eq("company_id", companyId),
      client.from("company_team_today").update({ earlier_dj_count: 999 }).eq("company_id", companyId),
    ])
    for (const result of denied) {
      expect(result.error).not.toBeNull()
    }

    const still = await readTeam(client, companyId)
    expect(still?.earlier_dj_count).not.toBe(999)
    expect(still?.assistant_only_count).not.toBe(3)
    expect(still?.current_dj_count).toBe(4)
  })

  it("refuses a manager and a cross-company owner on save_team_today_v2", async () => {
    const manager = await asUser(MANAGER_A_EMAIL)
    const asManager = await manager.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_current_dj_count: 1,
      p_count_basis: "excludes_owner",
    })
    expect(asManager.error).not.toBeNull()
    expect(asManager.error?.code).toBe("PBG07")

    const ownerB = await asUser(OWNER_B_EMAIL)
    const cross = await ownerB.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_current_dj_count: 1,
      p_count_basis: "excludes_owner",
    })
    expect(cross.error).not.toBeNull()
    expect(cross.error?.code).toBe("PBG07")

    const managerRead = await manager
      .from("company_team_today")
      .select("company_id")
      .eq("company_id", COMPANY_A_ID)
    expect(managerRead.error).toBeNull()
  })

  it("rejects lead_capable_count above current_dj_count", async () => {
    const { client, companyId } = await newOwner()
    const result = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_current_dj_count: 2,
      p_lead_capable_count: 5,
      p_count_basis: "excludes_owner",
    })
    expect(result.error).not.toBeNull()
  })

  it("does not let set_config authorize a confirm write", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.from("company_team_today").insert({
          company_id: companyId,
          current_dj_count: 3,
        })
      ).error,
    ).toBeNull()
    const denied = await client
      .from("company_team_today")
      .update({ count_basis: "excludes_owner" })
      .eq("company_id", companyId)
    expect(denied.error).not.toBeNull()
    expect((await readTeam(client, companyId))?.count_basis).toBe("unknown")
  })

  it("keeps anonymous clients out", async () => {
    const anon = createAnonClient()
    const read = await anon.from("company_team_today").select("company_id")
    expect(read.data ?? []).toEqual([])
    const write = await anon.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_current_dj_count: 1,
      p_count_basis: "excludes_owner",
    })
    expect(write.error).not.toBeNull()
  })
})
