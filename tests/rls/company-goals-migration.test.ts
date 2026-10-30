import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"

import {
  ASSERT_BLUEPRINT_WITHOUT_PRIMARY,
  ASSERT_NOT_ONE_PRIMARY,
  ASSERT_PRIMARY_MISMATCH,
  querySql,
  querySqlAllowError,
} from "./sql"

const BACKFILL = `
  insert into public.company_goals (company_id, goal, other_text, is_primary)
  select company_id, owner_goal, owner_goal_other, true
  from public.company_blueprints
  on conflict (company_id, goal) do nothing
`

describe("company_goals migration backfill", () => {
  it("backfills scale and other+text, and is idempotent", () => {
    const scaleId = randomUUID()
    const otherId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values
        ('${scaleId}', 'Scale fixture'),
        ('${otherId}', 'Other fixture');
      alter table public.company_blueprints disable trigger company_blueprints_sync_company_goals;
      insert into public.company_blueprints (company_id, owner_goal, owner_goal_other) values
        ('${scaleId}', 'scale', null),
        ('${otherId}', 'other', 'Open a second city');
      alter table public.company_blueprints enable trigger company_blueprints_sync_company_goals;
    `)

    querySql(BACKFILL)

    const scale = querySql(`select goal, other_text, is_primary from public.company_goals where company_id = '${scaleId}'`)
    const other = querySql(`select goal, other_text, is_primary from public.company_goals where company_id = '${otherId}'`)
    expect(scale).toMatch(/scale/)
    expect(scale).toMatch(/t/)
    expect(other).toMatch(/other/)
    expect(other).toMatch(/Open a second city/)

    const before = querySql(`select count(*) from public.company_goals where company_id in ('${scaleId}', '${otherId}')`)
    querySql(BACKFILL)
    const after = querySql(`select count(*) from public.company_goals where company_id in ('${scaleId}', '${otherId}')`)
    expect(after).toBe(before)

    querySql(`
      delete from public.company_goals where company_id in ('${scaleId}', '${otherId}');
      delete from public.company_blueprints where company_id in ('${scaleId}', '${otherId}');
      delete from public.companies where id in ('${scaleId}', '${otherId}');
    `)
  })

  it("aborts the assertion when a corrupted two-primary fixture exists", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'Corrupt fixture');
      alter table public.company_goals disable trigger company_goals_enforce_set;
      drop index if exists public.company_goals_one_primary_idx;
      insert into public.company_goals (company_id, goal, other_text, is_primary) values
        ('${companyId}', 'scale', null, true),
        ('${companyId}', 'expand', null, true);
    `)

    const bad = querySql(ASSERT_NOT_ONE_PRIMARY)
    expect(bad).toContain(companyId)

    const aborted = querySqlAllowError(`
      do $body$
      begin
        if exists (${ASSERT_NOT_ONE_PRIMARY}) then
          raise exception 'company_goals backfill: a company has goal rows but not exactly one primary';
        end if;
      end
      $body$;
    `)
    expect(aborted.ok).toBe(false)
    expect(aborted.output).toContain("exactly one primary")

    querySql(`
      delete from public.company_goals where company_id = '${companyId}';
      create unique index company_goals_one_primary_idx on public.company_goals (company_id) where is_primary;
      alter table public.company_goals enable trigger company_goals_enforce_set;
      delete from public.companies where id = '${companyId}';
    `)

    expect(querySql(ASSERT_NOT_ONE_PRIMARY)).not.toContain(companyId)
    expect(querySql(ASSERT_BLUEPRINT_WITHOUT_PRIMARY).length).toBeGreaterThan(0)
    expect(querySql(ASSERT_PRIMARY_MISMATCH).length).toBeGreaterThan(0)
  })
})
