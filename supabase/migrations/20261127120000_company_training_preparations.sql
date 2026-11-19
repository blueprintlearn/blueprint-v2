-- Stage 3.7: owner-approved training preparation handoff from hiring.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved, and not before Stage 3.2
-- (20261122120000_company_recruiting_pages), Stage 3.3
-- (20261123120000_company_applicants), Stage 3.4
-- (20261124120000_company_video_interviews), Stage 3.5
-- (20261125120000_company_applicant_review), and Stage 3.6
-- (20261126120000_company_hiring_workflow) are present in that environment.
--
-- Hosted apply order: Stage 3.2 recruiting pages, then Stage 3.3 applicants,
-- then Stage 3.4 interviews, then Stage 3.5 candidate review, then Stage 3.6
-- hiring workflow, then this Stage 3.7 migration.
-- Do not enable live applicant collection until privacy and security controls
-- are verified. Stage 2 and Stage 3.1 hosted applies are not required for
-- local 3.7.
--
-- Preparation records are owner-approved. There is no trainee account,
-- course assignment, lesson progress, invitation, or certification.

create table public.company_applicant_training_preparations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  version integer not null,
  status text not null,
  source_outcome_id uuid references public.company_applicant_hiring_outcomes (id) on delete set null,
  intended_role text not null,
  experience_level text not null,
  training_approach text not null,
  suggested_approach text not null,
  skills_demonstrated jsonb not null default '[]'::jsonb,
  skills_needing_development jsonb not null default '[]'::jsonb,
  skills_needing_verification jsonb not null default '[]'::jsonb,
  starting_goals jsonb not null default '[]'::jsonb,
  planned_start_date date,
  owner_notes text,
  evidence jsonb not null default '{}'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_training_preparations_version_positive
    check (version >= 1),
  constraint company_applicant_training_preparations_status
    check (status in ('draft', 'approved', 'superseded')),
  constraint company_applicant_training_preparations_role_len
    check (char_length(btrim(intended_role)) between 1 and 80),
  constraint company_applicant_training_preparations_experience
    check (experience_level in ('beginner', 'experienced', 'custom')),
  constraint company_applicant_training_preparations_approach
    check (training_approach in ('full', 'standardization', 'custom')),
  constraint company_applicant_training_preparations_suggested
    check (suggested_approach in ('full', 'standardization', 'custom')),
  constraint company_applicant_training_preparations_notes_len
    check (owner_notes is null or char_length(btrim(owner_notes)) between 1 and 400),
  constraint company_applicant_training_preparations_lists
    check (
      jsonb_typeof(skills_demonstrated) = 'array'
      and jsonb_array_length(skills_demonstrated) <= 8
      and jsonb_typeof(skills_needing_development) = 'array'
      and jsonb_array_length(skills_needing_development) <= 8
      and jsonb_typeof(skills_needing_verification) = 'array'
      and jsonb_array_length(skills_needing_verification) <= 8
      and jsonb_typeof(starting_goals) = 'array'
      and jsonb_array_length(starting_goals) <= 8
      and jsonb_typeof(missing_information) = 'array'
      and jsonb_typeof(evidence) = 'object'
    ),
  constraint company_applicant_training_preparations_draft_stamp
    check (status <> 'draft' or (approved_by is null and approved_at is null)),
  constraint company_applicant_training_preparations_approved_stamp
    check (
      status not in ('approved', 'superseded')
      or (approved_by is not null and approved_at is not null)
    )
);

create unique index company_applicant_training_preparations_application_version
  on public.company_applicant_training_preparations (application_id, version);

create unique index company_applicant_training_preparations_one_draft
  on public.company_applicant_training_preparations (application_id)
  where status = 'draft';

create unique index company_applicant_training_preparations_one_approved
  on public.company_applicant_training_preparations (application_id)
  where status = 'approved';

create index company_applicant_training_preparations_company
  on public.company_applicant_training_preparations (company_id, status, version desc);

create function public.company_applicant_training_preparations_touch()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  latest_outcome text;
begin
  if tg_op = 'INSERT'
     or new.status = 'approved'
     or (tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'draft') then
    latest_outcome := (
      select outcome.outcome
      from public.company_applicant_hiring_outcomes as outcome
      where outcome.application_id = new.application_id
        and outcome.company_id = new.company_id
      order by outcome.created_at desc
      limit 1
    );
    if latest_outcome is distinct from 'hired' and latest_outcome is distinct from 'corrected' then
      raise exception 'training preparation requires a current hired outcome';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id
       or new.version is distinct from old.version then
      raise exception 'training preparation snapshot fields are frozen';
    end if;
    if old.status in ('approved', 'superseded') then
      if new.intended_role is distinct from old.intended_role
         or new.experience_level is distinct from old.experience_level
         or new.training_approach is distinct from old.training_approach
         or new.suggested_approach is distinct from old.suggested_approach
         or new.skills_demonstrated is distinct from old.skills_demonstrated
         or new.skills_needing_development is distinct from old.skills_needing_development
         or new.skills_needing_verification is distinct from old.skills_needing_verification
         or new.starting_goals is distinct from old.starting_goals
         or new.planned_start_date is distinct from old.planned_start_date
         or new.owner_notes is distinct from old.owner_notes
         or new.evidence is distinct from old.evidence
         or new.missing_information is distinct from old.missing_information
         or new.source_outcome_id is distinct from old.source_outcome_id
         or new.approved_by is distinct from old.approved_by
         or new.approved_at is distinct from old.approved_at then
        raise exception 'approved training preparations are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded training preparations cannot change status';
      end if;
      if old.status = 'approved' and new.status not in ('approved', 'superseded') then
        raise exception 'an approved preparation can only be superseded';
      end if;
    end if;
  end if;

  if new.status = 'draft' then
    new.approved_by := null;
    new.approved_at := null;
  elsif new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_by := coalesce(auth.uid(), new.approved_by);
    new.approved_at := coalesce(new.approved_at, now());
    if new.approved_by is null then
      raise exception 'approved_by is required';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_training_preparations_touch
before insert or update on public.company_applicant_training_preparations
for each row
execute function public.company_applicant_training_preparations_touch();

alter table public.company_applicant_training_preparations enable row level security;

revoke all on table public.company_applicant_training_preparations from public, anon, authenticated;
grant select, insert, update on table public.company_applicant_training_preparations to authenticated;

create policy company_applicant_training_preparations_owner_select
on public.company_applicant_training_preparations
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_training_preparations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_training_preparations.company_id)
);

create policy company_applicant_training_preparations_owner_insert
on public.company_applicant_training_preparations
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_training_preparations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_training_preparations.application_id
      and application.company_id = company_applicant_training_preparations.company_id
      and application.applicant_id = company_applicant_training_preparations.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_training_preparations.company_id)
);

create policy company_applicant_training_preparations_owner_update
on public.company_applicant_training_preparations
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_training_preparations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_training_preparations.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_training_preparations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_training_preparations.company_id)
);
