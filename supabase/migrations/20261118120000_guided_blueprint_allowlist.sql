-- Stage 1 S2-7: enforce the guided Blueprint switch in the database.
-- Local database only. Do not apply to hosted, staging, or production.
--
-- Postgres cannot read BLUEPRINT_GUIDED_COMPANY_IDS. The env var stays the
-- server-only UI switch. This table is the database switch: RLS and guided
-- RPCs require a row here. Authenticated clients cannot insert into it.
-- Local seed enables Company A. Company C is enabled by the e2e helper.
-- Production stays empty until an approved enablement.
--
-- Direct owner writes to answers/progress are still possible for allowlisted
-- companies (S2-7 residual: they skip server-action validation). They cannot
-- forge approval owner/time/revision: a trigger stamps those from the session.
-- Company B, managers, anon, and anyone not on the allowlist are blocked.

create table public.blueprint_guided_companies (
  company_id uuid primary key references public.companies (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.blueprint_guided_companies enable row level security;

revoke all on table public.blueprint_guided_companies from public, anon, authenticated;

create function public.is_guided_blueprint_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.blueprint_guided_companies
    where company_id = p_company_id
  );
$$;

create function public.require_guided_blueprint_company(p_company_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_guided_blueprint_company(p_company_id) then
    raise exception 'That didn’t save. Please try again.'
      using errcode = 'PBG08';
  end if;
end;
$$;

revoke all on function public.is_guided_blueprint_company(uuid) from public, anon;
revoke all on function public.require_guided_blueprint_company(uuid) from public, anon, authenticated;
grant execute on function public.is_guided_blueprint_company(uuid) to authenticated;
grant execute on function public.require_guided_blueprint_company(uuid) to blueprint_team_today_writer;

create or replace function public.save_company_goals(
  p_company_id uuid,
  p_goals public.owner_goal_code[],
  p_primary public.owner_goal_code,
  p_other_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other text;
  v_goal public.owner_goal_code;
  v_count integer;
  v_distinct integer;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = p_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  ) then
    raise exception 'Only the company owner can change this.'
      using errcode = 'PBG07';
  end if;

  perform public.require_guided_blueprint_company(p_company_id);

  if p_goals is null or cardinality(p_goals) = 0 then
    raise exception 'Choose at least one goal.'
      using errcode = 'PBG01';
  end if;

  select count(*), count(distinct goal)
    into v_count, v_distinct
  from unnest(p_goals) as goal;

  if v_count > 7 then
    raise exception 'Choose at least one goal.'
      using errcode = 'PBG02';
  end if;

  if v_count <> v_distinct then
    raise exception 'Choose at least one goal.'
      using errcode = 'PBG03';
  end if;

  if p_primary is null or not (p_primary = any (p_goals)) then
    raise exception 'Choose which goal matters most.'
      using errcode = 'PBG04';
  end if;

  if 'dj_less' = any (p_goals) and 'stop_djing' = any (p_goals) then
    raise exception 'Choose DJ less or Stop DJing, not both.'
      using errcode = 'PBG06';
  end if;

  v_other := nullif(trim(coalesce(p_other_text, '')), '');
  if 'other' = any (p_goals) then
    if v_other is null or length(v_other) > 80 then
      raise exception 'Add a few words about your goal.'
        using errcode = 'PBG05';
    end if;
  else
    v_other := null;
  end if;

  perform 1
  from public.companies
  where id = p_company_id
  for update;

  perform set_config('blueprint.skip_goal_sync', '1', true);

  update public.company_goals
  set is_primary = false
  where company_id = p_company_id
    and is_primary;

  delete from public.company_goals
  where company_id = p_company_id
    and not (goal = any (p_goals));

  foreach v_goal in array p_goals loop
    insert into public.company_goals (company_id, goal, other_text, is_primary)
    values (
      p_company_id,
      v_goal,
      case when v_goal = 'other' then v_other else null end,
      false
    )
    on conflict (company_id, goal) do update
      set other_text = excluded.other_text,
          is_primary = false;
  end loop;

  update public.company_goals
  set is_primary = true
  where company_id = p_company_id
    and goal = p_primary;

  insert into public.company_blueprints (company_id, owner_goal, owner_goal_other)
  values (
    p_company_id,
    p_primary,
    case when p_primary = 'other' then v_other else null end
  )
  on conflict (company_id) do update
    set owner_goal = excluded.owner_goal,
        owner_goal_other = excluded.owner_goal_other;
end;
$$;

create or replace function public.save_team_today_v2(
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

  perform public.require_guided_blueprint_company(p_company_id);

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

drop policy company_blueprint_answers_owner_select on public.company_blueprint_answers;
drop policy company_blueprint_answers_owner_insert on public.company_blueprint_answers;
drop policy company_blueprint_answers_owner_update on public.company_blueprint_answers;
drop policy company_blueprint_answers_owner_delete on public.company_blueprint_answers;
drop policy company_blueprint_progress_owner_select on public.company_blueprint_progress;
drop policy company_blueprint_progress_owner_insert on public.company_blueprint_progress;
drop policy company_blueprint_progress_owner_update on public.company_blueprint_progress;

create policy company_blueprint_answers_owner_select
on public.company_blueprint_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_answers.company_id)
);

create policy company_blueprint_answers_owner_insert
on public.company_blueprint_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_answers.company_id)
);

