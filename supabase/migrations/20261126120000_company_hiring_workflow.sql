-- Stage 3.6: hiring paths, conversations, optional auditions, checklist, and
-- hiring outcomes. Local database only. Do not apply to hosted, staging, or
-- production until that apply is separately approved, and not before Stage 3.2
-- (20261122120000_company_recruiting_pages), Stage 3.3
-- (20261123120000_company_applicants), Stage 3.4
-- (20261124120000_company_video_interviews), and Stage 3.5
-- (20261125120000_company_applicant_review) are present in that environment.
--
-- Hosted apply order: Stage 3.2 recruiting pages, then Stage 3.3 applicants,
-- then Stage 3.4 interviews, then Stage 3.5 candidate review, then this
-- Stage 3.6 migration.
-- Do not enable live applicant collection until privacy and security controls
-- are verified. Stage 2 and Stage 3.1 hosted applies are not required for
-- local 3.6.
--
-- Hiring activities are owner-recorded. There is no automatic hire, reject,
-- message, staff-account creation, payroll record, or training enrollment.
-- W-2 / 1099 is owner-provided information, not a legal classification.
-- Auditions are optional and are not graded by AI.

create table public.company_applicant_hiring_paths (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  path_kind text not null,
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_hiring_paths_kind
    check (path_kind in ('beginner', 'experienced', 'custom'))
);

create unique index company_applicant_hiring_paths_application
  on public.company_applicant_hiring_paths (application_id);

create index company_applicant_hiring_paths_company
  on public.company_applicant_hiring_paths (company_id, updated_at desc);

create table public.company_applicant_hiring_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  activity_key text not null,
  title text not null,
  required boolean not null default true,
  sort_order integer not null,
  status text not null,
  skip_reason text,
  completed_at timestamptz,
  completed_by uuid references auth.users (id),
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_hiring_activities_key
    check (activity_key in (
      'review_application',
      'video_interview',
      'owner_conversation',
      'practical_audition',
      'hiring_decision',
      'training_handoff',
      'custom'
    )),
  constraint company_applicant_hiring_activities_title_len
    check (char_length(btrim(title)) between 1 and 80),
  constraint company_applicant_hiring_activities_status
    check (status in ('pending', 'complete', 'skipped')),
  constraint company_applicant_hiring_activities_skip_reason
    check (skip_reason is null or char_length(btrim(skip_reason)) between 1 and 400)
);

create index company_applicant_hiring_activities_application
  on public.company_applicant_hiring_activities (application_id, sort_order);

create index company_applicant_hiring_activities_company
  on public.company_applicant_hiring_activities (company_id, status);

create table public.company_applicant_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  conversation_type text not null,
  planned_at timestamptz,
  status text not null,
  notes text,
  next_action text,
  person_responsible text,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_conversations_type
    check (conversation_type in ('phone', 'video_call', 'in_person', 'other')),
  constraint company_applicant_conversations_status
    check (status in ('planned', 'completed', 'canceled', 'no_show')),
  constraint company_applicant_conversations_notes_len
    check (notes is null or char_length(btrim(notes)) between 1 and 4000),
  constraint company_applicant_conversations_next_action_len
    check (next_action is null or char_length(btrim(next_action)) between 1 and 200),
  constraint company_applicant_conversations_person_len
    check (person_responsible is null or char_length(btrim(person_responsible)) between 1 and 80)
);

create index company_applicant_conversations_application
  on public.company_applicant_conversations (application_id, planned_at);

create table public.company_applicant_auditions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  title text not null,
  description text,
  skills jsonb not null,
  scheduled_at timestamptz,
  location_or_format text,
  evaluator_name text,
  status text not null,
  notes text,
  skill_ratings jsonb not null,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicant_auditions_title_len
    check (char_length(btrim(title)) between 1 and 80),
  constraint company_applicant_auditions_description_len
    check (description is null or char_length(btrim(description)) between 1 and 800),
  constraint company_applicant_auditions_location_len
    check (location_or_format is null or char_length(btrim(location_or_format)) between 1 and 200),
  constraint company_applicant_auditions_evaluator_len
    check (evaluator_name is null or char_length(btrim(evaluator_name)) between 1 and 80),
  constraint company_applicant_auditions_notes_len
    check (notes is null or char_length(btrim(notes)) between 1 and 4000),
  constraint company_applicant_auditions_status
    check (status in ('planned', 'completed', 'canceled')),
  constraint company_applicant_auditions_skills_shape
    check (jsonb_typeof(skills) = 'array' and jsonb_array_length(skills) between 1 and 8),
  constraint company_applicant_auditions_ratings_shape
    check (jsonb_typeof(skill_ratings) = 'array' and jsonb_array_length(skill_ratings) between 1 and 8)
);

create index company_applicant_auditions_application
  on public.company_applicant_auditions (application_id, scheduled_at);

create table public.company_applicant_hiring_outcomes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  decision_id uuid references public.company_applicant_decisions (id) on delete set null,
  outcome text not null,
  intended_role text not null,
  planned_start_date date,
  engagement_model text not null,
  notes text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint company_applicant_hiring_outcomes_allowed
    check (outcome in ('hired', 'reversed', 'corrected')),
  constraint company_applicant_hiring_outcomes_role_len
    check (char_length(btrim(intended_role)) between 1 and 80),
  constraint company_applicant_hiring_outcomes_engagement
    check (engagement_model in ('w2', '1099', 'not_specified')),
  constraint company_applicant_hiring_outcomes_notes_len
    check (notes is null or char_length(btrim(notes)) between 1 and 400)
);

