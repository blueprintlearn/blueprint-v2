-- Stage 3.5: human evaluation scorecards, owner decisions, and follow-ups.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved, and not before Stage 3.2
-- (20261122120000_company_recruiting_pages), Stage 3.3
-- (20261123120000_company_applicants), and Stage 3.4
-- (20261124120000_company_video_interviews) are present in that environment.
--
-- Hosted apply order: Stage 3.2 recruiting pages, then Stage 3.3 applicants,
-- then Stage 3.4 interviews, then this Stage 3.5 migration.
-- Do not enable live applicant collection until privacy and security controls
-- are verified. Stage 2 and Stage 3.1 hosted applies are not required for
-- local 3.5.
--
-- Ratings are entered by a person. There is no overall score, ranking,
-- automated rejection, messaging, or staff-account conversion.

create table public.company_evaluation_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  slug text not null,
  categories jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_evaluation_templates_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  constraint company_evaluation_templates_categories_shape
    check (jsonb_typeof(categories) = 'array' and jsonb_array_length(categories) between 3 and 8)
);

create unique index company_evaluation_templates_company_slug
  on public.company_evaluation_templates (company_id, slug);

create table public.company_applicant_evaluations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  categories jsonb not null,
  ratings jsonb not null,
  completed_at timestamptz,
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_evaluations_categories_shape
    check (jsonb_typeof(categories) = 'array' and jsonb_array_length(categories) between 3 and 8),
  constraint company_applicant_evaluations_ratings_shape
    check (jsonb_typeof(ratings) = 'array' and jsonb_array_length(ratings) between 3 and 8)
);

create unique index company_applicant_evaluations_application
  on public.company_applicant_evaluations (application_id);

create index company_applicant_evaluations_company
  on public.company_applicant_evaluations (company_id, updated_at desc);

create table public.company_applicant_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  decision text not null,
  reason text,
  from_stage text,
  to_stage text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint company_applicant_decisions_allowed
    check (decision in ('advance', 'hold', 'reject', 'hired')),
  constraint company_applicant_decisions_reason_len
    check (reason is null or char_length(btrim(reason)) between 1 and 400),
  constraint company_applicant_decisions_from_stage
    check (
      from_stage is null
      or from_stage in ('new_application', 'screening', 'interview', 'decision', 'hired', 'rejected')
    ),
  constraint company_applicant_decisions_to_stage
    check (to_stage in ('new_application', 'screening', 'interview', 'decision', 'hired', 'rejected'))
);

create index company_applicant_decisions_application
  on public.company_applicant_decisions (application_id, created_at desc);

create table public.company_applicant_follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  action text not null,
  due_on date,
  status text not null,
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_follow_ups_action
    check (action in (
      'schedule_conversation',
      'request_info',
      'review_video',
      'discuss_manager',
      'make_decision'
    )),
  constraint company_applicant_follow_ups_status
    check (status in ('pending', 'done'))
);

create unique index company_applicant_follow_ups_application
  on public.company_applicant_follow_ups (application_id);

create index company_applicant_follow_ups_company_pending
  on public.company_applicant_follow_ups (company_id, status, due_on);

create function public.company_evaluation_templates_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot change';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_evaluation_templates_touch
before insert or update on public.company_evaluation_templates
for each row
execute function public.company_evaluation_templates_touch();

create function public.company_applicant_evaluations_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id
       or new.categories is distinct from old.categories then
      raise exception 'evaluation snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_evaluations_touch
before insert or update on public.company_applicant_evaluations
for each row
execute function public.company_applicant_evaluations_touch();

create function public.company_applicant_decisions_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'decisions are append-only';
  end if;
  return new;
end;
$$;

create trigger company_applicant_decisions_touch
before insert or update on public.company_applicant_decisions
for each row
execute function public.company_applicant_decisions_touch();

create function public.company_applicant_follow_ups_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id then
      raise exception 'follow-up snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_follow_ups_touch
before insert or update on public.company_applicant_follow_ups
for each row
execute function public.company_applicant_follow_ups_touch();

alter table public.company_evaluation_templates enable row level security;
alter table public.company_applicant_evaluations enable row level security;
alter table public.company_applicant_decisions enable row level security;
alter table public.company_applicant_follow_ups enable row level security;

revoke all on table public.company_evaluation_templates from public, anon, authenticated;
revoke all on table public.company_applicant_evaluations from public, anon, authenticated;
revoke all on table public.company_applicant_decisions from public, anon, authenticated;
revoke all on table public.company_applicant_follow_ups from public, anon, authenticated;

grant select, insert, update on table public.company_evaluation_templates to authenticated;
grant select, insert, update on table public.company_applicant_evaluations to authenticated;
grant select, insert on table public.company_applicant_decisions to authenticated;
grant select, insert, update on table public.company_applicant_follow_ups to authenticated;

create policy company_evaluation_templates_owner_select
on public.company_evaluation_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_evaluation_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_evaluation_templates.company_id)
);

create policy company_evaluation_templates_owner_insert
on public.company_evaluation_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_evaluation_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_evaluation_templates.company_id)
);

create policy company_evaluation_templates_owner_update
on public.company_evaluation_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_evaluation_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_evaluation_templates.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_evaluation_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_evaluation_templates.company_id)
);

create policy company_applicant_evaluations_owner_select
on public.company_applicant_evaluations
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_evaluations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_evaluations.company_id)
);

create policy company_applicant_evaluations_owner_insert
on public.company_applicant_evaluations
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_evaluations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_evaluations.application_id
      and application.company_id = company_applicant_evaluations.company_id
      and application.applicant_id = company_applicant_evaluations.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_evaluations.company_id)
);

create policy company_applicant_evaluations_owner_update
on public.company_applicant_evaluations
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_evaluations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_evaluations.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_evaluations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_evaluations.company_id)
);

create policy company_applicant_decisions_owner_select
on public.company_applicant_decisions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_decisions.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_decisions.company_id)
);

create policy company_applicant_decisions_owner_insert
on public.company_applicant_decisions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_decisions.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_decisions.application_id
      and application.company_id = company_applicant_decisions.company_id
      and application.applicant_id = company_applicant_decisions.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_decisions.company_id)
);

create policy company_applicant_follow_ups_owner_select
on public.company_applicant_follow_ups
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_follow_ups.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_follow_ups.company_id)
);

create policy company_applicant_follow_ups_owner_insert
on public.company_applicant_follow_ups
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_follow_ups.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_follow_ups.application_id
      and application.company_id = company_applicant_follow_ups.company_id
      and application.applicant_id = company_applicant_follow_ups.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_follow_ups.company_id)
);

create policy company_applicant_follow_ups_owner_update
on public.company_applicant_follow_ups
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_follow_ups.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_follow_ups.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_follow_ups.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_follow_ups.company_id)
);
