import { afterAll, describe, expect, it } from "vitest"

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
import { clearBlueprintAnswers, querySql, querySqlAllowError } from "./sql"

const UPDATED_BY = "00000000-0000-4000-8000-0000000000a2"

afterAll(() => {
  clearBlueprintAnswers(COMPANY_A_ID)
  clearBlueprintAnswers(COMPANY_B_ID)
})

describe("company_blueprint_answers and progress isolation", () => {
  it("lets owner A read and write both tables; others get nothing", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "G1",
      value: null,
      state: "skipped",
      question_version: 1,
    })
    expect(saved.error).toBeNull()

    const progress = await ownerA.from("company_blueprint_progress").upsert({
      company_id: COMPANY_A_ID,
      last_section: "goals",
      last_question_key: "G1",
    })
    expect(progress.error).toBeNull()

    const ownerRows = await ownerA.from("company_blueprint_answers").select("question_key, state")
    expect(ownerRows.data).toEqual([{ question_key: "G1", state: "skipped" }])

    const managerA = await asUser(MANAGER_A_EMAIL)
    expect((await managerA.from("company_blueprint_answers").select("question_key")).data ?? []).toEqual([])
    expect((await managerA.from("company_blueprint_progress").select("last_section")).data ?? []).toEqual([])
    const managerWrite = await managerA.from("company_blueprint_answers").insert({
      company_id: COMPANY_A_ID,
      question_key: "G3",
      value: "no_set_date",
      state: "answered",
      question_version: 1,
    })
    expect(managerWrite.error).not.toBeNull()

    const inactive = await asUser(INACTIVE_A_EMAIL)
    expect((await inactive.from("company_blueprint_answers").select("question_key")).data ?? []).toEqual([])

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_blueprint_answers").select("question_key")).data ?? []).toEqual([])
    const writeA = await ownerB.from("company_blueprint_answers").insert({
      company_id: COMPANY_A_ID,
      question_key: "G3",
      value: "no_set_date",
      state: "answered",
      question_version: 1,
    })
    expect(writeA.error).not.toBeNull()

    const anon = createAnonClient()
    expect((await anon.from("company_blueprint_answers").select("question_key")).data ?? []).toEqual([])
  })

  it("rejects violating rows and locks company_id and question_key", async () => {
    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_answers
          (company_id, question_key, value, state, question_version, updated_by)
        values ('${COMPANY_A_ID}', 'bad', null, 'skipped', 1, '${UPDATED_BY}');
      `).ok,
    ).toBe(false)

    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_answers
          (company_id, question_key, value, state, question_version, updated_by)
        values ('${COMPANY_A_ID}', 'N2', null, 'skipped', 1, '${UPDATED_BY}');
      `).ok,
    ).toBe(false)

    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_answers
          (company_id, question_key, value, state, question_version, updated_by)
        values ('${COMPANY_A_ID}', 'G3', '"x"', 'skipped', 1, '${UPDATED_BY}');
      `).ok,
    ).toBe(false)

    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_answers
          (company_id, question_key, value, state, question_version, updated_by)
        values ('${COMPANY_A_ID}', 'G3', null, 'answered', 1, '${UPDATED_BY}');
      `).ok,
    ).toBe(false)

    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_answers
          (company_id, question_key, value, state, question_version, updated_by)
        values ('${COMPANY_A_ID}', 'G3', '"${"x".repeat(5000)}"', 'answered', 1, '${UPDATED_BY}');
      `).ok,
    ).toBe(false)

    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_progress (company_id, last_section)
        values ('${COMPANY_A_ID}', 'not-a-section');
      `).ok,
    ).toBe(false)

    expect(
      querySqlAllowError(`
        insert into public.company_blueprint_answers
          (company_id, question_key, value, state, question_version, updated_by)
        values ('${COMPANY_A_ID}', 'N2', '80', 'answered', 1, '${UPDATED_BY}');
      `).ok,
    ).toBe(false)

    querySql(`
      insert into public.company_blueprint_progress (company_id, last_section, last_question_key)
      values ('${COMPANY_A_ID}', 'events', 'E1')
      on conflict (company_id) do update set last_section = excluded.last_section, last_question_key = excluded.last_question_key;
    `)
    const eventsProgress = querySql(`
      select last_section, last_question_key from public.company_blueprint_progress
      where company_id = '${COMPANY_A_ID}'
    `)
    expect(eventsProgress).toContain("events")
    expect(eventsProgress).toContain("E1")

    querySql(`
      insert into public.company_blueprint_answers
        (company_id, question_key, value, state, question_version, updated_by)
      values ('${COMPANY_A_ID}', 'G3', '"no_set_date"', 'answered', 1, '${UPDATED_BY}')
      on conflict (company_id, question_key) do update set value = excluded.value, state = excluded.state;
    `)

    expect(
      querySqlAllowError(`
        update public.company_blueprint_answers
        set question_key = 'G1'
        where company_id = '${COMPANY_A_ID}' and question_key = 'G3';
      `).ok,
    ).toBe(false)
  })

  it("sets updated_by from auth.uid() and refuses delete on progress", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "G3",
      value: "within_6_months",
      state: "answered",
      question_version: 1,
      updated_by: "00000000-0000-4000-8000-0000000000b2",
    })
    expect(saved.error).toBeNull()

    const row = querySql(`
      select updated_by::text from public.company_blueprint_answers
      where company_id = '${COMPANY_A_ID}' and question_key = 'G3'
    `)
    expect(row).toContain("00000000-0000-4000-8000-0000000000a2")
    expect(row).not.toContain("00000000-0000-4000-8000-0000000000b2")

    const spoofedUpdate = await ownerA
      .from("company_blueprint_answers")
      .update({ updated_by: "00000000-0000-4000-8000-0000000000b2" })
      .eq("company_id", COMPANY_A_ID)
      .eq("question_key", "G3")
    expect(spoofedUpdate.error).toBeNull()
    const afterUpdate = querySql(`
      select updated_by::text from public.company_blueprint_answers
      where company_id = '${COMPANY_A_ID}' and question_key = 'G3'
    `)
    expect(afterUpdate).toContain("00000000-0000-4000-8000-0000000000a2")
    expect(afterUpdate).not.toContain("00000000-0000-4000-8000-0000000000b2")

    const deleted = await ownerA.from("company_blueprint_answers").delete().eq("question_key", "G1")
    expect(deleted.error).toBeNull()

    const progressDelete = await ownerA.from("company_blueprint_progress").delete().eq("company_id", COMPANY_A_ID)
    expect(progressDelete.error).not.toBeNull()
  })

  it("grants the exact privileges", () => {
    const answers = querySql(`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'company_blueprint_answers'
        and grantee in ('anon', 'authenticated', 'public')
      order by grantee, privilege_type
    `)
    expect(answers).toMatch(/authenticated/i)
    expect(answers).toMatch(/SELECT/i)
    expect(answers).toMatch(/INSERT/i)
    expect(answers).toMatch(/UPDATE/i)
    expect(answers).toMatch(/DELETE/i)
    expect(answers.toLowerCase()).not.toMatch(/anon/)

    const progress = querySql(`
      select privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'company_blueprint_progress'
        and grantee = 'authenticated'
    `)
    expect(progress).toMatch(/SELECT/i)
    expect(progress).toMatch(/INSERT/i)
    expect(progress).toMatch(/UPDATE/i)
    expect(progress).not.toMatch(/DELETE/i)
  })

  it("lets owner A store a services answer and resume on the services section", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "S1",
      value: { codes: ["dj_mc", "other"], other: "Laser shows" },
      state: "answered",
      question_version: 1,
    })
    expect(saved.error).toBeNull()
    const progress = await ownerA.from("company_blueprint_progress").upsert({
      company_id: COMPANY_A_ID,
      last_section: "services",
      last_question_key: "S1",
    })
    expect(progress.error).toBeNull()
    const row = await ownerA.from("company_blueprint_answers").select("question_key, value").eq("question_key", "S1").maybeSingle()
    expect(row.data).toMatchObject({
      question_key: "S1",
      value: { codes: ["dj_mc", "other"], other: "Laser shows" },
    })
  })

  it("lets owner A store a numbers answer, resume on numbers, and still reject N2", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "N1",
      value: { amount: 250000, period: "last_year" },
      state: "answered",
      question_version: 1,
    })
    expect(saved.error).toBeNull()
    const volume = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "E2",
      value: 80,
      state: "answered",
      question_version: 1,
    })
    expect(volume.error).toBeNull()
    const n2 = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "N2",
      value: 80,
      state: "answered",
      question_version: 1,
    })
    expect(n2.error).not.toBeNull()
    const progress = await ownerA.from("company_blueprint_progress").upsert({
      company_id: COMPANY_A_ID,
      last_section: "numbers",
      last_question_key: "N1",
    })
    expect(progress.error).toBeNull()
    const row = await ownerA
      .from("company_blueprint_answers")
      .select("question_key, value")
      .eq("question_key", "N1")
      .maybeSingle()
    expect(row.data).toMatchObject({
      question_key: "N1",
      value: { amount: 250000, period: "last_year" },
    })
  })
})
