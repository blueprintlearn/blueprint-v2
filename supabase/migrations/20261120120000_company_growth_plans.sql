-- Stage 2.3B: versioned growth plans the owner can draft, edit, and approve.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved.
--
-- Depends on 20261119120000_company_growth_planning (Stage 2.3A). Apply 2.3A
-- first, then this file. Neither migration should be pushed to a hosted
-- project without a named yes.
--
-- Why a table: an approved plan must keep the exact decisions the owner
-- approved, including older versions after inputs change. Follow-up answers
-- stay in company_growth_planning. Stage 1 answers stay in
-- company_blueprint_answers. Saved goals stay in company_goals.

create table public.company_growth_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null,
  status text not null,
  source_fingerprint text not null,
  recommended jsonb not null,
  decisions jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_growth_plans_version_positive
    check (version >= 1),
  constraint company_growth_plans_status_allowed
    check (status in ('draft', 'approved', 'needs_review', 'superseded')),
  constraint company_growth_plans_company_version
    unique (company_id, version),
  constraint company_growth_plans_fingerprint_size
    check (char_length(source_fingerprint) <= 128),
  constraint company_growth_plans_recommended_object
    check (jsonb_typeof(recommended) = 'object'),
  constraint company_growth_plans_recommended_size
    check (octet_length(recommended::text) <= 32768),
  constraint company_growth_plans_decisions_object
    check (jsonb_typeof(decisions) = 'object'),
  constraint company_growth_plans_decisions_size
    check (octet_length(decisions::text) <= 8192),
  constraint company_growth_plans_warnings_array
    check (jsonb_typeof(warnings) = 'array'),
  constraint company_growth_plans_warnings_size
    check (octet_length(warnings::text) <= 8192),
  constraint company_growth_plans_draft_has_no_stamp
    check (
      status <> 'draft'
      or (approved_by is null and approved_at is null)
    ),
  constraint company_growth_plans_approved_has_stamp
    check (
      status not in ('approved', 'needs_review')
      or (approved_by is not null and approved_at is not null)
    )
);

create unique index company_growth_plans_one_draft
  on public.company_growth_plans (company_id)
  where status = 'draft';

create unique index company_growth_plans_one_approved
  on public.company_growth_plans (company_id)
  where status = 'approved';

create index company_growth_plans_company_status
  on public.company_growth_plans (company_id, status, version desc);

create function public.company_growth_plans_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
    if new.version is distinct from old.version then
      raise exception 'version cannot change';
    end if;
    if old.status in ('approved', 'needs_review', 'superseded') then
      if new.recommended is distinct from old.recommended
         or new.decisions is distinct from old.decisions
         or new.source_fingerprint is distinct from old.source_fingerprint
         or new.warnings is distinct from old.warnings
         or new.approved_by is distinct from old.approved_by
         or new.approved_at is distinct from old.approved_at then
        raise exception 'approved growth plans are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded growth plans cannot change status';
      end if;
      if old.status = 'needs_review' and new.status not in ('needs_review', 'superseded') then
        raise exception 'a plan that needs review cannot become current without a new version';
      end if;
      if old.status = 'approved' and new.status not in ('approved', 'needs_review', 'superseded') then
        raise exception 'an approved plan can only need review or be superseded';
      end if;
    end if;
  end if;

  if new.status = 'draft' then
    new.approved_by := null;
    new.approved_at := null;
  elsif new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_by := coalesce(auth.uid(), new.approved_by);
    new.approved_at := now();
    if new.approved_by is null then
      raise exception 'approved_by is required';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_growth_plans_touch
before insert or update on public.company_growth_plans
for each row
execute function public.company_growth_plans_touch();

alter table public.company_growth_plans enable row level security;

revoke all on table public.company_growth_plans from public, anon, authenticated;
grant select, insert, update, delete on table public.company_growth_plans to authenticated;

create policy company_growth_plans_owner_select
on public.company_growth_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_plans.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_plans.company_id)
);

create policy company_growth_plans_owner_insert
on public.company_growth_plans
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_plans.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_plans.company_id)
);

create policy company_growth_plans_owner_update
on public.company_growth_plans
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_plans.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_plans.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_plans.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_plans.company_id)
);

create policy company_growth_plans_owner_delete
on public.company_growth_plans
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_growth_plans.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_growth_plans.company_id)
);
