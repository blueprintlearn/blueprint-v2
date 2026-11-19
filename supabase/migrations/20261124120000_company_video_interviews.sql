-- Stage 3.4: one-way video interviews, frozen question snapshots, private
-- storage, and processing state.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved, and not before Stage 3.2
-- (20261122120000_company_recruiting_pages) and Stage 3.3
-- (20261123120000_company_applicants) are present in that environment.
--
-- Hosted apply order: Stage 3.2 recruiting pages, then Stage 3.3 applicants,
-- then this Stage 3.4 migration. Do not enable live applicant interviews until
-- hosted storage, privacy, retention, and security controls are verified.
--
-- Independent of Stage 2 and Stage 3.1 hosted applies. Tables reference
-- companies and Stage 3.3 applicant rows. Pending hosted migrations do not
-- block local 3.4.
--
-- Invitation tokens are stored as sha256 hashes. Anon never lists or reads
-- videos. Owners read only their company's objects through RLS. There is no
-- automatic invite, reject, score, or hire decision.

create table public.company_interview_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  slug text not null,
  questions jsonb not null,
  deadline_days integer not null default 7,
  retention_days integer not null default 365,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_interview_templates_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  constraint company_interview_templates_deadline
    check (deadline_days between 1 and 30),
  constraint company_interview_templates_retention
    check (retention_days between 30 and 730),
  constraint company_interview_templates_questions_shape
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 3)
);

create unique index company_interview_templates_company_slug
  on public.company_interview_templates (company_id, slug);

create table public.company_video_interviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  application_id uuid not null references public.company_applications (id) on delete cascade,
  applicant_id uuid not null references public.company_applicants (id) on delete cascade,
  recruiting_page_id uuid not null,
  slug text not null,
  token_hash text not null,
  questions jsonb not null,
  status text not null,
  deadline_at timestamptz not null,
  retention_until timestamptz not null,
  invited_at timestamptz not null default now(),
  opened_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  processed_at timestamptz,
  processing_started_at timestamptz,
  processing_attempt integer not null default 0,
  processing_error text,
  overall_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_video_interviews_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  constraint company_video_interviews_token_hash
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint company_video_interviews_questions_shape
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 3),
  constraint company_video_interviews_status_allowed
    check (status in (
      'invited',
      'opened',
      'in_progress',
      'submitted',
      'transcribing',
      'ready',
      'failed',
      'expired'
    )),
  constraint company_video_interviews_processing_attempt
    check (processing_attempt >= 0),
  constraint company_video_interviews_summary_len
    check (overall_summary is null or char_length(overall_summary) between 1 and 4000),
  constraint company_video_interviews_error_len
    check (processing_error is null or char_length(processing_error) between 1 and 500)
);

create unique index company_video_interviews_application
  on public.company_video_interviews (application_id);

create unique index company_video_interviews_token_hash
  on public.company_video_interviews (token_hash);

create index company_video_interviews_company_status
  on public.company_video_interviews (company_id, status, invited_at desc);

create table public.company_video_interview_answers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  interview_id uuid not null references public.company_video_interviews (id) on delete cascade,
  question_index integer not null,
  prompt text not null,
  time_limit_seconds integer not null,
  storage_path text not null,
  content_type text not null,
  byte_size integer not null,
  duration_ms integer not null,
  accepted_at timestamptz not null default now(),
  transcript text,
  summary text,
  processing_status text not null default 'pending',
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_video_interview_answers_index
    check (question_index between 0 and 2),
  constraint company_video_interview_answers_prompt_len
    check (char_length(btrim(prompt)) between 1 and 200),
  constraint company_video_interview_answers_time_limit
    check (time_limit_seconds between 15 and 180),
  constraint company_video_interview_answers_path
    check (storage_path ~ '^invites/[0-9a-f]{64}/[0-9a-f-]{36}\.(webm|mp4)$'),
  constraint company_video_interview_answers_type
    check (content_type in ('video/webm', 'video/mp4')),
  constraint company_video_interview_answers_size
    check (byte_size > 0 and byte_size <= 26214400),
  constraint company_video_interview_answers_duration
    check (duration_ms > 0 and duration_ms <= 185000),
  constraint company_video_interview_answers_processing
    check (processing_status in ('pending', 'ready', 'failed')),
  constraint company_video_interview_answers_transcript_len
    check (transcript is null or char_length(transcript) between 1 and 20000),
  constraint company_video_interview_answers_summary_len
    check (summary is null or char_length(summary) between 1 and 2000),
  constraint company_video_interview_answers_error_len
    check (processing_error is null or char_length(processing_error) between 1 and 500)
);

create unique index company_video_interview_answers_question
  on public.company_video_interview_answers (interview_id, question_index);

create index company_video_interview_answers_company
  on public.company_video_interview_answers (company_id, interview_id);

