import { execFileSync } from "node:child_process"

export const COMPANY_A_ID = "00000000-0000-4000-8000-0000000000a1"
const COMPANY_C_ID = "00000000-0000-4000-8000-0000000000c1"
const OWNER_C_ID = "00000000-0000-4000-8000-0000000000c2"
export const OWNER_C_EMAIL = "owner-c@blueprint.test"
export const OWNER_C_PASSWORD = "blueprint-local-password"

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

function sql(statement: string) {
  execFileSync("docker", [...PSQL, statement], { encoding: "utf8" })
}

export function resetGuidedCompanyData(companyId: string) {
  sql(`
    delete from public.company_blueprint_answers where company_id = '${companyId}';
    delete from public.company_blueprint_progress where company_id = '${companyId}';
    delete from public.company_goals where company_id = '${companyId}';
    delete from public.company_blueprints where company_id = '${companyId}';
    delete from public.company_team_today where company_id = '${companyId}';
  `)
}

export function seedLegacyTeamCount(currentDjCount: number, desiredDjCount: number | null = null) {
  ensureEmptyGuidedCompany()
  const desired = desiredDjCount === null ? "null" : String(desiredDjCount)
  sql(`
    insert into public.company_team_today (company_id, current_dj_count, desired_dj_count)
    values ('${COMPANY_C_ID}', ${currentDjCount}, ${desired});
  `)
}

/** Local-only empty guided company. Not seed data. Not used on staging. */
export function ensureEmptyGuidedCompany() {
  sql(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '${OWNER_C_ID}',
      'authenticated',
      'authenticated',
      '${OWNER_C_EMAIL}',
      extensions.crypt('${OWNER_C_PASSWORD}', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    select
      '${OWNER_C_ID}',
      '${OWNER_C_ID}',
      jsonb_build_object('sub', '${OWNER_C_ID}', 'email', '${OWNER_C_EMAIL}', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1 from auth.identities where user_id = '${OWNER_C_ID}'
    );

    insert into public.companies (id, name) values ('${COMPANY_C_ID}', 'Company C')
    on conflict (id) do nothing;

    insert into public.company_memberships (company_id, user_id, role, status)
    select '${COMPANY_C_ID}', '${OWNER_C_ID}', 'owner_admin', 'active'
    where not exists (
      select 1 from public.company_memberships
      where company_id = '${COMPANY_C_ID}' and user_id = '${OWNER_C_ID}'
    );

    delete from public.company_blueprint_answers where company_id = '${COMPANY_C_ID}';
    delete from public.company_blueprint_progress where company_id = '${COMPANY_C_ID}';
    delete from public.company_goals where company_id = '${COMPANY_C_ID}';
    delete from public.company_blueprints where company_id = '${COMPANY_C_ID}';
    delete from public.company_team_today where company_id = '${COMPANY_C_ID}';
  `)
}
