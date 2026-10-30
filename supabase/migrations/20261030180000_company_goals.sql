-- Slice 2: multiple goals with exactly one primary.
-- Approval 1 covers this design only. Do not apply to staging or production
-- without the matching named approval.
--
-- Production-release blocker: save_company_goals is granted to authenticated,
-- so a company owner can call it directly and bypass BLUEPRINT_GUIDED_COMPANY_IDS.
-- That is not accepted as a permanent security design. No production migration
-- or release until it is resolved through its own reviewed change.
--
-- save_company_goals SQLSTATE codes (mapped in lib/blueprint/company-goals.ts):
--   PBG01 empty set
--   PBG02 more than 7 goals
--   PBG03 duplicate goals
--   PBG04 primary missing or not in the set
--   PBG05 Other text missing or longer than 80
--   PBG06 DJ less and Stop DJing together
--   PBG07 not the active owner
--
-- Transaction-local skip for the legacy sync trigger: blueprint.skip_goal_sync = '1'

create table public.company_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  goal public.owner_goal_code not null,
  other_text text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_goals_company_goal_key unique (company_id, goal),
  constraint company_goals_other_required check (
    (
      goal = 'other'
      and other_text is not null
      and length(trim(other_text)) between 1 and 80
    )
    or (
      goal <> 'other'
      and other_text is null
    )
  )
);

create unique index company_goals_one_primary_idx
  on public.company_goals (company_id)
  where is_primary;

create function public.company_goals_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot change';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_goals_touch
before update on public.company_goals
for each row
execute function public.company_goals_touch();

create function public.company_goals_enforce_set()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
  v_count integer;
  v_primaries integer;
begin
  v_company_id := coalesce(new.company_id, old.company_id);

  select count(*), count(*) filter (where is_primary)
    into v_count, v_primaries
  from public.company_goals
  where company_id = v_company_id;

  if v_count > 0 and v_primaries <> 1 then
    raise exception 'company must have exactly one primary goal when any goal exists';
  end if;

  if exists (
    select 1
    from public.company_goals
    where company_id = v_company_id
      and goal = 'dj_less'
  ) and exists (
    select 1
    from public.company_goals
    where company_id = v_company_id
      and goal = 'stop_djing'
  ) then
    raise exception 'Choose DJ less or Stop DJing, not both.'
      using errcode = 'PBG06';
  end if;

  return null;
end;
$$;

create constraint trigger company_goals_enforce_set
after insert or update or delete on public.company_goals
deferrable initially deferred
for each row
execute function public.company_goals_enforce_set();

create function public.save_company_goals(
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

  -- Immediate unique index: demote the old primary before promoting the new one.
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

create function public.sync_company_goals_from_blueprint()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('blueprint.skip_goal_sync', true) = '1' then
    return new;
  end if;

  perform 1
  from public.companies
  where id = new.company_id
  for update;

  if new.owner_goal = 'dj_less' then
    delete from public.company_goals
    where company_id = new.company_id
      and goal = 'stop_djing';
  elsif new.owner_goal = 'stop_djing' then
    delete from public.company_goals
    where company_id = new.company_id
      and goal = 'dj_less';
  end if;

  update public.company_goals
  set is_primary = false
  where company_id = new.company_id
    and is_primary
    and goal is distinct from new.owner_goal;

  insert into public.company_goals (company_id, goal, other_text, is_primary)
  values (new.company_id, new.owner_goal, new.owner_goal_other, true)
  on conflict (company_id, goal) do update
    set other_text = excluded.other_text,
        is_primary = true;

  return new;
end;
$$;

create trigger company_blueprints_sync_company_goals
after insert or update of owner_goal, owner_goal_other on public.company_blueprints
for each row
execute function public.sync_company_goals_from_blueprint();

alter table public.company_goals enable row level security;

revoke all on table public.company_goals from public, anon, authenticated;
grant select on table public.company_goals to authenticated;

create policy company_goals_select_owner
on public.company_goals
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_goals.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
);

create policy company_goals_select_other_member
on public.company_goals
for select
to authenticated
using (
  company_goals.is_primary
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_goals.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

revoke all on function public.company_goals_touch() from public, anon, authenticated;
revoke all on function public.company_goals_enforce_set() from public, anon, authenticated;
revoke all on function public.sync_company_goals_from_blueprint() from public, anon, authenticated;
revoke all on function public.save_company_goals(uuid, public.owner_goal_code[], public.owner_goal_code, text) from public, anon;
grant execute on function public.save_company_goals(uuid, public.owner_goal_code[], public.owner_goal_code, text) to authenticated;

insert into public.company_goals (company_id, goal, other_text, is_primary)
select company_id, owner_goal, owner_goal_other, true
from public.company_blueprints
on conflict (company_id, goal) do nothing;

do $$
begin
  if exists (
    select 1
    from public.company_goals
    group by company_id
    having count(*) > 0 and count(*) filter (where is_primary) <> 1
  ) then
    raise exception 'company_goals backfill: a company has goal rows but not exactly one primary';
  end if;

  if exists (
    select 1
    from public.company_blueprints as blueprint
    left join public.company_goals as goal
      on goal.company_id = blueprint.company_id
     and goal.is_primary
    where goal.id is null
  ) then
    raise exception 'company_goals backfill: a company_blueprints row has no primary goal';
  end if;

  if exists (
    select 1
    from public.company_blueprints as blueprint
    join public.company_goals as goal
      on goal.company_id = blueprint.company_id
     and goal.is_primary
    where goal.goal is distinct from blueprint.owner_goal
       or goal.other_text is distinct from blueprint.owner_goal_other
  ) then
    raise exception 'company_goals backfill: a primary goal does not match company_blueprints';
  end if;
end;
$$;
