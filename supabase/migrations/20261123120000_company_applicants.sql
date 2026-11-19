-- Stage 3.3: applicants, applications, private notes, and pipeline history.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved, and not before Stage 3.2
-- (20261122120000_company_recruiting_pages) is present in that environment.
--
-- Independent of Stage 2 and Stage 3.1 hosted applies. Tables reference
-- companies only. Recruiting page and strategy ids are application data, not
-- foreign keys. Pending hosted migrations do not block local 3.3.
--
-- Public applicants insert only through submit_recruiting_application, which
-- requires a currently published recruiting page. Owners read their own
-- pipeline. Anon cannot list or read applicants.

create table public.company_applicants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  phone text not null,
  location text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applicants_first_name_len
    check (char_length(btrim(first_name)) between 1 and 80),
  constraint company_applicants_last_name_len
    check (char_length(btrim(last_name)) between 1 and 80),
  constraint company_applicants_email_len
    check (char_length(email) between 3 and 254),
  constraint company_applicants_email_shape
    check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint company_applicants_phone_len
    check (char_length(btrim(phone)) between 7 and 32),
  constraint company_applicants_location_len
    check (char_length(btrim(location)) between 1 and 120)
);

create unique index company_applicants_company_email
  on public.company_applicants (company_id, email_normalized);

create index company_applicants_company_name
  on public.company_applicants (company_id, lower(last_name), lower(first_name));

create table public.company_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  recruiting_page_id uuid not null,
  page_version integer not null,
  slug text not null,
  source_strategy_id uuid,
  source_strategy_version integer,
  role_title text not null,
  stage text not null,
  answers jsonb not null,
  idempotency_key uuid not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_applications_page_version
    check (page_version >= 1),
  constraint company_applications_strategy_version
    check (source_strategy_version is null or source_strategy_version >= 1),
  constraint company_applications_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  constraint company_applications_role_title_len
    check (char_length(btrim(role_title)) between 1 and 80),
  constraint company_applications_stage_allowed
    check (stage in (
      'new_application',
      'screening',
      'interview',
      'decision',
      'hired',
      'rejected'
    )),
  constraint company_applications_answers_object
    check (jsonb_typeof(answers) = 'object'),
  constraint company_applications_answers_size
    check (octet_length(answers::text) <= 32768)
);

create unique index company_applications_idempotency
  on public.company_applications (idempotency_key);

create index company_applications_company_stage
  on public.company_applications (company_id, stage, submitted_at desc);

create index company_applications_company_page
  on public.company_applications (company_id, recruiting_page_id, submitted_at desc);

create index company_applications_applicant
  on public.company_applications (applicant_id, submitted_at desc);

create table public.company_applicant_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  application_id uuid references public.company_applications (id) on delete cascade,
  body text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint company_applicant_notes_body_len
    check (char_length(btrim(body)) between 1 and 4000)
);

create index company_applicant_notes_applicant
  on public.company_applicant_notes (applicant_id, created_at desc);

create table public.company_applicant_stage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  constraint company_applicant_stage_events_from_allowed
    check (
      from_stage is null
      or from_stage in (
        'new_application',
        'screening',
        'interview',
        'decision',
        'hired',
        'rejected'
      )
    ),
  constraint company_applicant_stage_events_to_allowed
    check (to_stage in (
      'new_application',
      'screening',
      'interview',
      'decision',
      'hired',
      'rejected'
    ))
);

create index company_applicant_stage_events_application
  on public.company_applicant_stage_events (application_id, changed_at);

create table public.company_application_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint company_application_attempts_hash_len
    check (char_length(ip_hash) between 8 and 128),
  constraint company_application_attempts_slug_len
    check (char_length(slug) between 1 and 48)
);

create index company_application_attempts_ip_created
  on public.company_application_attempts (ip_hash, created_at desc);

