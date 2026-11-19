import { afterAll, describe, expect, it } from "vitest"

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

afterAll(() => {
  querySql(`delete from public.company_growth_planning where company_id in ('${COMPANY_A_ID}', '${COMPANY_B_ID}');`)
})

describe("company_growth_planning isolation", () => {
  it("lets owner A read and write; others get nothing", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_growth_planning").upsert({
      company_id: COMPANY_A_ID,
      inputs: { typicalLeadCapacity: { value: 40, state: "answered" } },
      recommendation_response: null,
    })
    expect(saved.error).toBeNull()

    const rows = await ownerA.from("company_growth_planning").select("company_id")
    expect(rows.data).toEqual([{ company_id: COMPANY_A_ID }])

    const managerA = await asUser(MANAGER_A_EMAIL)
    expect((await managerA.from("company_growth_planning").select("company_id")).data ?? []).toEqual([])
    const managerWrite = await managerA.from("company_growth_planning").insert({
      company_id: COMPANY_A_ID,
      inputs: {},
    })
    expect(managerWrite.error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_growth_planning").select("company_id")).data ?? []).toEqual([])
    const writeA = await ownerB.from("company_growth_planning").insert({
      company_id: COMPANY_A_ID,
      inputs: {},
    })
    expect(writeA.error).not.toBeNull()

    const anon = createAnonClient()
    expect((await anon.from("company_growth_planning").select("company_id")).data ?? []).toEqual([])
  })
})
