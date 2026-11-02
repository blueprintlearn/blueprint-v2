import { afterAll, describe, expect, it } from "vitest"

import { getBlueprintProgressFromStates, resolveAll } from "@/lib/blueprint/answers"

import {
  asUser,
  COMPANY_A_ID,
  COMPANY_B_ID,
  MANAGER_A_EMAIL,
  OWNER_A_EMAIL,
  OWNER_B_EMAIL,
} from "../rls/helpers"
import { clearBlueprintAnswers, clearCompanyGoalData } from "../rls/sql"

afterAll(() => {
  clearBlueprintAnswers(COMPANY_A_ID)
  clearCompanyGoalData(COMPANY_A_ID)
})

describe("skip and save answer flows", () => {
  it("lets owner A skip G1 without writing goals, then complete after a later save", async () => {
    clearCompanyGoalData(COMPANY_A_ID)
    clearBlueprintAnswers(COMPANY_A_ID)

    const ownerA = await asUser(OWNER_A_EMAIL)
    const skipped = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "G1",
      value: null,
      state: "skipped",
      question_version: 1,
    })
    expect(skipped.error).toBeNull()

    const goals = await ownerA.from("company_goals").select("goal").eq("company_id", COMPANY_A_ID)
    expect(goals.data ?? []).toEqual([])
    const blueprints = await ownerA.from("company_blueprints").select("company_id").eq("company_id", COMPANY_A_ID)
    expect(blueprints.data ?? []).toEqual([])

    const afterSkip = getBlueprintProgressFromStates(
      resolveAll({
        goals: null,
        teamToday: null,
        answers: [{ questionKey: "G1", state: "skipped", value: null }],
      }),
      null,
    )
    expect(afterSkip.statuses.goals).toBe("needs_attention")
    expect(afterSkip.completeCount).toBe(0)

    const saved = await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["scale"],
      p_primary: "scale",
      p_other_text: "",
    })
    expect(saved.error).toBeNull()

    await ownerA.from("company_blueprint_answers").delete().eq("company_id", COMPANY_A_ID).eq("question_key", "G1")

    const afterSave = getBlueprintProgressFromStates(
      resolveAll({
        goals: { primary: { goal: "scale" }, others: [] },
        teamToday: null,
        answers: [],
      }),
      null,
    )
    expect(afterSave.statuses.goals).toBe("complete")
  })

  it("saves G3 and rejects a bad code at the database", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "G3",
      value: "1_to_2_years",
      state: "answered",
      question_version: 1,
    })
    expect(saved.error).toBeNull()

    const updated = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "G3",
      value: "no_set_date",
      state: "answered",
      question_version: 1,
    })
    expect(updated.error).toBeNull()
  })

  it("refuses skip writes for manager A and owner B", async () => {
    const managerA = await asUser(MANAGER_A_EMAIL)
    const managerWrite = await managerA.from("company_blueprint_answers").insert({
      company_id: COMPANY_A_ID,
      question_key: "G1",
      value: null,
      state: "skipped",
      question_version: 1,
    })
    expect(managerWrite.error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    const otherCompany = await ownerB.from("company_blueprint_answers").insert({
      company_id: COMPANY_A_ID,
      question_key: "G1",
      value: null,
      state: "skipped",
      question_version: 1,
    })
    expect(otherCompany.error).not.toBeNull()
    expect(COMPANY_B_ID).toBeTruthy()
  })
})
