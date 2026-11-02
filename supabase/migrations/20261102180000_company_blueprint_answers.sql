-- Slice 3: answer states and stored resume position.
-- Approval 1 covers this design only. Do not apply to staging or production
-- without the matching named approval.
--
-- Additive only: no backfill, no status column, and no change to existing
-- tables, policies, functions or triggers.
--
-- Production-release blocker (S2-7 / D-6): company_blueprint_answers and
-- company_blueprint_progress are granted to authenticated with owner-only RLS.
-- The server actions check BLUEPRINT_GUIDED_COMPANY_IDS; the database cannot
-- see the switch. An authenticated owner can write these tables directly and
-- bypass the rollout restriction. The same class of bypass already exists on
-- save_company_goals. A production fix must cover all three write paths. That
-- is not accepted as a permanent security design. Do not apply this migration
-- to production, and do not release Slice 3, until it is resolved through its
-- own reviewed change.

create type public.answer_state as enum ('answered', 'estimated', 'skipped');

create table public.company_blueprint_answers (
  company_id uuid not null references public.companies (id) on delete cascade,
  question_key text not null,
  value jsonb,
  state public.answer_state not null,
  question_version smallint not null,
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, question_key),
  constraint company_blueprint_answers_question_key_format
    check (question_key ~ '^[A-Z]{1,2}[0-9]{1,2}[a-z]?$'),
  constraint company_blueprint_answers_no_financial
    check (question_key !~ '^N'),
  constraint company_blueprint_answers_value_for_state
    check (
      (state = 'skipped' and value is null)
      or (state in ('answered', 'estimated') and value is not null)
    ),
  constraint company_blueprint_answers_value_size
    check (value is null or octet_length(value::text) <= 4096),
  constraint company_blueprint_answers_question_version
    check (question_version >= 1)
);

create table public.company_blueprint_progress (
  company_id uuid primary key references public.companies (id) on delete cascade,
  last_section text not null,
  last_question_key text,
  updated_at timestamptz not null default now(),
  constraint company_blueprint_progress_section
    check (
      last_section in (
        'goals',
        'team',
        'events',
        'services',
        'numbers',
        'development',
        'ideal-dj',
        'review'
      )
    ),
  constraint company_blueprint_progress_question_key_format
    check (
      last_question_key is null
      or last_question_key ~ '^[A-Z]{1,2}[0-9]{1,2}[a-z]?$'
    )
);

create function public.company_blueprint_answers_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
    if new.question_key is distinct from old.question_key then
      raise exception 'question_key cannot change';
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

create trigger company_blueprint_answers_touch
before insert or update on public.company_blueprint_answers
for each row
execute function public.company_blueprint_answers_touch();

create function public.company_blueprint_progress_touch()
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

create trigger company_blueprint_progress_touch
before insert or update on public.company_blueprint_progress
for each row
execute function public.company_blueprint_progress_touch();

alter table public.company_blueprint_answers enable row level security;
alter table public.company_blueprint_progress enable row level security;

revoke all on table public.company_blueprint_answers from public, anon, authenticated;
revoke all on table public.company_blueprint_progress from public, anon, authenticated;
grant select, insert, update, delete on table public.company_blueprint_answers to authenticated;
grant select, insert, update on table public.company_blueprint_progress to authenticated;
grant usage on type public.answer_state to authenticated;

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
);

revoke all on function public.company_blueprint_answers_touch() from public, anon, authenticated;
revoke all on function public.company_blueprint_progress_touch() from public, anon, authenticated;