create table public.company_interview_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  constraint company_interview_attempts_hash_len
    check (char_length(ip_hash) between 8 and 128)
);

create index company_interview_attempts_ip_created
  on public.company_interview_attempts (ip_hash, created_at desc);

create function public.interview_token_hash(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

create function public.company_interview_templates_touch()
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

create trigger company_interview_templates_touch
before insert or update on public.company_interview_templates
for each row
execute function public.company_interview_templates_touch();

create function public.company_video_interviews_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.application_id is distinct from old.application_id
       or new.applicant_id is distinct from old.applicant_id
       or new.recruiting_page_id is distinct from old.recruiting_page_id
       or new.slug is distinct from old.slug
       or new.questions is distinct from old.questions then
      raise exception 'interview snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_video_interviews_touch
before insert or update on public.company_video_interviews
for each row
execute function public.company_video_interviews_touch();

create function public.company_video_interview_answers_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.interview_id is distinct from old.interview_id
       or new.question_index is distinct from old.question_index
       or new.prompt is distinct from old.prompt
       or new.time_limit_seconds is distinct from old.time_limit_seconds then
      raise exception 'answer snapshot fields are frozen';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_video_interview_answers_touch
before insert or update on public.company_video_interview_answers
for each row
execute function public.company_video_interview_answers_touch();

create function public.expire_stale_video_interviews(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  if p_company_id is null then
    raise exception 'company required';
  end if;
  if auth.role() = 'authenticated' then
    if not exists (
      select 1
      from public.company_memberships as membership
      where membership.company_id = p_company_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role = 'owner_admin'
    ) or not public.is_guided_blueprint_company(p_company_id) then
      raise exception 'not allowed';
    end if;
  end if;

  update public.company_video_interviews as interview
  set status = 'expired', processing_error = null
  where interview.status in ('invited', 'opened', 'in_progress')
    and interview.deadline_at < now()
    and interview.company_id = p_company_id;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create function public.interview_storage_upload_allowed(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_video_interviews as interview
    where interview.token_hash = split_part(p_name, '/', 2)
      and interview.status in ('invited', 'opened', 'in_progress')
      and interview.deadline_at > now()
      and p_name ~ ('^invites/' || interview.token_hash || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webm|mp4)$')
  );
$$;

create function public.interview_storage_owner_allowed(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_video_interviews as interview
    join public.company_memberships as membership
      on membership.company_id = interview.company_id
    where membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
      and public.is_guided_blueprint_company(interview.company_id)
      and (
        p_name ~ ('^invites/' || interview.token_hash || '/')
        or exists (
          select 1
          from public.company_video_interview_answers as answer
          where answer.interview_id = interview.id
            and answer.storage_path = p_name
        )
      )
  );
$$;

create function public.note_interview_attempt(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_hash text;
begin
  attempt_hash := coalesce(nullif(btrim(p_ip_hash), ''), 'missing');
  if char_length(attempt_hash) > 128 then
    attempt_hash := left(attempt_hash, 128);
  end if;

  delete from public.company_interview_attempts
  where company_interview_attempts.ip_hash = attempt_hash
    and company_interview_attempts.created_at < now() - interval '2 days';

  insert into public.company_interview_attempts (ip_hash)
  values (attempt_hash);

  return (
    select count(*)
    from public.company_interview_attempts as attempt
    where attempt.ip_hash = attempt_hash
      and attempt.created_at > now() - interval '1 hour'
  ) <= 20;
end;
$$;

create function public.open_video_interview(p_token text, p_ip_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  interview record;
  lookup_hash text;
  answers jsonb := '[]'::jsonb;
begin
  if not public.note_interview_attempt(p_ip_hash) then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  lookup_hash := public.interview_token_hash(p_token);

  select
    video.id,
    video.company_id,
    video.status,
    video.questions,
    video.deadline_at,
    video.submitted_at,
    company.name as company_name,
    application.role_title
  into interview
  from public.company_video_interviews as video
  join public.companies as company on company.id = video.company_id
  join public.company_applications as application on application.id = video.application_id
  where video.token_hash = lookup_hash
  limit 1;

  if interview.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  perform public.expire_stale_video_interviews(interview.company_id);

  select
    video.id,
    video.company_id,
    video.status,
    video.questions,
    video.deadline_at,
    video.submitted_at,
    company.name as company_name,
    application.role_title
  into interview
  from public.company_video_interviews as video
  join public.companies as company on company.id = video.company_id
  join public.company_applications as application on application.id = video.application_id
  where video.id = interview.id;

  if interview.status in ('invited', 'opened', 'in_progress') and interview.deadline_at < now() then
    update public.company_video_interviews
    set status = 'expired'
    where id = interview.id;
    interview.status := 'expired';
  end if;

  if interview.status = 'expired' then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if interview.status = 'invited' then
    update public.company_video_interviews
    set status = 'opened', opened_at = coalesce(opened_at, now())
    where id = interview.id;
    interview.status := 'opened';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'questionIndex', answer.question_index,
    'storagePath', answer.storage_path
  ) order by answer.question_index), '[]'::jsonb)
  into answers
  from public.company_video_interview_answers as answer
  where answer.interview_id = interview.id;

  return jsonb_build_object(
    'ok', true,
    'interviewId', interview.id,
    'tokenHash', lookup_hash,
    'status', interview.status,
    'companyName', interview.company_name,
    'roleTitle', interview.role_title,
    'deadlineAt', interview.deadline_at,
    'submittedAt', interview.submitted_at,
    'questions', interview.questions,
    'accepted', answers
  );
end;
$$;

create function public.register_video_answer(
  p_token text,
  p_ip_hash text,
  p_question_index integer,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer,
  p_duration_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  interview record;
  lookup_hash text;
  question jsonb;
  object_size bigint;
  time_limit integer;
begin
  if not public.note_interview_attempt(p_ip_hash) then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if p_question_index not between 0 and 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if p_content_type not in ('video/webm', 'video/mp4')
     or p_byte_size is null or p_byte_size <= 0 or p_byte_size > 26214400
     or p_duration_ms is null or p_duration_ms <= 0 or p_duration_ms > 185000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  lookup_hash := public.interview_token_hash(p_token);
  if p_storage_path !~ (
       '^invites/' || lookup_hash ||
       '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webm|mp4)$'
     )
     or (p_content_type = 'video/mp4') <> p_storage_path like '%.mp4' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select video.id, video.company_id, video.status, video.questions, video.deadline_at
  into interview
  from public.company_video_interviews as video
  where video.token_hash = lookup_hash
  limit 1;

  if interview.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if interview.status in ('submitted', 'transcribing', 'ready', 'failed') then
    return jsonb_build_object('ok', false, 'error', 'submitted');
  end if;
  if interview.status = 'expired' or interview.deadline_at < now() then
    update public.company_video_interviews
    set status = 'expired'
    where id = interview.id and status in ('invited', 'opened', 'in_progress');
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  question := interview.questions -> p_question_index;
  if question is null or jsonb_typeof(question) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  time_limit := coalesce((question->>'timeLimitSeconds')::integer, 0);
  if time_limit not between 15 and 180 or p_duration_ms > (time_limit + 5) * 1000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select coalesce(
    nullif((metadata->>'size'), '')::bigint,
    nullif((metadata->>'contentLength'), '')::bigint,
    p_byte_size::bigint
  )
  into object_size
  from storage.objects
  where bucket_id = 'interview-videos'
    and name = p_storage_path
  limit 1;

  if object_size is null then
    return jsonb_build_object('ok', false, 'error', 'upload');
  end if;
  if object_size <= 0 or object_size > 26214400 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.company_video_interview_answers (
    company_id,
    interview_id,
    question_index,
    prompt,
    time_limit_seconds,
    storage_path,
    content_type,
    byte_size,
    duration_ms,
    processing_status
  ) values (
    interview.company_id,
    interview.id,
    p_question_index,
    btrim(question->>'prompt'),
    time_limit,
    p_storage_path,
    p_content_type,
    least(p_byte_size, object_size::integer),
    p_duration_ms,
    'pending'
  )
  on conflict (interview_id, question_index)
  do update set
    storage_path = excluded.storage_path,
    content_type = excluded.content_type,
    byte_size = excluded.byte_size,
    duration_ms = excluded.duration_ms,
    accepted_at = now(),
    transcript = null,
    summary = null,
    processing_status = 'pending',
    processing_error = null;

  update public.company_video_interviews
  set
    status = 'in_progress',
    opened_at = coalesce(opened_at, now()),
    started_at = coalesce(started_at, now())
  where id = interview.id
    and status in ('invited', 'opened', 'in_progress');

  return jsonb_build_object('ok', true);
end;
$$;

create function public.complete_video_interview(p_token text, p_ip_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  interview record;
  lookup_hash text;
  accepted integer;
begin
  if not public.note_interview_attempt(p_ip_hash) then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  lookup_hash := public.interview_token_hash(p_token);

  select video.id, video.status, video.deadline_at
  into interview
  from public.company_video_interviews as video
  where video.token_hash = lookup_hash
  limit 1;

  if interview.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if interview.status in ('submitted', 'transcribing', 'ready', 'failed') then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  if interview.status = 'expired' or interview.deadline_at < now() then
    update public.company_video_interviews
    set status = 'expired'
    where id = interview.id and status in ('invited', 'opened', 'in_progress');
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select count(*) into accepted
  from public.company_video_interview_answers as answer
  where answer.interview_id = interview.id
    and answer.byte_size > 0
    and exists (
      select 1
      from storage.objects as object
      where object.bucket_id = 'interview-videos'
        and object.name = answer.storage_path
    );

  if accepted is distinct from 3 then
    return jsonb_build_object('ok', false, 'error', 'incomplete');
  end if;

  update public.company_video_interviews
  set
    status = 'submitted',
    submitted_at = coalesce(submitted_at, now()),
    processing_error = null
  where id = interview.id
    and status in ('invited', 'opened', 'in_progress');

  return jsonb_build_object('ok', true);
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-videos',
  'interview-videos',
  false,
  26214400,
  array['video/webm', 'video/mp4']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.company_interview_templates enable row level security;
alter table public.company_video_interviews enable row level security;
alter table public.company_video_interview_answers enable row level security;
alter table public.company_interview_attempts enable row level security;

revoke all on table public.company_interview_templates from public, anon, authenticated;
revoke all on table public.company_video_interviews from public, anon, authenticated;
revoke all on table public.company_video_interview_answers from public, anon, authenticated;
revoke all on table public.company_interview_attempts from public, anon, authenticated;

grant select, insert, update on table public.company_interview_templates to authenticated;
grant select, insert, update on table public.company_video_interviews to authenticated;
grant select, update, delete on table public.company_video_interview_answers to authenticated;

revoke all on function public.interview_token_hash(text) from public;
revoke all on function public.expire_stale_video_interviews(uuid) from public;
revoke all on function public.note_interview_attempt(text) from public;
revoke all on function public.interview_storage_upload_allowed(text) from public;
revoke all on function public.interview_storage_owner_allowed(text) from public;
revoke all on function public.open_video_interview(text, text) from public;
revoke all on function public.register_video_answer(text, text, integer, text, text, integer, integer) from public;
revoke all on function public.complete_video_interview(text, text) from public;

grant execute on function public.expire_stale_video_interviews(uuid) to authenticated;
grant execute on function public.interview_storage_upload_allowed(text) to anon, authenticated;
grant execute on function public.interview_storage_owner_allowed(text) to authenticated;
grant execute on function public.open_video_interview(text, text) to anon, authenticated;
grant execute on function public.register_video_answer(text, text, integer, text, text, integer, integer) to anon, authenticated;
grant execute on function public.complete_video_interview(text, text) to anon, authenticated;

create policy company_interview_templates_owner_select
on public.company_interview_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_interview_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_interview_templates.company_id)
);

create policy company_interview_templates_owner_insert
on public.company_interview_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_interview_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_interview_templates.company_id)
);

