import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const CONTAINER = "supabase_db_blueprint-v2"

export const TEAM_TODAY_V2_MIGRATION = resolve(
  process.cwd(),
  "supabase/migrations/20261103180000_company_team_today_v2.sql",
)

function failedSql(error: unknown) {
  const failed = error as { stdout?: string; stderr?: string; message?: string }
  return [failed.stdout, failed.stderr, failed.message].filter(Boolean).join("\n")
}

function psqlArgs(database: string, extra: string[] = []) {
  return ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", ...extra]
}

export function querySqlOn(database: string, sql: string): string {
  try {
    return execFileSync("docker", [...psqlArgs(database), "-c", sql], { encoding: "utf8" })
  } catch (error) {
    throw new Error(failedSql(error))
  }
}

export function querySql(sql: string): string {
  return querySqlOn("postgres", sql)
}

export function querySqlAllowError(sql: string): { ok: boolean; output: string } {
  try {
    return { ok: true, output: querySql(sql) }
  } catch (error) {
    return { ok: false, output: String(error) }
  }
}

export function querySqlJsonOn<T>(database: string, sql: string): T {
  const output = execFileSync("docker", [...psqlArgs(database, ["-t", "-A"]), "-c", sql], {
    encoding: "utf8",
  }).trim()
  return JSON.parse(output) as T
}

export function applySqlFile(database: string, filePath: string): string {
  try {
    return execFileSync("docker", psqlArgs(database), {
      encoding: "utf8",
      input: readFileSync(filePath, "utf8"),
    })
  } catch (error) {
    throw new Error(failedSql(error))
  }
}

export function applySqlFileAllowError(database: string, filePath: string): { ok: boolean; output: string } {
  try {
    return { ok: true, output: applySqlFile(database, filePath) }
  } catch (error) {
    return { ok: false, output: String(error) }
  }
}

export function createSqlDatabase(name: string) {
  querySql(`drop database if exists ${name} with (force)`)
  querySql(`create database ${name}`)
}

export function dropSqlDatabase(name: string) {
  querySql(`drop database if exists ${name} with (force)`)
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

export const ASSERT_PRIMARY_MISMATCH = `
  select blueprint.company_id
  from public.company_blueprints as blueprint
  join public.company_goals as goal
    on goal.company_id = blueprint.company_id
   and goal.is_primary
  where goal.goal is distinct from blueprint.owner_goal
     or goal.other_text is distinct from blueprint.owner_goal_other
`
