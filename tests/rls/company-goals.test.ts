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
  ASSERT_NOT_ONE_PRIMARY,
  ASSERT_PRIMARY_MISMATCH,
  clearCompanyGoalData,
  querySql,
  querySqlAllowError,
} from "./sql"

function byGoal<T extends { goal: string }>(rows: T[] | null) {
  return [...(rows ?? [])].sort((left, right) => left.goal.localeCompare(right.goal))
}

afterAll(() => {
  clearCompanyGoalData(COMPANY_A_ID)
  clearCompanyGoalData(COMPANY_B_ID)
})

describe("company_goals isolation and grants", () => {
  it("lets owner A save a set and read every row; manager A reads only the primary", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["scale", "expand"],
      p_primary: "scale",
      p_other_text: "",
    })
    expect(saved.error).toBeNull()

    const ownerRows = await ownerA
      .from("company_goals")
      .select("goal, is_primary")
      .eq("company_id", COMPANY_A_ID)
      .order("goal")
    expect(ownerRows.error).toBeNull()
    expect(byGoal(ownerRows.data)).toEqual([
      { goal: "expand", is_primary: false },
      { goal: "scale", is_primary: true },
    ])

    const managerA = await asUser(MANAGER_A_EMAIL)
    const managerRows = await managerA.from("company_goals").select("goal, is_primary").eq("company_id", COMPANY_A_ID)
    expect(managerRows.error).toBeNull()
    expect(managerRows.data).toEqual([{ goal: "scale", is_primary: true }])

    const managerWrite = await managerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["expand"],
      p_primary: "expand",
      p_other_text: "",
    })
    expect(managerWrite.error).not.toBeNull()
    expect(managerWrite.error?.code).toBe("PBG07")
  })

  it("hides Company A from Company B, inactive-A and anon", async () => {
    const ownerB = await asUser(OWNER_B_EMAIL)
    const readA = await ownerB.from("company_goals").select("goal").eq("company_id", COMPANY_A_ID)
    expect(readA.data ?? []).toEqual([])

    const writeA = await ownerB.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["scale"],
      p_primary: "scale",
      p_other_text: "",
    })
    expect(writeA.error).not.toBeNull()

    const inactive = await asUser(INACTIVE_A_EMAIL)
    const inactiveRead = await inactive.from("company_goals").select("goal")
    expect(inactiveRead.data ?? []).toEqual([])

    const anon = createAnonClient()
    const anonRead = await anon.from("company_goals").select("goal")
    expect(anonRead.data ?? []).toEqual([])
    expect(anonRead.error).toBeTruthy()
  })

  it("refuses direct DML for every app role and leaves authenticated with select only", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const insert = await ownerA.from("company_goals").insert({
      company_id: COMPANY_A_ID,
      goal: "improve_quality",
      other_text: null,
      is_primary: false,
    })
    const update = await ownerA.from("company_goals").update({ is_primary: false }).eq("company_id", COMPANY_A_ID)
    const del = await ownerA.from("company_goals").delete().eq("company_id", COMPANY_A_ID)
    expect(insert.error).not.toBeNull()
    expect(update.error).not.toBeNull()
    expect(del.error).not.toBeNull()

    const grants = querySql(`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'company_goals'
        and grantee in ('anon', 'authenticated', 'public')
      order by grantee, privilege_type
    `)
    expect(grants).toMatch(/authenticated/i)
    expect(grants).toMatch(/SELECT/i)
    expect(grants).not.toMatch(/INSERT/i)
    expect(grants).not.toMatch(/UPDATE/i)
    expect(grants).not.toMatch(/DELETE/i)
    expect(grants.toLowerCase()).not.toMatch(/anon/)

    const hasExecute = querySql(`
      select has_function_privilege('authenticated', 'public.save_company_goals(uuid, owner_goal_code[], owner_goal_code, text)', 'execute') as authenticated,
             has_function_privilege('anon', 'public.save_company_goals(uuid, owner_goal_code[], owner_goal_code, text)', 'execute') as anon
    `)
    expect(hasExecute).toMatch(/authenticated/)
    expect(hasExecute).toMatch(/anon/)
    expect(hasExecute).toMatch(/t/)
    expect(hasExecute).toMatch(/f/)
  })

  it("keeps search_path fixed and refuses a second primary immediately", async () => {
    const config = querySql(`
      select prosecdef, proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'save_company_goals'
    `)
    expect(config).toMatch(/t/)
    expect(config).toMatch(/search_path=public/)

    const secondPrimary = querySql(`
      do $body$
      begin
        begin
          insert into public.company_goals (company_id, goal, other_text, is_primary)
          values ('${COMPANY_A_ID}', 'improve_quality', null, true);
          raise exception 'second primary was accepted';
        exception
          when unique_violation then
            null;
        end;
      end
      $body$;
    `)
    expect(secondPrimary.toLowerCase()).not.toContain("second primary was accepted")
  })

  it("fails at commit when a nonempty set has zero primaries", async () => {
    const result = querySqlAllowError(`
      update public.company_goals
      set is_primary = false
      where company_id = '${COMPANY_A_ID}';
    `)
    expect(result.ok).toBe(false)
    expect(result.output).toMatch(/exactly one primary/i)
  })

  it("changes the primary within one save (demote, then promote)", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const saved = await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["scale", "expand"],
      p_primary: "expand",
      p_other_text: "",
    })
    expect(saved.error).toBeNull()
    const rows = await ownerA
      .from("company_goals")
      .select("goal, is_primary")
      .eq("company_id", COMPANY_A_ID)
      .order("goal")
    expect(byGoal(rows.data)).toEqual([
      { goal: "expand", is_primary: true },
      { goal: "scale", is_primary: false },
    ])
  })

  it("refuses an empty set, the DJ pair and Other without text", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    const empty = await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: [],
      p_primary: "scale",
      p_other_text: "",
    })
    expect(empty.error?.code).toBe("PBG01")

    const pair = await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["dj_less", "stop_djing"],
      p_primary: "dj_less",
      p_other_text: "",
    })
    expect(pair.error?.code).toBe("PBG06")

    const other = await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["other"],
      p_primary: "other",
      p_other_text: "",
    })
    expect(other.error?.code).toBe("PBG05")
  })

  it("leaves a valid set after two concurrent saves", async () => {
    const first = await asUser(OWNER_A_EMAIL)
    const second = await asUser(OWNER_A_EMAIL)
    const results = await Promise.all([
      first.rpc("save_company_goals", {
        p_company_id: COMPANY_A_ID,
        p_goals: ["scale", "expand"],
        p_primary: "scale",
        p_other_text: "",
      }),
      second.rpc("save_company_goals", {
        p_company_id: COMPANY_A_ID,
        p_goals: ["improve_quality", "create_leadership"],
        p_primary: "improve_quality",
        p_other_text: "",
      }),
    ])
    expect(results.filter((result) => result.error).length).toBeLessThan(2)

    const ownerA = await asUser(OWNER_A_EMAIL)
    const rows = await ownerA.from("company_goals").select("goal, is_primary").eq("company_id", COMPANY_A_ID)
    const primaries = (rows.data ?? []).filter((row) => row.is_primary)
    expect(primaries).toHaveLength(1)
    expect((rows.data ?? []).length).toBeGreaterThan(0)
    expect(querySql(ASSERT_NOT_ONE_PRIMARY)).not.toMatch(/00000000-0000-4000-8000-0000000000a1/)
    expect(querySql(ASSERT_PRIMARY_MISMATCH)).not.toMatch(/00000000-0000-4000-8000-0000000000a1/)
  })
})

