-- Stage 3.1: versioned recruitment strategies the owner can draft and approve.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved.
--
-- Independent of Stage 2.3 hosted applies. This table references companies
-- only. Growth-plan recommendations are optional application data, not a
-- foreign key. Pending 2.3A/2.3B hosted migrations do not block local 3.1.
--
-- Stage 1 answers stay in company_blueprint_answers. Saved goals stay in
-- company_goals. An approved strategy keeps the exact decisions the owner
-- approved, including older versions after inputs change.

create table public.company_recruitment_strategies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null,
  status text not null,
  source_fingerprint text not null,
  inputs jsonb not null,
  recommended jsonb not null,
  decisions jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_recruitment_strategies_version_positive
    check (version >= 1),
  constraint company_recruitment_strategies_status_allowed
    check (status in ('draft', 'approved', 'needs_review', 'superseded')),
  constraint company_recruitment_strategies_company_version
    unique (company_id, version),
  constraint company_recruitment_strategies_fingerprint_size
    check (char_length(source_fingerprint) <= 128),
  constraint company_recruitment_strategies_inputs_object
    check (jsonb_typeof(inputs) = 'object'),
  constraint company_recruitment_strategies_inputs_size
    check (octet_length(inputs::text) <= 8192),
  constraint company_recruitment_strategies_recommended_object
    check (jsonb_typeof(recommended) = 'object'),
  constraint company_recruitment_strategies_recommended_size
    check (octet_length(recommended::text) <= 65536),
  constraint company_recruitment_strategies_decisions_object
    check (jsonb_typeof(decisions) = 'object'),
  constraint company_recruitment_strategies_decisions_size
    check (octet_length(decisions::text) <= 8192),
  constraint company_recruitment_strategies_warnings_array
    check (jsonb_typeof(warnings) = 'array'),
  constraint company_recruitment_strategies_warnings_size
    check (octet_length(warnings::text) <= 8192),
  constraint company_recruitment_strategies_draft_has_no_stamp
    check (
      status <> 'draft'
      or (approved_by is null and approved_at is null)
    ),
  constraint company_recruitment_strategies_approved_has_stamp
    check (
      status not in ('approved', 'needs_review')
      or (approved_by is not null and approved_at is not null)
    )
);

create unique index company_recruitment_strategies_one_draft
  on public.company_recruitment_strategies (company_id)
  where status = 'draft';

create unique index company_recruitment_strategies_one_approved
  on public.company_recruitment_strategies (company_id)
  where status = 'approved';

create index company_recruitment_strategies_company_status
  on public.company_recruitment_strategies (company_id, status, version desc);

create function public.company_recruitment_strategies_touch()
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
      if new.inputs is distinct from old.inputs
         or new.recommended is distinct from old.recommended
         or new.decisions is distinct from old.decisions
         or new.source_fingerprint is distinct from old.source_fingerprint
         or new.warnings is distinct from old.warnings
         or new.approved_by is distinct from old.approved_by
         or new.approved_at is distinct from old.approved_at then
        raise exception 'approved recruitment strategies are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded recruitment strategies cannot change status';
      end if;
      if old.status = 'needs_review' and new.status not in ('needs_review', 'superseded') then
        raise exception 'a strategy that needs review cannot become current without a new version';
      end if;
      if old.status = 'approved' and new.status not in ('approved', 'needs_review', 'superseded') then
        raise exception 'an approved strategy can only need review or be superseded';
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

create trigger company_recruitment_strategies_touch
before insert or update on public.company_recruitment_strategies
for each row
execute function public.company_recruitment_strategies_touch();

alter table public.company_recruitment_strategies enable row level security;

revoke all on table public.company_recruitment_strategies from public, anon, authenticated;
grant select, insert, update, delete on table public.company_recruitment_strategies to authenticated;

create policy company_recruitment_strategies_owner_select
on public.company_recruitment_strategies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruitment_strategies.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruitment_strategies.company_id)
);

create policy company_recruitment_strategies_owner_insert
on public.company_recruitment_strategies
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruitment_strategies.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruitment_strategies.company_id)
);

create policy company_recruitment_strategies_owner_update
on public.company_recruitment_strategies
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruitment_strategies.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruitment_strategies.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruitment_strategies.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruitment_strategies.company_id)
);

create policy company_recruitment_strategies_owner_delete
on public.company_recruitment_strategies
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruitment_strategies.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruitment_strategies.company_id)
);