create index company_applicant_hiring_outcomes_application
  on public.company_applicant_hiring_outcomes (application_id, created_at desc);

create function public.company_applicant_hiring_paths_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id then
      raise exception 'hiring path snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_hiring_paths_touch
before insert or update on public.company_applicant_hiring_paths
for each row
execute function public.company_applicant_hiring_paths_touch();

create function public.company_applicant_hiring_activities_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id
       or new.activity_key is distinct from old.activity_key then
      raise exception 'hiring activity snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_hiring_activities_touch
before insert or update on public.company_applicant_hiring_activities
for each row
execute function public.company_applicant_hiring_activities_touch();

create function public.company_applicant_conversations_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id then
      raise exception 'conversation snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_conversations_touch
before insert or update on public.company_applicant_conversations
for each row
execute function public.company_applicant_conversations_touch();

create function public.company_applicant_auditions_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id then
      raise exception 'audition snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applicant_auditions_touch
before insert or update on public.company_applicant_auditions
for each row
execute function public.company_applicant_auditions_touch();

create function public.company_applicant_hiring_outcomes_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'hiring outcomes are append-only';
  end if;
  return new;
end;
$$;

create trigger company_applicant_hiring_outcomes_touch
before insert or update on public.company_applicant_hiring_outcomes
for each row
execute function public.company_applicant_hiring_outcomes_touch();

alter table public.company_applicant_hiring_paths enable row level security;
alter table public.company_applicant_hiring_activities enable row level security;
alter table public.company_applicant_conversations enable row level security;
alter table public.company_applicant_auditions enable row level security;
alter table public.company_applicant_hiring_outcomes enable row level security;

revoke all on table public.company_applicant_hiring_paths from public, anon, authenticated;
revoke all on table public.company_applicant_hiring_activities from public, anon, authenticated;
revoke all on table public.company_applicant_conversations from public, anon, authenticated;
revoke all on table public.company_applicant_auditions from public, anon, authenticated;
revoke all on table public.company_applicant_hiring_outcomes from public, anon, authenticated;

grant select, insert, update on table public.company_applicant_hiring_paths to authenticated;
grant select, insert, update on table public.company_applicant_hiring_activities to authenticated;
grant select, insert, update on table public.company_applicant_conversations to authenticated;
grant select, insert, update on table public.company_applicant_auditions to authenticated;
grant select, insert on table public.company_applicant_hiring_outcomes to authenticated;

create policy company_applicant_hiring_paths_owner_select
on public.company_applicant_hiring_paths
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_paths.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_paths.company_id)
);

create policy company_applicant_hiring_paths_owner_insert
on public.company_applicant_hiring_paths
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_paths.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_hiring_paths.application_id
      and application.company_id = company_applicant_hiring_paths.company_id
      and application.applicant_id = company_applicant_hiring_paths.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_paths.company_id)
);

create policy company_applicant_hiring_paths_owner_update
on public.company_applicant_hiring_paths
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_paths.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_paths.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_paths.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_paths.company_id)
);

create policy company_applicant_hiring_activities_owner_select
on public.company_applicant_hiring_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_activities.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_activities.company_id)
);

create policy company_applicant_hiring_activities_owner_insert
on public.company_applicant_hiring_activities
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_activities.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_hiring_activities.application_id
      and application.company_id = company_applicant_hiring_activities.company_id
      and application.applicant_id = company_applicant_hiring_activities.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_activities.company_id)
);

create policy company_applicant_hiring_activities_owner_update
on public.company_applicant_hiring_activities
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_activities.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_activities.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_activities.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_activities.company_id)
);

create policy company_applicant_conversations_owner_select
on public.company_applicant_conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_conversations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_conversations.company_id)
);

create policy company_applicant_conversations_owner_insert
on public.company_applicant_conversations
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_conversations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_conversations.application_id
      and application.company_id = company_applicant_conversations.company_id
      and application.applicant_id = company_applicant_conversations.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_conversations.company_id)
);

create policy company_applicant_conversations_owner_update
on public.company_applicant_conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_conversations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_conversations.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_conversations.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_conversations.company_id)
);

create policy company_applicant_auditions_owner_select
on public.company_applicant_auditions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_auditions.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_auditions.company_id)
);

create policy company_applicant_auditions_owner_insert
on public.company_applicant_auditions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_auditions.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_auditions.application_id
      and application.company_id = company_applicant_auditions.company_id
      and application.applicant_id = company_applicant_auditions.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_auditions.company_id)
);

create policy company_applicant_auditions_owner_update
on public.company_applicant_auditions
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_auditions.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_auditions.company_id)
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_auditions.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_auditions.company_id)
);

create policy company_applicant_hiring_outcomes_owner_select
on public.company_applicant_hiring_outcomes
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_outcomes.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_outcomes.company_id)
);

create policy company_applicant_hiring_outcomes_owner_insert
on public.company_applicant_hiring_outcomes
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_hiring_outcomes.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_applicant_hiring_outcomes.application_id
      and application.company_id = company_applicant_hiring_outcomes.company_id
      and application.applicant_id = company_applicant_hiring_outcomes.applicant_id
  )
  and public.is_guided_blueprint_company(company_applicant_hiring_outcomes.company_id)
);
