import { describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  createAnonClient,
  INACTIVE_A_EMAIL,
  MANAGER_A_EMAIL,
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

  it("lets an active non-owner read and denies their writes", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const saved = await companyAOwner.from("company_team_today").upsert(
      {
        company_id: COMPANY_A_ID,
        current_dj_count: 6,
      },
      { onConflict: "company_id" },
    )
    expect(saved.error).toBeNull()

    const manager = await asUser(MANAGER_A_EMAIL)
    const visible = await manager
      .from("company_team_today")
      .select("company_id, current_dj_count")
      .eq("company_id", COMPANY_A_ID)
    expect(visible.error).toBeNull()
    expect(visible.data).toEqual([
      {
        company_id: COMPANY_A_ID,
        current_dj_count: 6,
      },
    ])

    const insertOwn = await manager.from("company_team_today").insert({
      company_id: COMPANY_A_ID,
      current_dj_count: 8,
    })
    expect(insertOwn.error).not.toBeNull()

    await manager
      .from("company_team_today")
      .update({ current_dj_count: 8 })
      .eq("company_id", COMPANY_A_ID)

    const insertB = await manager.from("company_team_today").insert({
      company_id: COMPANY_B_ID,
      current_dj_count: 8,
    })
    expect(insertB.error).not.toBeNull()

    const otherCompany = await manager
      .from("company_team_today")
      .select("company_id")
      .eq("company_id", COMPANY_B_ID)
    expect(otherCompany.data ?? []).toEqual([])

    const stillA = await companyAOwner
      .from("company_team_today")
      .select("current_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(stillA.error).toBeNull()
    expect(stillA.data?.current_dj_count).toBe(6)
  })

  it("denies an inactive member read and write", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const saved = await companyAOwner.from("company_team_today").upsert(
      {
        company_id: COMPANY_A_ID,
        current_dj_count: 6,
      },
      { onConflict: "company_id" },
    )
    expect(saved.error).toBeNull()

    const inactive = await asUser(INACTIVE_A_EMAIL)
    const hidden = await inactive
      .from("company_team_today")
      .select("company_id, current_dj_count")
      .eq("company_id", COMPANY_A_ID)
    expect(hidden.data ?? []).toEqual([])

    const insertOwn = await inactive.from("company_team_today").insert({
      company_id: COMPANY_A_ID,
      current_dj_count: 8,
    })
    expect(insertOwn.error).not.toBeNull()

    await inactive
      .from("company_team_today")
      .update({ current_dj_count: 8 })
      .eq("company_id", COMPANY_A_ID)

    const stillA = await companyAOwner
      .from("company_team_today")
      .select("current_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(stillA.error).toBeNull()
    expect(stillA.data?.current_dj_count).toBe(6)
  })

  it("starts desired DJ count unset and lets Company A owner persist 0", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const emptyDesired = await companyAOwner
      .from("company_team_today")
      .select("company_id, desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(emptyDesired.error).toBeNull()
    expect(emptyDesired.data?.desired_dj_count).toBeNull()

    const saved = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 12 })
      .eq("company_id", COMPANY_A_ID)
    expect(saved.error).toBeNull()

    const twelve = await companyAOwner
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(twelve.error).toBeNull()
    expect(twelve.data?.desired_dj_count).toBe(12)

    const zero = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 0 })
      .eq("company_id", COMPANY_A_ID)
    expect(zero.error).toBeNull()

    const rereadZero = await companyAOwner
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(rereadZero.error).toBeNull()
    expect(rereadZero.data?.desired_dj_count).toBe(0)
  })

  it("does not let Company A read or update Company B desired DJ count", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const companyBOwner = await asUser(OWNER_B_EMAIL)

    const savedB = await companyBOwner
      .from("company_team_today")
      .update({ desired_dj_count: 9 })
      .eq("company_id", COMPANY_B_ID)
    expect(savedB.error).toBeNull()

    const readB = await companyAOwner
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", COMPANY_B_ID)
    expect(readB.data ?? []).toEqual([])

    await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 21 })
      .eq("company_id", COMPANY_B_ID)

    const stillB = await companyBOwner
      .from("company_team_today")
      .select("company_id, desired_dj_count")
      .eq("company_id", COMPANY_B_ID)
      .maybeSingle()
    expect(stillB.error).toBeNull()
    expect(stillB.data).toEqual({ company_id: COMPANY_B_ID, desired_dj_count: 9 })
  })

  it("does not let Company B change Company A desired DJ count", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const savedA = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 14 })
      .eq("company_id", COMPANY_A_ID)
    expect(savedA.error).toBeNull()

    const companyBOwner = await asUser(OWNER_B_EMAIL)
    await companyBOwner
      .from("company_team_today")
      .update({ desired_dj_count: 1 })
      .eq("company_id", COMPANY_A_ID)

    const { data, error } = await companyAOwner
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.desired_dj_count).toBe(14)
  })

  it("rejects out-of-range desired DJ counts", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const tooLow = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: -1 })
      .eq("company_id", COMPANY_A_ID)
    expect(tooLow.error).not.toBeNull()

    const tooHigh = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 1000 })
      .eq("company_id", COMPANY_A_ID)
    expect(tooHigh.error).not.toBeNull()
  })

  it("lets an active non-owner read desired DJ count and denies their writes", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const saved = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 6 })
      .eq("company_id", COMPANY_A_ID)
    expect(saved.error).toBeNull()

    const manager = await asUser(MANAGER_A_EMAIL)
    const visible = await manager
      .from("company_team_today")
      .select("company_id, desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
    expect(visible.error).toBeNull()
    expect(visible.data).toEqual([
      {
        company_id: COMPANY_A_ID,
        desired_dj_count: 6,
      },
    ])

    await manager
      .from("company_team_today")
      .update({ desired_dj_count: 8 })
      .eq("company_id", COMPANY_A_ID)

    const stillA = await companyAOwner
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(stillA.error).toBeNull()
    expect(stillA.data?.desired_dj_count).toBe(6)
  })

  it("denies an inactive member desired DJ count read and write", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const saved = await companyAOwner
      .from("company_team_today")
      .update({ desired_dj_count: 6 })
      .eq("company_id", COMPANY_A_ID)
    expect(saved.error).toBeNull()

    const inactive = await asUser(INACTIVE_A_EMAIL)
    const hidden = await inactive
      .from("company_team_today")
      .select("company_id, desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
    expect(hidden.data ?? []).toEqual([])

    await inactive
      .from("company_team_today")
      .update({ desired_dj_count: 8 })
      .eq("company_id", COMPANY_A_ID)

    const stillA = await companyAOwner
      .from("company_team_today")
      .select("desired_dj_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(stillA.error).toBeNull()
    expect(stillA.data?.desired_dj_count).toBe(6)
  })

  it("starts trainer count unset and lets Company A owner persist 0", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const emptyTrainers = await companyAOwner
      .from("company_team_today")
      .select("company_id, current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(emptyTrainers.error).toBeNull()
    expect(emptyTrainers.data?.current_trainer_count).toBeNull()

    const saved = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 3 })
      .eq("company_id", COMPANY_A_ID)
    expect(saved.error).toBeNull()

    const three = await companyAOwner
      .from("company_team_today")
      .select("current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(three.error).toBeNull()
    expect(three.data?.current_trainer_count).toBe(3)

    const zero = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 0 })
      .eq("company_id", COMPANY_A_ID)
    expect(zero.error).toBeNull()

    const rereadZero = await companyAOwner
      .from("company_team_today")
      .select("current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(rereadZero.error).toBeNull()
    expect(rereadZero.data?.current_trainer_count).toBe(0)
  })

  it("does not let Company A read or update Company B trainer count", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const companyBOwner = await asUser(OWNER_B_EMAIL)

    const savedB = await companyBOwner
      .from("company_team_today")
      .update({ current_trainer_count: 9 })
      .eq("company_id", COMPANY_B_ID)
    expect(savedB.error).toBeNull()

    const readB = await companyAOwner
      .from("company_team_today")
      .select("current_trainer_count")
      .eq("company_id", COMPANY_B_ID)
    expect(readB.data ?? []).toEqual([])

    await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 21 })
      .eq("company_id", COMPANY_B_ID)

    const stillB = await companyBOwner
      .from("company_team_today")
      .select("company_id, current_trainer_count")
      .eq("company_id", COMPANY_B_ID)
      .maybeSingle()
    expect(stillB.error).toBeNull()
    expect(stillB.data).toEqual({ company_id: COMPANY_B_ID, current_trainer_count: 9 })
  })

  it("does not let Company B change Company A trainer count", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const savedA = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 4 })
      .eq("company_id", COMPANY_A_ID)
    expect(savedA.error).toBeNull()

    const companyBOwner = await asUser(OWNER_B_EMAIL)
    await companyBOwner
      .from("company_team_today")
      .update({ current_trainer_count: 1 })
      .eq("company_id", COMPANY_A_ID)

    const { data, error } = await companyAOwner
      .from("company_team_today")
      .select("current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.current_trainer_count).toBe(4)
  })

  it("rejects out-of-range trainer counts", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const tooLow = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: -1 })
      .eq("company_id", COMPANY_A_ID)
    expect(tooLow.error).not.toBeNull()

    const tooHigh = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 1000 })
      .eq("company_id", COMPANY_A_ID)
    expect(tooHigh.error).not.toBeNull()
  })

  it("lets an active non-owner read trainer count and denies their writes", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const saved = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 6 })
      .eq("company_id", COMPANY_A_ID)
    expect(saved.error).toBeNull()

    const manager = await asUser(MANAGER_A_EMAIL)
    const visible = await manager
      .from("company_team_today")
      .select("company_id, current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
    expect(visible.error).toBeNull()
    expect(visible.data).toEqual([
      {
        company_id: COMPANY_A_ID,
        current_trainer_count: 6,
      },
    ])

    await manager
      .from("company_team_today")
      .update({ current_trainer_count: 8 })
      .eq("company_id", COMPANY_A_ID)

    const stillA = await companyAOwner
      .from("company_team_today")
      .select("current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(stillA.error).toBeNull()
    expect(stillA.data?.current_trainer_count).toBe(6)
  })

  it("denies an inactive member trainer count read and write", async () => {
    const companyAOwner = await asUser(OWNER_A_EMAIL)
    const saved = await companyAOwner
      .from("company_team_today")
      .update({ current_trainer_count: 6 })
      .eq("company_id", COMPANY_A_ID)
    expect(saved.error).toBeNull()

    const inactive = await asUser(INACTIVE_A_EMAIL)
    const hidden = await inactive
      .from("company_team_today")
      .select("company_id, current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
    expect(hidden.data ?? []).toEqual([])

    await inactive
      .from("company_team_today")
      .update({ current_trainer_count: 8 })
      .eq("company_id", COMPANY_A_ID)

    const stillA = await companyAOwner
      .from("company_team_today")
      .select("current_trainer_count")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(stillA.error).toBeNull()
    expect(stillA.data?.current_trainer_count).toBe(6)
  })
})
