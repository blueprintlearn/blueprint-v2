-- Slice 4: Team today v2, count basis, and immutable historical counts (S4-13).
-- Matches Charlie's seven-PASS local SQL verification (Approval 1 design).
-- Approval 1 covers this design only. Do not apply to staging or production
-- without the matching named approval.
--
-- Production-release blocker (S2-7 / D-6): save_team_today_v2 is granted to
-- authenticated. The database cannot see BLUEPRINT_GUIDED_COMPANY_IDS. An
-- authenticated owner can call it directly and bypass the rollout switch.
-- A production fix must cover save_company_goals, company_blueprint_answers,
-- company_blueprint_progress, and save_team_today_v2. That is not accepted as
-- a permanent security design. Do not apply this migration to production, and
-- do not release Slice 4, until it is resolved through its own reviewed change.
--
-- Writer role: blueprint_team_today_writer (NOLOGIN). Confirmation is allowed
-- only when current_user is that role (SECURITY DEFINER owner of
-- save_team_today_v2). Callers cannot set that. Do not use GUCs. Do not add
-- an "inside the function" trigger condition.

begin;

lock table public.company_team_today in share row exclusive mode;

create temporary table team_today_migration_snapshot on commit drop as
select
  company_id,
  current_dj_count,
  desired_dj_count
from public.company_team_today;

create type public.team_count_basis as enum (
  'excludes_owner',
  'includes_owner',
  'unknown'
);

create type public.owner_dj_frequency as enum (
  'regularly',
  'sometimes',
  'no'
);

alter table public.company_team_today
  add column count_basis public.team_count_basis not null default 'unknown',
  add column desired_count_basis public.team_count_basis not null default 'unknown',
  add column count_confirmed_at timestamptz,
  add column desired_confirmed_at timestamptz,
  add column assistant_only_count integer,
  add column owner_dj_frequency public.owner_dj_frequency,
  add column lead_capable_count integer,
  add column earlier_dj_count integer,
  add column earlier_desired_dj_count integer;

alter table public.company_team_today
  alter column current_dj_count drop not null;

alter table public.company_team_today
  add constraint company_team_today_assistant_only_count_range
    check (assistant_only_count between 0 and 999),
  add constraint company_team_today_lead_capable_count_range
    check (lead_capable_count between 0 and 999),
  add constraint company_team_today_earlier_dj_count_range
    check (earlier_dj_count between 0 and 999),
  add constraint company_team_today_earlier_desired_dj_count_range
    check (earlier_desired_dj_count between 0 and 999),
  add constraint company_team_today_lead_not_above_current
    check (
      lead_capable_count is null
      or current_dj_count is null
      or lead_capable_count <= current_dj_count
    ),
  add constraint company_team_today_zero_current_zero_lead
    check (
      current_dj_count is distinct from 0
      or lead_capable_count is null
      or lead_capable_count = 0
    );

-- S4-13: copy existing counts. Null desired stays null. No arithmetic.
update public.company_team_today
set
  earlier_dj_count = current_dj_count,
  earlier_desired_dj_count = desired_dj_count,
  count_basis = 'unknown',
  desired_count_basis = 'unknown',
  count_confirmed_at = null,
  desired_confirmed_at = null;

do $$
declare
  v_row_mismatch integer;
  v_value_mismatch integer;
  v_history_mismatch integer;
  v_basis_mismatch integer;
begin
  select count(*) into v_row_mismatch
  from (
    select company_id from team_today_migration_snapshot
    except
    select company_id from public.company_team_today
  ) missing
  union all
  select count(*)
  from (
    select company_id from public.company_team_today
    except
    select company_id from team_today_migration_snapshot
  ) extra;

  if v_row_mismatch <> 0 then
    raise exception 'team today migration: row count changed';
  end if;

  select count(*) into v_value_mismatch
  from public.company_team_today as live
  join team_today_migration_snapshot as snap using (company_id)
  where live.current_dj_count is distinct from snap.current_dj_count
     or live.desired_dj_count is distinct from snap.desired_dj_count;

  if v_value_mismatch <> 0 then
    raise exception 'team today migration: a live count changed';
  end if;

  select count(*) into v_history_mismatch
  from public.company_team_today as live
  join team_today_migration_snapshot as snap using (company_id)
  where live.earlier_dj_count is distinct from snap.current_dj_count
     or live.earlier_desired_dj_count is distinct from snap.desired_dj_count;

  if v_history_mismatch <> 0 then
    raise exception 'team today migration: historical backfill does not match snapshot';
  end if;

  select count(*) into v_basis_mismatch
  from public.company_team_today
  where count_basis is distinct from 'unknown'
     or desired_count_basis is distinct from 'unknown'
     or count_confirmed_at is not null
     or desired_confirmed_at is not null;

  if v_basis_mismatch <> 0 then
    raise exception 'team today migration: a basis is not unknown';
  end if;
