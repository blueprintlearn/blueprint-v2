import { randomUUID } from "node:crypto"

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
import {
  clearBlueprintAnswers,
  querySql,
  querySqlAllowError,
  querySqlAsync,
  querySqlJsonOn,
} from "./sql"

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

  it("lets owner A store a development answer and resume on the development section", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "D1",
      value: "not_yet",
      state: "answered",
      question_version: 1,
    })
    expect(saved.error).toBeNull()
    const progress = await ownerA.from("company_blueprint_progress").upsert({
      company_id: COMPANY_A_ID,
      last_section: "development",
      last_question_key: "D1",
    })
    expect(progress.error).toBeNull()
    const row = await ownerA
      .from("company_blueprint_answers")
      .select("question_key, value")
      .eq("question_key", "D1")
      .maybeSingle()
    expect(row.data).toMatchObject({
      question_key: "D1",
      value: "not_yet",
    })
  })

  it("lets owner A store an ideal DJ answer and resume on the ideal DJ section", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "I1",
      value: "none",
      state: "answered",
      question_version: 1,
    })
    expect(saved.error).toBeNull()
    const progress = await ownerA.from("company_blueprint_progress").upsert({
      company_id: COMPANY_A_ID,
      last_section: "ideal-dj",
      last_question_key: "I1",
    })
    expect(progress.error).toBeNull()
    const row = await ownerA
      .from("company_blueprint_answers")
      .select("question_key, value")
      .eq("question_key", "I1")
      .maybeSingle()
    expect(row.data).toMatchObject({
      question_key: "I1",
      value: "none",
    })
  })

  it("lets owner A store a review approval and resume on the review section", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.from("company_blueprint_answers").upsert({
      company_id: COMPANY_A_ID,
      question_key: "R1",
      value: {
        code: "approved",
        fingerprint: "fixture",
        revision: 1,
        currentRevision: 1,
        approvedBy: UPDATED_BY,
        approvedAt: "2026-01-15T12:00:00.000Z",
      },
      state: "answered",
      question_version: 1,
    })
    expect(saved.error).toBeNull()
    const progress = await ownerA.from("company_blueprint_progress").upsert({
      company_id: COMPANY_A_ID,
      last_section: "review",
      last_question_key: "R1",
    })
    expect(progress.error).toBeNull()
    const row = await ownerA
      .from("company_blueprint_answers")
      .select("question_key, value, updated_by")
      .eq("question_key", "R1")
      .maybeSingle()
    expect(row.data).toMatchObject({
      question_key: "R1",
      updated_by: UPDATED_BY,
      value: expect.objectContaining({
        code: "approved",
        approvedBy: UPDATED_BY,
      }),
    })
  })

  it("does not let a manager, Company B owner, or anonymous client write a Company A approval", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const forged = {
      company_id: COMPANY_A_ID,
      question_key: "R1",
      value: {
        code: "approved",
        fingerprint: "forged",
        revision: 1,
        currentRevision: 1,
        approvedBy: "00000000-0000-4000-8000-0000000000b2",
        approvedAt: "1999-01-01T00:00:00.000Z",
      },
      state: "answered" as const,
      question_version: 1,
    }

    const managerA = await asUser(MANAGER_A_EMAIL)
    expect((await managerA.from("company_blueprint_answers").insert(forged)).error).not.toBeNull()

    const ownerB = await asUser(OWNER_B_EMAIL)
    expect((await ownerB.from("company_blueprint_answers").insert(forged)).error).not.toBeNull()

    const anon = createAnonClient()
    expect((await anon.from("company_blueprint_answers").insert(forged)).error).not.toBeNull()

    const ownerA = await asUser(OWNER_A_EMAIL)
    expect((await ownerA.from("company_blueprint_answers").select("question_key").eq("question_key", "R1")).data ?? []).toEqual(
      [],
    )
  })

  it("bumps the stored approval when the owner writes a later answer", async () => {
    clearBlueprintAnswers(COMPANY_A_ID)
    const ownerA = await asUser(OWNER_A_EMAIL)
    expect(
      (
        await ownerA.from("company_blueprint_answers").upsert({
          company_id: COMPANY_A_ID,
          question_key: "R1",
          value: {
            code: "approved",
            fingerprint: "fixture",
            revision: 1,
            currentRevision: 1,
            approvedBy: UPDATED_BY,
            approvedAt: "2026-01-15T12:00:00.000Z",
          },
          state: "answered",
          question_version: 1,
        })
      ).error,
    ).toBeNull()

    expect(
      (
        await ownerA.from("company_blueprint_answers").upsert({
          company_id: COMPANY_A_ID,
          question_key: "E2",
          value: 80,
          state: "answered",
          question_version: 1,
        })
      ).error,
    ).toBeNull()

    const row = await ownerA
      .from("company_blueprint_answers")
      .select("value")
      .eq("question_key", "R1")
      .maybeSingle()
    expect(row.data?.value).toMatchObject({
      code: "approved",
      fingerprint: "fixture",
      revision: 1,
      currentRevision: 2,
    })
  })
})

