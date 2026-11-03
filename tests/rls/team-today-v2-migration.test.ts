import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"

import { TEAM_TODAY_BACKFILL, querySql, querySqlAllowError } from "./sql"

afterEach(() => {
  querySql(`
    alter table public.company_team_today enable trigger company_team_today_protect_counts;
    drop table if exists public.team_today_assertion_snapshot;
  `)
})

function cleanupCompany(companyId: string) {
  querySql(`
    delete from public.company_team_today where company_id = '${companyId}';
    delete from public.companies where id = '${companyId}';
  `)
}

describe("team today v2 migration", () => {
  it("drops NOT NULL on current_dj_count and defaults both bases to unknown", () => {
    const current = querySql(`
      select is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'company_team_today'
        and column_name = 'current_dj_count'
    `)
    expect(current).toMatch(/YES/)

    const bases = querySql(`
      select column_name, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'company_team_today'
        and column_name in ('count_basis', 'desired_count_basis')
      order by column_name
    `)
    expect(bases).toMatch(/count_basis/)
    expect(bases).toMatch(/desired_count_basis/)
    expect(bases).toMatch(/unknown/)
  })

  it("backfills historical counts and unknown bases without changing live values", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'Backfill fixture');
      alter table public.company_team_today disable trigger company_team_today_protect_counts;
      insert into public.company_team_today (
        company_id, current_dj_count, desired_dj_count, earlier_dj_count, earlier_desired_dj_count
      ) values ('${companyId}', 5, null, null, 9);
      ${TEAM_TODAY_BACKFILL}
      where company_id = '${companyId}';
    `)

    const row = querySql(`
      select current_dj_count, desired_dj_count is null as desired_null,
             earlier_dj_count, earlier_desired_dj_count is null as earlier_desired_null,
             count_basis::text, desired_count_basis::text,
             count_confirmed_at is null as count_unconfirmed,
             desired_confirmed_at is null as desired_unconfirmed
      from public.company_team_today
      where company_id = '${companyId}'
    `)
    expect(row).toMatch(/5/)
    expect(row).toMatch(/unknown/)
    expect(row).toMatch(/t/)
    expect(row).not.toMatch(/\| *9 *\|/)

    const before = querySql(`
      select current_dj_count, desired_dj_count, earlier_dj_count, earlier_desired_dj_count
      from public.company_team_today
      where company_id = '${companyId}'
    `)
    querySql(`${TEAM_TODAY_BACKFILL} where company_id = '${companyId}';`)
    expect(
      querySql(`
        select current_dj_count, desired_dj_count, earlier_dj_count, earlier_desired_dj_count
        from public.company_team_today
        where company_id = '${companyId}'
      `),
    ).toBe(before)

    cleanupCompany(companyId)
  })

  it("aborts the assertion when a tampered fixture changes a live count", () => {
    const companyId = randomUUID()
    const aborted = querySqlAllowError(`
      insert into public.companies (id, name) values ('${companyId}', 'Tampered fixture');
      alter table public.company_team_today disable trigger company_team_today_protect_counts;
      insert into public.company_team_today (company_id, current_dj_count, desired_dj_count)
      values ('${companyId}', 4, 7);
      create table public.team_today_assertion_snapshot as
      select company_id, current_dj_count, desired_dj_count
      from public.company_team_today
      where company_id = '${companyId}';
      update public.company_team_today
      set current_dj_count = 99
      where company_id = '${companyId}';
      do $body$
      begin
        if exists (
          select live.company_id
          from public.company_team_today as live
          join public.team_today_assertion_snapshot as snap using (company_id)
          where live.current_dj_count is distinct from snap.current_dj_count
             or live.desired_dj_count is distinct from snap.desired_dj_count
        ) then
          raise exception 'team today migration: a live count changed';
        end if;
      end
      $body$;
    `)
    expect(aborted.ok).toBe(false)
    expect(aborted.output).toContain("a live count changed")

    cleanupCompany(companyId)
  })
})