create function public.company_applications_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.applicant_id is distinct from old.applicant_id
       or new.recruiting_page_id is distinct from old.recruiting_page_id
       or new.page_version is distinct from old.page_version
       or new.slug is distinct from old.slug
       or new.source_strategy_id is distinct from old.source_strategy_id
       or new.source_strategy_version is distinct from old.source_strategy_version
       or new.role_title is distinct from old.role_title
       or new.answers is distinct from old.answers
       or new.idempotency_key is distinct from old.idempotency_key
       or new.submitted_at is distinct from old.submitted_at then
      raise exception 'application records are read-only except stage';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_applications_touch
before insert or update on public.company_applications
for each row
execute function public.company_applications_touch();

create function public.company_applications_record_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.company_applicant_stage_events (
      company_id, application_id, from_stage, to_stage, changed_by
    ) values (
      new.company_id, new.id, null, new.stage, null
    );
  elsif new.stage is distinct from old.stage then
    insert into public.company_applicant_stage_events (
      company_id, application_id, from_stage, to_stage, changed_by
    ) values (
      new.company_id, new.id, old.stage, new.stage, auth.uid()
    );
  end if;
  return null;
end;
$$;

create trigger company_applications_record_stage
after insert or update of stage on public.company_applications
for each row
execute function public.company_applications_record_stage();

create function public.company_applicants_touch()
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

create trigger company_applicants_touch
before insert or update on public.company_applicants
for each row
execute function public.company_applicants_touch();