describe("durable approval invalidation", () => {
  const companies: string[] = []

  afterAll(() => {
    while (companies.length > 0) {
      const companyId = companies.pop() as string
      querySql(`delete from public.companies where id = '${companyId}';`)
    }
  })

  function isolatedCompany() {
    const companyId = randomUUID()
    companies.push(companyId)
    querySql(`insert into public.companies (id, name) values ('${companyId}', 'Approval ${companyId}');`)
    return companyId
  }

  function insertApproved(companyId: string) {
    querySql(`
      insert into public.company_blueprint_answers
        (company_id, question_key, value, state, question_version, updated_by)
      values (
        '${companyId}',
        'R1',
        jsonb_build_object(
          'code', 'approved',
          'fingerprint', 'fixture',
          'revision', 1,
          'currentRevision', 1,
          'approvedBy', '${UPDATED_BY}',
          'approvedAt', '2026-01-15T12:00:00.000Z'
        ),
        'answered',
        1,
        '${UPDATED_BY}'
      );
    `)
  }

  function insertAnswer(companyId: string, questionKey: string, value: string) {
    return `
      insert into public.company_blueprint_answers
        (company_id, question_key, value, state, question_version, updated_by)
      values ('${companyId}', '${questionKey}', '${value}'::jsonb, 'answered', 1, '${UPDATED_BY}');
    `
  }

  function revision(companyId: string) {
    return querySqlJsonOn<number>(
      "postgres",
      `
        select to_json((value->>'currentRevision')::int)
        from public.company_blueprint_answers
        where company_id = '${companyId}' and question_key = 'R1'
      `,
    )
  }

  it("does not bump revision when the approval row itself is written", () => {
    const companyId = isolatedCompany()
    insertApproved(companyId)
    expect(revision(companyId)).toBe(1)
    querySql(`
      update public.company_blueprint_answers
      set value = value || '{"fingerprint":"same-answers"}'::jsonb
      where company_id = '${companyId}' and question_key = 'R1';
    `)
    expect(revision(companyId)).toBe(1)
  })

  it("keeps the approval invalid after restoring the earlier answer", () => {
    const companyId = isolatedCompany()
    querySql(insertAnswer(companyId, "E2", "80"))
    insertApproved(companyId)
    querySql(`
      update public.company_blueprint_answers
      set value = '90'::jsonb
      where company_id = '${companyId}' and question_key = 'E2';
    `)
    expect(revision(companyId)).toBe(2)
    querySql(`
      update public.company_blueprint_answers
      set value = '80'::jsonb
      where company_id = '${companyId}' and question_key = 'E2';
    `)
    expect(revision(companyId)).toBe(3)
  })

  it("rolls back the intake write when approval invalidation fails", () => {
    const companyId = isolatedCompany()
    insertApproved(companyId)
    const constraint = `approval_rev_freeze_${companyId.replaceAll("-", "")}`
    querySql(`
      alter table public.company_blueprint_answers
      add constraint ${constraint}
      check (
        company_id <> '${companyId}'::uuid
        or question_key <> 'R1'
        or coalesce((value->>'currentRevision')::int, 0) <= 1
      );
    `)
    try {
      const write = querySqlAllowError(insertAnswer(companyId, "E2", "90"))
      expect(write.ok).toBe(false)
      expect(revision(companyId)).toBe(1)
      expect(
        querySqlJsonOn<number>(
          "postgres",
          `
            select to_json(count(*)::int)
            from public.company_blueprint_answers
            where company_id = '${companyId}' and question_key = 'E2'
          `,
        ),
      ).toBe(0)
    } finally {
      querySql(`alter table public.company_blueprint_answers drop constraint if exists ${constraint};`)
    }
  })

  it("serializes concurrent intake writes so both bump the approval", async () => {
    const companyId = isolatedCompany()
    insertApproved(companyId)
    const results = await Promise.allSettled([
      querySqlAsync(insertAnswer(companyId, "E1", '{"codes":["wedding"]}')),
      querySqlAsync(insertAnswer(companyId, "E2", "90")),
    ])
    const succeeded = results.filter((result) => result.status === "fulfilled").length
    expect(succeeded).toBe(2)
    expect(revision(companyId)).toBe(1 + succeeded)
  })

  it("invalidates approval when goals or team today change", () => {
    const companyId = isolatedCompany()
    insertApproved(companyId)
    querySql(`
      insert into public.company_goals (company_id, goal, is_primary)
      values ('${companyId}', 'scale', true);
    `)
    expect(revision(companyId)).toBe(2)
    querySql(`
      insert into public.company_team_today (company_id, current_dj_count)
      values ('${companyId}', 2);
    `)
    expect(revision(companyId)).toBe(3)
  })
})
