-- Stage 2.3A: growth-planning follow-up answers, stored apart from Stage 1.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved.
--
-- Why a table: follow-up planning inputs must persist, and they must not be
-- written to company_blueprint_answers. Writes there invalidate the approved
-- Stage 1 snapshot. This table is owner-only and requires the guided allowlist.

create table public.company_growth_planning (
  company_id uuid primary key references public.companies (id) on delete cascade,
  inputs jsonb not null default '{}'::jsonb,
  recommendation_response jsonb,
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_growth_planning_inputs_object
    check (jsonb_typeof(inputs) = 'object'),
  constraint company_growth_planning_inputs_size
    check (octet_length(inputs::text) <= 8192),
  constraint company_growth_planning_response_object
    check (
      recommendation_response is null
      or jsonb_typeof(recommendation_response) = 'object'
    ),
  constraint company_growth_planning_response_size
    check (
      recommendation_response is null
      or octet_length(recommendation_response::text) <= 4096
    )
);

create function public.company_growth_planning_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.updated_by is null then
    raise exception 'updated_by is required';
  end if;

  return new;
end;
$$;

create trigger company_growth_planning_touch
before insert or update on public.company_growth_planning
for each row
execute function public.company_growth_planning_touch();

alter table public.company_growth_planning enable row level security;

revoke all on table public.company_growth_planning from public, anon, authenticated;
grant select, insert, update, delete on table public.company_growth_planning to authenticated;

create policy company_growth_planning_owner_select
on public.company_growth_planning
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_planning.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_planning.company_id)
);

create policy company_growth_planning_owner_insert
on public.company_growth_planning
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_planning.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_planning.company_id)
);

create policy company_growth_planning_owner_update
on public.company_growth_planning
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_planning.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_planning.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_planning.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_planning.company_id)
);

create policy company_growth_planning_owner_delete
on public.company_growth_planning
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_planning.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_planning.company_id)
);