create policy company_interview_templates_owner_update
on public.company_interview_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_interview_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_interview_templates.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_interview_templates.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_interview_templates.company_id)
);

create policy company_video_interviews_owner_select
on public.company_video_interviews
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interviews.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interviews.company_id)
);

create policy company_video_interviews_owner_insert
on public.company_video_interviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interviews.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and exists (
    select 1
    from public.company_applications as application
    where application.id = company_video_interviews.application_id
      and application.company_id = company_video_interviews.company_id
      and application.applicant_id = company_video_interviews.applicant_id
  )
  and public.is_guided_blueprint_company(company_video_interviews.company_id)
);

create policy company_video_interviews_owner_update
on public.company_video_interviews
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interviews.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interviews.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interviews.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interviews.company_id)
);

create policy company_video_interview_answers_owner_select
on public.company_video_interview_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interview_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interview_answers.company_id)
);

create policy company_video_interview_answers_owner_update
on public.company_video_interview_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interview_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interview_answers.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interview_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interview_answers.company_id)
);

create policy company_video_interview_answers_owner_delete
on public.company_video_interview_answers
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_video_interview_answers.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_video_interview_answers.company_id)
);

create policy interview_videos_anon_insert
on storage.objects
for insert
to anon
with check (
  bucket_id = 'interview-videos'
  and public.interview_storage_upload_allowed(name)
);

create policy interview_videos_auth_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'interview-videos'
  and public.interview_storage_upload_allowed(name)
);

create policy interview_videos_anon_update
on storage.objects
for update
to anon
using (
  bucket_id = 'interview-videos'
  and public.interview_storage_upload_allowed(name)
)
with check (
  bucket_id = 'interview-videos'
  and public.interview_storage_upload_allowed(name)
);

create policy interview_videos_auth_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'interview-videos'
  and public.interview_storage_upload_allowed(name)
)
with check (
  bucket_id = 'interview-videos'
  and public.interview_storage_upload_allowed(name)
);

create policy interview_videos_owner_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'interview-videos'
  and public.interview_storage_owner_allowed(name)
);

create policy interview_videos_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'interview-videos'
  and public.interview_storage_owner_allowed(name)
);
