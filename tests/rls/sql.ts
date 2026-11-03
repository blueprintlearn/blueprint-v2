import { execFileSync } from "node:child_process"

const PSQL = [
  "exec",
  "supabase_db_blueprint-v2",
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
] as const

export function querySql(sql: string): string {
  try {
    return execFileSync("docker", [...PSQL, sql], { encoding: "utf8" })
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; message?: string }
    throw new Error([failed.stdout, failed.stderr, failed.message].filter(Boolean).join("\n"))
  }
}

export function querySqlAllowError(sql: string): { ok: boolean; output: string } {
  try {
    return { ok: true, output: querySql(sql) }
  } catch (error) {
    return { ok: false, output: String(error) }
  }
}

export function clearCompanyGoalData(companyId: string) {
  querySql(`
    delete from public.company_goals where company_id = '${companyId}';
    delete from public.company_blueprints where company_id = '${companyId}';
  `)
}

export function clearBlueprintAnswers(companyId: string) {
  querySql(`
    delete from public.company_blueprint_answers where company_id = '${companyId}';
    delete from public.company_blueprint_progress where company_id = '${companyId}';
  `)
}

export const ASSERT_NOT_ONE_PRIMARY = `
  select company_id
  from public.company_goals
  group by company_id
  having count(*) > 0 and count(*) filter (where is_primary) <> 1
`

export const ASSERT_BLUEPRINT_WITHOUT_PRIMARY = `
  select blueprint.company_id
  from public.company_blueprints as blueprint
  left join public.company_goals as goal
    on goal.company_id = blueprint.company_id
   and goal.is_primary
  where goal.id is null
`

export function asJwtSql(userId: string, sql: string) {
  return `
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
    select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', false);
    ${sql}
  `
}

export const TEAM_TODAY_BACKFILL = `
  update public.company_team_today
  set
    earlier_dj_count = current_dj_count,
    earlier_desired_dj_count = desired_dj_count,
    count_basis = 'unknown',
    desired_count_basis = 'unknown',
    count_confirmed_at = null,
    desired_confirmed_at = null
`

export const ASSERT_TEAM_TODAY_LIVE_COUNT_CHANGED = `
  select live.company_id
  from public.company_team_today as live
  join team_today_assertion_snapshot as snap using (company_id)
  where live.current_dj_count is distinct from snap.current_dj_count
     or live.desired_dj_count is distinct from snap.desired_dj_count
`

export const ASSERT_PRIMARY_MISMATCH = `
  select blueprint.company_id
  from public.company_blueprints as blueprint
  join public.company_goals as goal
    on goal.company_id = blueprint.company_id
   and goal.is_primary
  where goal.goal is distinct from blueprint.owner_goal
     or goal.other_text is distinct from blueprint.owner_goal_other
`