end;
$$;

-- Isolated writer: cannot log in, not granted to authenticated.
-- postgres is a member only so the migration role can assign function
-- ownership. Local postgres is not superuser.
-- Roles survive `supabase db reset`; create only when missing.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'blueprint_team_today_writer') then
    create role blueprint_team_today_writer nologin noinherit;
  end if;
end
$$;

grant blueprint_team_today_writer to postgres;

grant usage, create on schema public to blueprint_team_today_writer;
grant usage on type public.team_count_basis to blueprint_team_today_writer, authenticated;
grant usage on type public.owner_dj_frequency to blueprint_team_today_writer, authenticated;

-- Writer may set live team fields and confirmation metadata. Not history.
grant select on table public.company_team_today to blueprint_team_today_writer;
grant insert (
  company_id,
  current_dj_count,
  desired_dj_count,
  assistant_only_count,
  owner_dj_frequency,
  lead_capable_count,
  count_basis,
  desired_count_basis,
  count_confirmed_at,
  desired_confirmed_at
) on table public.company_team_today to blueprint_team_today_writer;
grant update (
  current_dj_count,
  desired_dj_count,
  assistant_only_count,
  owner_dj_frequency,
  lead_capable_count,
  count_basis,
  desired_count_basis,
  count_confirmed_at,
  desired_confirmed_at
) on table public.company_team_today to blueprint_team_today_writer;

-- Writer is not the table owner. RLS would deny. This policy is only for
-- the writer role; the function still checks the caller is the owner.
create policy team_today_writer_definer
on public.company_team_today
to blueprint_team_today_writer
using (true)
with check (true);

-- Owner check reads memberships. The writer is not authenticated, so it
-- needs its own select grant and policy. It does not write memberships.
grant select on table public.company_memberships to blueprint_team_today_writer;
create policy team_today_writer_read_memberships
on public.company_memberships
to blueprint_team_today_writer
using (true);

-- Legacy authenticated path: the two count columns plus company_id so
-- PostgREST upsert (INSERT + ON CONFLICT UPDATE of every body column) works.
revoke insert, update on table public.company_team_today from authenticated;
grant select on table public.company_team_today to authenticated;
grant insert (company_id, current_dj_count, desired_dj_count)
  on table public.company_team_today to authenticated;
grant update (company_id, current_dj_count, desired_dj_count)
  on table public.company_team_today to authenticated;

create function public.save_team_today_v2(
  p_company_id uuid,
  p_current_dj_count integer default null,
  p_desired_dj_count integer default null,
  p_assistant_only_count integer default null,
  p_owner_dj_frequency public.owner_dj_frequency default null,
  p_lead_capable_count integer default null,
  p_count_basis public.team_count_basis default null,
  p_desired_count_basis public.team_count_basis default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_count_basis public.team_count_basis;
  v_desired_basis public.team_count_basis;
  v_count_confirmed_at timestamptz;
  v_desired_confirmed_at timestamptz;
begin
  -- Same sources as auth.uid(). The writer role cannot use schema auth:
  -- postgres (migration role) has no GRANT option on that schema.
  v_uid := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;

  if v_uid is null or not exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = p_company_id
      and membership.user_id = v_uid
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  ) then
    raise exception 'Only the company owner can change this.'
      using errcode = 'PBG07';
  end if;

  if p_count_basis is not null then
    v_count_basis := p_count_basis;
    v_count_confirmed_at := now();
  end if;

  if p_desired_count_basis is not null then
    v_desired_basis := p_desired_count_basis;
    v_desired_confirmed_at := now();
  end if;

  insert into public.company_team_today (
    company_id,
    current_dj_count,
    desired_dj_count,
    assistant_only_count,
    owner_dj_frequency,
    lead_capable_count,
    count_basis,
    desired_count_basis,
    count_confirmed_at,
    desired_confirmed_at
  )
  values (
    p_company_id,
    p_current_dj_count,
    p_desired_dj_count,
    p_assistant_only_count,
    p_owner_dj_frequency,
    p_lead_capable_count,
    coalesce(v_count_basis, 'unknown'),
    coalesce(v_desired_basis, 'unknown'),
    v_count_confirmed_at,
    v_desired_confirmed_at
  )
  on conflict (company_id) do update
    set
      current_dj_count = case
        when p_current_dj_count is not null then excluded.current_dj_count
        else public.company_team_today.current_dj_count
      end,
      desired_dj_count = case
        when p_desired_dj_count is not null then excluded.desired_dj_count
        else public.company_team_today.desired_dj_count
      end,
      assistant_only_count = case
        when p_assistant_only_count is not null then excluded.assistant_only_count
        else public.company_team_today.assistant_only_count
      end,
      owner_dj_frequency = case
        when p_owner_dj_frequency is not null then excluded.owner_dj_frequency
        else public.company_team_today.owner_dj_frequency
      end,
      lead_capable_count = case
        when p_lead_capable_count is not null then excluded.lead_capable_count
        else public.company_team_today.lead_capable_count
      end,
      count_basis = coalesce(v_count_basis, public.company_team_today.count_basis),
      desired_count_basis = coalesce(v_desired_basis, public.company_team_today.desired_count_basis),
      count_confirmed_at = coalesce(v_count_confirmed_at, public.company_team_today.count_confirmed_at),
      desired_confirmed_at = coalesce(v_desired_confirmed_at, public.company_team_today.desired_confirmed_at);