create function public.submit_recruiting_application(
  p_slug text,
  p_idempotency_key uuid,
  p_payload jsonb,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  page record;
  owner_questions jsonb;
  owner_answers jsonb;
  answers jsonb;
  applicant_id uuid;
  attempt_hash text;
  question jsonb;
  idx integer;
  prompt text;
  answer text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) not between 3 and 48 then
    return jsonb_build_object('ok', false, 'error', 'not_accepting');
  end if;
  if p_idempotency_key is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 16384 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if coalesce(p_payload->>'website', '') <> '' then
    return jsonb_build_object('ok', true);
  end if;

  attempt_hash := coalesce(nullif(btrim(p_ip_hash), ''), 'missing');
  if char_length(attempt_hash) > 128 then
    attempt_hash := left(attempt_hash, 128);
  end if;

  delete from public.company_application_attempts
  where company_application_attempts.ip_hash = attempt_hash
    and company_application_attempts.created_at < now() - interval '2 days';

  insert into public.company_application_attempts (ip_hash, slug)
  values (attempt_hash, p_slug);

  if (
    select count(*)
    from public.company_application_attempts as attempt
    where attempt.ip_hash = attempt_hash
      and attempt.created_at > now() - interval '1 hour'
  ) > 8 then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  if exists (
    select 1
    from public.company_applications as application
    where application.idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('ok', true);
  end if;

  select
    recruiting.id,
    recruiting.company_id,
    recruiting.version,
    recruiting.slug,
    recruiting.source_strategy_id,
    recruiting.source_strategy_version,
    recruiting.page_content
  into page
  from public.company_recruiting_pages as recruiting
  where recruiting.slug = p_slug
    and recruiting.status = 'published'
  limit 1;

  if page.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_accepting');
  end if;

  if coalesce(p_payload->>'consent', '') <> '1' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if char_length(btrim(coalesce(p_payload->>'firstName', ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_payload->>'lastName', ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_payload->>'email', ''))) not between 3 and 254
     or btrim(coalesce(p_payload->>'email', '')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(btrim(coalesce(p_payload->>'phone', ''))) not between 7 and 32
     or char_length(btrim(coalesce(p_payload->>'location', ''))) not between 1 and 120
     or char_length(btrim(coalesce(p_payload->>'availability', ''))) not between 1 and 2000
     or char_length(btrim(coalesce(p_payload->>'experience', ''))) not between 1 and 2000
     or char_length(btrim(coalesce(p_payload->>'motivation', ''))) not between 1 and 2000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  owner_questions := coalesce(page.page_content->'applicationQuestions', '[]'::jsonb);
  if jsonb_typeof(owner_questions) <> 'array' or jsonb_array_length(owner_questions) > 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  owner_answers := coalesce(p_payload->'ownerAnswers', '[]'::jsonb);
  if jsonb_typeof(owner_answers) <> 'array'
     or jsonb_array_length(owner_answers) is distinct from jsonb_array_length(owner_questions) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  answers := jsonb_build_object(
    'firstName', btrim(p_payload->>'firstName'),
    'lastName', btrim(p_payload->>'lastName'),
    'email', lower(btrim(p_payload->>'email')),
    'phone', btrim(p_payload->>'phone'),
    'location', btrim(p_payload->>'location'),
    'availability', btrim(p_payload->>'availability'),
    'experience', btrim(p_payload->>'experience'),
    'motivation', btrim(p_payload->>'motivation'),
    'consentAccepted', true,
    'ownerQuestions', '[]'::jsonb
  );

  idx := 0;
  for question in select value from jsonb_array_elements(owner_questions) as value
  loop
    if jsonb_typeof(question) <> 'string' then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    prompt := btrim(question #>> '{}');
    answer := btrim(coalesce(owner_answers->>idx, ''));
    if char_length(prompt) not between 1 and 200 or char_length(answer) not between 1 and 2000 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    answers := jsonb_set(
      answers,
      '{ownerQuestions}',
      (answers->'ownerQuestions') || jsonb_build_array(jsonb_build_object('prompt', prompt, 'answer', answer))
    );
    idx := idx + 1;
  end loop;

  insert into public.company_applicants (
    company_id, first_name, last_name, email, phone, location
  ) values (
    page.company_id,
    btrim(p_payload->>'firstName'),
    btrim(p_payload->>'lastName'),
    lower(btrim(p_payload->>'email')),
    btrim(p_payload->>'phone'),
    btrim(p_payload->>'location')
  )
  on conflict (company_id, email_normalized)
  do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    location = excluded.location,
    updated_at = now()
  returning public.company_applicants.id into applicant_id;

  insert into public.company_applications (
    company_id,
    applicant_id,
    recruiting_page_id,
    page_version,
    slug,
    source_strategy_id,
    source_strategy_version,
    role_title,
    stage,
    answers,
    idempotency_key
  ) values (
    page.company_id,
    applicant_id,
    page.id,
    page.version,
    page.slug,
    page.source_strategy_id,
    page.source_strategy_version,
    coalesce(nullif(btrim(page.page_content->>'roleTitle'), ''), 'DJ'),
    'new_application',
    answers,
    p_idempotency_key
  );

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', true);
  when others then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

alter table public.company_applicants enable row level security;
alter table public.company_applications enable row level security;
alter table public.company_applicant_notes enable row level security;
alter table public.company_applicant_stage_events enable row level security;
alter table public.company_application_attempts enable row level security;

revoke all on table public.company_applicants from public, anon, authenticated;
revoke all on table public.company_applications from public, anon, authenticated;
revoke all on table public.company_applicant_notes from public, anon, authenticated;
revoke all on table public.company_applicant_stage_events from public, anon, authenticated;
revoke all on table public.company_application_attempts from public, anon, authenticated;

grant select on table public.company_applicants to authenticated;
grant select, update on table public.company_applications to authenticated;
grant select, insert on table public.company_applicant_notes to authenticated;
grant select on table public.company_applicant_stage_events to authenticated;

revoke all on function public.submit_recruiting_application(text, uuid, jsonb, text) from public;
grant execute on function public.submit_recruiting_application(text, uuid, jsonb, text) to anon, authenticated;

create policy company_applicants_owner_select
on public.company_applicants
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicants.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicants.company_id)
);

create policy company_applications_owner_select
on public.company_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applications.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applications.company_id)
);

create policy company_applications_owner_update
on public.company_applications
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applications.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applications.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applications.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applications.company_id)
);

create policy company_applicant_notes_owner_select
on public.company_applicant_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_notes.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_notes.company_id)
);

create policy company_applicant_notes_owner_insert
on public.company_applicant_notes
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_notes.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applicants as applicant
    where applicant.id = company_applicant_notes.applicant_id
      and applicant.company_id = company_applicant_notes.company_id
  )
  and public.is_guided_blueprint_company(company_applicant_notes.company_id)
);

create policy company_applicant_stage_events_owner_select
on public.company_applicant_stage_events
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_applicant_stage_events.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_applicant_stage_events.company_id)
);