create policy company_blueprint_answers_owner_update
on public.company_blueprint_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_answers.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_answers.company_id)
);

create policy company_blueprint_answers_owner_delete
on public.company_blueprint_answers
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_answers.company_id)
);

create policy company_blueprint_progress_owner_select
on public.company_blueprint_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_progress.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_progress.company_id)
);

create policy company_blueprint_progress_owner_insert
on public.company_blueprint_progress
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_progress.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_progress.company_id)
);

create policy company_blueprint_progress_owner_update
on public.company_blueprint_progress
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_progress.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_progress.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprint_progress.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_blueprint_progress.company_id)
);

create function public.company_blueprint_answers_touch_approval()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_current integer;
  v_old_current integer;
  v_old_revision integer;
  v_new_current integer;
  v_new_revision integer;
begin
  if new.question_key is distinct from 'R1' then
    return new;
  end if;
  if new.state is distinct from 'answered' or jsonb_typeof(new.value) is distinct from 'object' then
    return new;
  end if;
  if coalesce(new.value ->> 'code', '') is distinct from 'approved' then
    return new;
  end if;

  v_old_current := case
    when tg_op = 'UPDATE' and jsonb_typeof(old.value -> 'currentRevision') = 'number'
      then (old.value ->> 'currentRevision')::integer
    else 0
  end;
  v_old_revision := case
    when tg_op = 'UPDATE' and jsonb_typeof(old.value -> 'revision') = 'number'
      then (old.value ->> 'revision')::integer
    else 0
  end;
  v_new_current := case
    when jsonb_typeof(new.value -> 'currentRevision') = 'number'
      then (new.value ->> 'currentRevision')::integer
    else 0
  end;
  v_new_revision := case
    when jsonb_typeof(new.value -> 'revision') = 'number'
      then (new.value ->> 'revision')::integer
    else 0
  end;

  if tg_op = 'UPDATE'
    and coalesce(old.value ->> 'code', '') = 'approved'
    and v_new_current > v_old_current
    and v_new_revision is not distinct from v_old_revision
  then
    return new;
  end if;

  v_uid := auth.uid();
  if v_uid is not null then
    new.value := jsonb_set(new.value, '{approvedBy}', to_jsonb(v_uid::text), true);
    new.value := jsonb_set(
      new.value,
      '{approvedAt}',
      to_jsonb(to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      true
    );
  end if;

  v_current := greatest(v_old_current, 1);
  new.value := jsonb_set(new.value, '{currentRevision}', to_jsonb(v_current), true);
  new.value := jsonb_set(new.value, '{revision}', to_jsonb(v_current), true);
  return new;
end;
$$;

create trigger company_blueprint_answers_touch_approval
before insert or update on public.company_blueprint_answers
for each row
execute function public.company_blueprint_answers_touch_approval();

revoke all on function public.company_blueprint_answers_touch_approval() from public, anon, authenticated;
