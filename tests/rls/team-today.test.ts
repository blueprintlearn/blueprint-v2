import { describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
} from "./helpers"

describe("team today isolation", () => {
  it("starts empty and lets Company A owner persist only A's DJ count", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)

    const empty = await companyAOwner
      .from("company_team_today")
      .select("company_id, current_dj_count")
    expect(empty.error).toBeNull()
    expect(empty.data ?? []).toEqual([])

    const inserted = await companyAOwner.from("company_team_today").insert({
      company_id: COMPANY_A_ID,
      current_dj_count: 4,
    })
    expect(inserted.error).toBeNull()

    const reread = await companyAOwner
      .from("company_team_today")
      .select("company_id, current_dj_count")
    expect(reread.error).toBeNull()
    expect(reread.data).toEqual([
      {
        company_id: COMPANY_A_ID,
        current_dj_count: 4,
      },
    ])
  })

  it("does not let Company A read, insert, update, or reassign Company B", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const companyBOwner = await asUser(OWNER_B_EMAIL)

    await companyBOwner.from("company_team_today").upsert(
      {
        company_id: COMPANY_B_ID,
        current_dj_count: 9,
      },
      { onConflict: "company_id" },
    )

    const readB = await companyAOwner
      .from("company_team_today")
      .select("company_id")
      .eq("company_id", COMPANY_B_ID)
    expect(readB.data ?? []).toEqual([])

    const insertB = await companyAOwner.from("company_team_today").insert({
      company_id: COMPANY_B_ID,
      current_dj_count: 12,
    })
    expect(insertB.error).not.toBeNull()

    await companyAOwner
      .from("company_team_today")
      .update({ current_dj_count: 12 })
      .eq("company_id", COMPANY_B_ID)

    const reassign = await companyAOwner
      .from("company_team_today")
      .update({ company_id: COMPANY_B_ID })
      .eq("company_id", COMPANY_A_ID)
    expect(reassign.error).not.toBeNull()

    const stillB = await companyBOwner
      .from("company_team_today")
      .select("company_id, current_dj_count")
      .eq("company_id", COMPANY_B_ID)
      .maybeSingle()
    expect(stillB.error).toBeNull()
    expect(stillB.data).toEqual({ company_id: COMPANY_B_ID, current_dj_count: 9 })
  })

  it("does not let Company B change Company A", async () => {
    const companyBOwner = await asUser(OWNER_B_EMAIL)
    await companyBOwner
      .from("company_team_today")
      .update({ current_dj_count: 1 })
      .eq("company_id", COMPANY_A_ID)

    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const { data, error } = await companyAOwner
      .from("company_team_today")
      .select("current_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.current_dj_count).toBe(4)
  })

  it("rejects out-of-range counts and anonymous reads", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const tooLow = await companyAOwner.from("company_team_today").upsert(
      {
        company_id: COMPANY_A_ID,
        current_dj_count: -1,
      },
      { onConflict: "company_id" },
    )
    expect(tooLow.error).not.toBeNull()

    const tooHigh = await companyAOwner.from("company_team_today").upsert(
      {
        company_id: COMPANY_A_ID,
        current_dj_count: 1000,
      },
      { onConflict: "company_id" },
    )
    expect(tooHigh.error).not.toBeNull()

    const anon = createAnonClient()
    const counts = await anon.from("company_team_today").select("company_id")
    expect(counts.data ?? []).toEqual([])
    expect(counts.error).toBeTruthy()
  })
})
