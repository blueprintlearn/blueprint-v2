import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"

import {
  applySqlFile,
  applySqlFileAllowError,
  createSqlDatabase,
  dropSqlDatabase,
  querySqlJsonOn,
  querySqlOn,
  TEAM_TODAY_V2_MIGRATION,
} from "./sql"

const BOTH_COUNTS_ID = "10000000-0000-4000-8000-0000000000f1"
const NULL_DESIRED_ID = "10000000-0000-4000-8000-0000000000f2"
const ZERO_COUNTS_ID = "10000000-0000-4000-8000-0000000000f3"

const PRE_V2_SCHEMA = `
  create table public.companies (
    id uuid primary key,
    name text not null
  );

  create table public.company_memberships (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies (id) on delete cascade,
    user_id uuid not null,
    role text not null,
    status text not null default 'active'
  );

  create table public.company_team_today (
    company_id uuid primary key references public.companies (id) on delete cascade,
    current_dj_count integer not null,
    desired_dj_count integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint company_team_today_dj_count_range check (current_dj_count between 0 and 999),
    constraint company_team_today_desired_dj_count_range check (desired_dj_count between 0 and 999)
  );

  alter table public.companies enable row level security;
  alter table public.company_memberships enable row level security;
  alter table public.company_team_today enable row level security;
`

const FIXTURE_ROWS = `
  insert into public.companies (id, name) values
    ('${BOTH_COUNTS_ID}', 'Both counts'),
    ('${NULL_DESIRED_ID}', 'Null desired'),
    ('${ZERO_COUNTS_ID}', 'Zero counts');
  insert into public.company_team_today (company_id, current_dj_count, desired_dj_count) values
    ('${BOTH_COUNTS_ID}', 4, 7),
    ('${NULL_DESIRED_ID}', 5, null),
    ('${ZERO_COUNTS_ID}', 0, 0);
`

type MigratedTeamRow = {
  company_id: string
  current_dj_count: number | null
  desired_dj_count: number | null
  count_basis: string
  desired_count_basis: string
  count_confirmed_at: string | null
  desired_confirmed_at: string | null
  assistant_only_count: number | null
  owner_dj_frequency: string | null
  lead_capable_count: number | null
  earlier_dj_count: number | null
  earlier_desired_dj_count: number | null
}

function readMigratedRows(database: string, companyIds: string[]) {
  const list = companyIds.map((id) => `'${id}'`).join(", ")
  return querySqlJsonOn<MigratedTeamRow[]>(
    database,
    `
      select json_agg(row_to_json(team) order by team.company_id)
      from (
        select
          company_id,
          current_dj_count,
          desired_dj_count,
          count_basis::text as count_basis,
          desired_count_basis::text as desired_count_basis,
          count_confirmed_at,
          desired_confirmed_at,
          assistant_only_count,
          owner_dj_frequency::text as owner_dj_frequency,
          lead_capable_count,
          earlier_dj_count,
          earlier_desired_dj_count
        from public.company_team_today
        where company_id in (${list})
      ) as team
    `,
  )
}

function expectedRow(
  companyId: string,
  current: number,
  desired: number | null,
): MigratedTeamRow {
  return {
    company_id: companyId,
    current_dj_count: current,
    desired_dj_count: desired,
    count_basis: "unknown",
    desired_count_basis: "unknown",
    count_confirmed_at: null,
    desired_confirmed_at: null,
    assistant_only_count: null,
    owner_dj_frequency: null,
    lead_capable_count: null,
    earlier_dj_count: current,
    earlier_desired_dj_count: desired,
  }
}

describe("team today v2 migration", () => {
  const databases: string[] = []

  afterEach(() => {
    while (databases.length > 0) {
      dropSqlDatabase(databases.pop() as string)
    }
  })

  function isolatedPreV2(setupSql = FIXTURE_ROWS) {
    const database = `team_today_v2_mig_${randomUUID().replaceAll("-", "")}`
    databases.push(database)
    createSqlDatabase(database)
    querySqlOn(database, PRE_V2_SCHEMA)
    querySqlOn(database, setupSql)
    return database
  }

  it("applies the migration file and sets every column on the backfilled rows", () => {
    const database = isolatedPreV2()
    applySqlFile(database, TEAM_TODAY_V2_MIGRATION)

    const rows = readMigratedRows(database, [BOTH_COUNTS_ID, NULL_DESIRED_ID, ZERO_COUNTS_ID])
    expect(rows).toEqual([
      expectedRow(BOTH_COUNTS_ID, 4, 7),
      expectedRow(NULL_DESIRED_ID, 5, null),
      expectedRow(ZERO_COUNTS_ID, 0, 0),
    ])

    const currentNullable = querySqlJsonOn<string>(
      database,
      `
        select to_json(is_nullable)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'company_team_today'
          and column_name = 'current_dj_count'
      `,
    )
    expect(currentNullable).toBe("YES")

    const bases = querySqlJsonOn<{ column_name: string; column_default: string }[]>(
      database,
      `
        select json_agg(json_build_object(
          'column_name', column_name,
          'column_default', column_default
        ) order by column_name)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'company_team_today'
          and column_name in ('count_basis', 'desired_count_basis')
      `,
    )
    expect(bases.map((column) => column.column_name)).toEqual(["count_basis", "desired_count_basis"])
    for (const column of bases) {
      expect(column.column_default).toContain("unknown")
    }

    const leadConstraint = querySqlJsonOn<string>(
      database,
      `
        select to_json(pg_get_constraintdef(oid))
        from pg_constraint
        where conname = 'company_team_today_lead_not_above_current'
      `,
    )
    expect(leadConstraint).toContain("current_dj_count IS NOT NULL")
    expect(leadConstraint).not.toMatch(/lead_capable_count IS NULL OR current_dj_count IS NULL/)
  })

  it("aborts the actual migration when a live count would change", () => {
    const database = isolatedPreV2(`
      insert into public.companies (id, name) values ('${NULL_DESIRED_ID}', 'Tampered fixture');
      insert into public.company_team_today (company_id, current_dj_count, desired_dj_count)
      values ('${NULL_DESIRED_ID}', 5, null);
      create function public.tamper_live_count()
      returns trigger
      language plpgsql
      as $$
      begin
        new.current_dj_count := 99;
        return new;
      end;
      $$;
      create trigger tamper_live_count
      before update on public.company_team_today
      for each row
      execute function public.tamper_live_count();
    `)

    const aborted = applySqlFileAllowError(database, TEAM_TODAY_V2_MIGRATION)
    expect(aborted.ok).toBe(false)
    expect(aborted.output).toContain("a live count changed")
  })
})
