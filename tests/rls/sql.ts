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

export const ASSERT_PRIMARY_MISMATCH = `
  select blueprint.company_id
  from public.company_blueprints as blueprint
  join public.company_goals as goal
    on goal.company_id = blueprint.company_id
   and goal.is_primary
  where goal.goal is distinct from blueprint.owner_goal
     or goal.other_text is distinct from blueprint.owner_goal_other
`
