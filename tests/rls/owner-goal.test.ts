import { describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
} from "./helpers"

describe("owner goal isolation", () => {
  it("starts empty and lets Company A owner persist only A's goal", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)

    const empty = await companyAOwner.from("company_blueprints").select("company_id, owner_goal")
    expect(empty.error).toBeNull()
    expect(empty.data ?? []).toEqual([])

    const inserted = await companyAOwner.from("company_blueprints").insert({
      company_id: COMPANY_A_ID,
      owner_goal: "stop_djing",
      owner_goal_other: null,
    })
    expect(inserted.error).toBeNull()

    const reread = await companyAOwner
      .from("company_blueprints")
      .select("company_id, owner_goal, owner_goal_other")
    expect(reread.error).toBeNull()
    expect(reread.data).toEqual([
      {
        company_id: COMPANY_A_ID,
        owner_goal: "stop_djing",
        owner_goal_other: null,
      },
    ])
  })

  it("does not let Company A read, insert, update, or reassign Company B", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const companyBOwner = await asUser(OWNER_B_EMAIL)

    await companyBOwner.from("company_blueprints").upsert(
      {
        company_id: COMPANY_B_ID,
        owner_goal: "scale",
        owner_goal_other: null,
      },
      { onConflict: "company_id" },
    )

    const readB = await companyAOwner
      .from("company_blueprints")
      .select("company_id")
      .eq("company_id", COMPANY_B_ID)
    expect(readB.data ?? []).toEqual([])

    const insertB = await companyAOwner.from("company_blueprints").insert({
      company_id: COMPANY_B_ID,
      owner_goal: "expand",
      owner_goal_other: null,
    })
    expect(insertB.error).not.toBeNull()

    await companyAOwner
      .from("company_blueprints")
      .update({ owner_goal: "expand" })
      .eq("company_id", COMPANY_B_ID)

    const reassign = await companyAOwner
      .from("company_blueprints")
      .update({ company_id: COMPANY_B_ID })
      .eq("company_id", COMPANY_A_ID)
    expect(reassign.error).not.toBeNull()

    const stillB = await companyBOwner
      .from("company_blueprints")
      .select("company_id, owner_goal")
      .eq("company_id", COMPANY_B_ID)
      .maybeSingle()
    expect(stillB.error).toBeNull()
    expect(stillB.data).toEqual({ company_id: COMPANY_B_ID, owner_goal: "scale" })
  })

  it("does not let Company B change Company A", async () => {
    const companyBOwner = await asUser(OWNER_B_EMAIL)
    await companyBOwner
      .from("company_blueprints")
      .update({ owner_goal: "dj_less" })
      .eq("company_id", COMPANY_A_ID)

    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const { data, error } = await companyAOwner
      .from("company_blueprints")
      .select("owner_goal")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.owner_goal).toBe("stop_djing")
  })

  it("rejects invalid other text and anonymous reads", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const missingOther = await companyAOwner.from("company_blueprints").upsert(
      {
        company_id: COMPANY_A_ID,
        owner_goal: "other",
        owner_goal_other: null,
      },
      { onConflict: "company_id" },
    )
    expect(missingOther.error).not.toBeNull()

    const tooLong = await companyAOwner.from("company_blueprints").upsert(
      {
        company_id: COMPANY_A_ID,
        owner_goal: "other",
        owner_goal_other: "x".repeat(81),
      },
      { onConflict: "company_id" },
    )
    expect(tooLong.error).not.toBeNull()

    const anon = createAnonClient()
    const companies = await anon.from("company_blueprints").select("company_id")
    expect(companies.data ?? []).toEqual([])
    expect(companies.error).toBeTruthy()
  })
})
