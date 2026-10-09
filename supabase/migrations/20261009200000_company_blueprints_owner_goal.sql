create type public.owner_goal_code as enum (
  'dj_less',
  'stop_djing',
  'scale',
  'expand',
  'improve_quality',
  'create_leadership',
  'other'
);

create table public.company_blueprints (
  company_id uuid primary key references public.companies (id) on delete cascade,
  owner_goal public.owner_goal_code not null,
  owner_goal_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_blueprints_other_required check (
    (
      owner_goal = 'other'
      and owner_goal_other is not null
      and length(trim(owner_goal_other)) between 1 and 80
    )
    or (
      owner_goal <> 'other'
      and owner_goal_other is null
    )
  )
);

alter table public.company_blueprints enable row level security;

revoke all on table public.company_blueprints from public, anon, authenticated;
grant select, insert, update on table public.company_blueprints to authenticated;

create policy blueprints_select_member
on public.company_blueprints
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprints.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

create policy blueprints_insert_owner
on public.company_blueprints
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprints.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
);

create policy blueprints_update_owner
on public.company_blueprints
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprints.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_blueprints.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
);

create function public.reject_company_blueprint_company_id_change()
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

create trigger company_blueprints_lock_company_id
before update on public.company_blueprints
for each row
execute function public.reject_company_blueprint_company_id_change();

revoke all on function public.reject_company_blueprint_company_id_change() from public, anon, authenticated;