describe("legacy sync and rollback compatibility", () => {
  it("keeps extra goals when a legacy save changes the primary", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["scale", "expand"],
      p_primary: "scale",
      p_other_text: "",
    })

    const legacy = await ownerA.from("company_blueprints").upsert(
      {
        company_id: COMPANY_A_ID,
        owner_goal: "improve_quality",
        owner_goal_other: null,
      },
      { onConflict: "company_id" },
    )
    expect(legacy.error).toBeNull()

    const rows = await ownerA
      .from("company_goals")
      .select("goal, is_primary")
      .eq("company_id", COMPANY_A_ID)
      .order("goal")
    expect(byGoal(rows.data)).toEqual([
      { goal: "expand", is_primary: false },
      { goal: "improve_quality", is_primary: true },
      { goal: "scale", is_primary: false },
    ])
  })

  it("removes Stop DJing when a legacy save writes DJ less", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["stop_djing", "scale"],
      p_primary: "stop_djing",
      p_other_text: "",
    })
    await ownerA.from("company_blueprints").upsert(
      {
        company_id: COMPANY_A_ID,
        owner_goal: "dj_less",
        owner_goal_other: null,
      },
      { onConflict: "company_id" },
    )
    const rows = await ownerA.from("company_goals").select("goal, is_primary").eq("company_id", COMPANY_A_ID).order("goal")
    expect(byGoal(rows.data)).toEqual([
      { goal: "dj_less", is_primary: true },
      { goal: "scale", is_primary: false },
    ])
  })

  it("mirrors every function save into company_blueprints", async () => {
    const ownerA = await asUser(OWNER_A_EMAIL)
    await ownerA.rpc("save_company_goals", {
      p_company_id: COMPANY_A_ID,
      p_goals: ["other", "scale"],
      p_primary: "other",
      p_other_text: "Open a second market",
    })
    const blueprint = await ownerA
      .from("company_blueprints")
      .select("owner_goal, owner_goal_other")
      .eq("company_id", COMPANY_A_ID)
      .maybeSingle()
    expect(blueprint.data).toEqual({ owner_goal: "other", owner_goal_other: "Open a second market" })
  })
})