end;
$$;

alter function public.save_team_today_v2(
  uuid,
  integer,
  integer,
  integer,
  public.owner_dj_frequency,
  integer,
  public.team_count_basis,
  public.team_count_basis
) owner to blueprint_team_today_writer;

-- CREATE was only needed to assign ownership.
revoke create on schema public from blueprint_team_today_writer;

revoke all on function public.save_team_today_v2(
  uuid,
  integer,
  integer,
  integer,
  public.owner_dj_frequency,
  integer,
  public.team_count_basis,
  public.team_count_basis
) from public, anon;

grant execute on function public.save_team_today_v2(
  uuid,
  integer,
  integer,
  integer,
  public.owner_dj_frequency,
  integer,
  public.team_count_basis,
  public.team_count_basis
) to authenticated;

create function public.company_team_today_protect_counts()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot change';
  end if;

  -- Historical columns are immutable after backfill, including writer writes.
  if tg_op = 'UPDATE' then
    new.earlier_dj_count := old.earlier_dj_count;
    new.earlier_desired_dj_count := old.earlier_desired_dj_count;
  else
    new.earlier_dj_count := null;
    new.earlier_desired_dj_count := null;
  end if;

  -- current_user is the SECURITY DEFINER owner only when save_team_today_v2
  -- is running. Callers cannot set this. They cannot SET ROLE to a NOLOGIN
  -- role they do not belong to.
  if current_user is distinct from 'blueprint_team_today_writer' then
    if tg_op = 'INSERT' then
      new.count_basis := 'unknown';
      new.desired_count_basis := 'unknown';
      new.count_confirmed_at := null;
      new.desired_confirmed_at := null;
    else
      if new.current_dj_count is distinct from old.current_dj_count then
        new.count_basis := 'unknown';
        new.count_confirmed_at := null;
      end if;
      if new.desired_dj_count is distinct from old.desired_dj_count then
        new.desired_count_basis := 'unknown';
        new.desired_confirmed_at := null;
      end if;
      if new.count_basis is distinct from old.count_basis
         or new.count_confirmed_at is distinct from old.count_confirmed_at then
        new.count_basis := case
          when new.current_dj_count is distinct from old.current_dj_count then 'unknown'
          else old.count_basis
        end;
        new.count_confirmed_at := case
          when new.current_dj_count is distinct from old.current_dj_count then null
          else old.count_confirmed_at
        end;
      end if;
      if new.desired_count_basis is distinct from old.desired_count_basis
         or new.desired_confirmed_at is distinct from old.desired_confirmed_at then
        new.desired_count_basis := case
          when new.desired_dj_count is distinct from old.desired_dj_count then 'unknown'
          else old.desired_count_basis
        end;
        new.desired_confirmed_at := case
          when new.desired_dj_count is distinct from old.desired_dj_count then null
          else old.desired_confirmed_at
        end;
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_team_today_protect_counts
before insert or update on public.company_team_today
for each row
execute function public.company_team_today_protect_counts();

revoke all on function public.company_team_today_protect_counts() from public, anon, authenticated;

commit;
