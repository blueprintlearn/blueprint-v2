-- Stage 4.3: company training enrollment from recruitment handoffs, existing
-- staff, and email invitations. Local database only. Do not apply to hosted,
-- staging, or production until that apply is separately approved, and not
-- before Stage 4.2 (20261130120000_training_legacy_import) is present.
--
-- Hosted apply order: Stage 3.2 through Stage 4.2, then this Stage 4.3
-- migration. Do not enable lesson progress, grading, certification, live
-- invitation email, or trainee enrollment on hosted environments from this
-- file. Invitation delivery stays copy-link only.

create table public.company_training_enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  trainee_user_id uuid references auth.users (id) on delete restrict,
  invite_email text,
  source text not null,
  target_kind text not null,
  course_id uuid references public.company_training_courses (id) on delete restrict,
  path_id uuid references public.company_training_paths (id) on delete restrict,
  content_version integer not null,
  content_title text not null,
  assigned_by uuid not null references auth.users (id),
  assigned_at timestamptz not null default now(),
  status text not null,
  invitation_token_hash text,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id),
  preparation_id uuid references public.company_applicant_training_preparations (id) on delete restrict,
  applicant_id uuid references public.company_applicants (id) on delete restrict,
  application_id uuid references public.company_applications (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_training_enrollments_source
    check (source in ('recruitment', 'staff', 'invitation')),
  constraint company_training_enrollments_target
    check (target_kind in ('course', 'path')),
  constraint company_training_enrollments_status
    check (status in ('pending', 'active', 'cancelled', 'revoked')),
  constraint company_training_enrollments_target_xor
    check (
      (target_kind = 'course' and course_id is not null and path_id is null)
      or (target_kind = 'path' and path_id is not null and course_id is null)
    ),
  constraint company_training_enrollments_version_positive
    check (content_version >= 1),
  constraint company_training_enrollments_title_len
    check (char_length(btrim(content_title)) between 1 and 80),
  constraint company_training_enrollments_email_len
    check (invite_email is null or char_length(btrim(invite_email)) between 3 and 254),
  constraint company_training_enrollments_email_shape
    check (
      invite_email is null
      or invite_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  constraint company_training_enrollments_recruitment
    check (
      source <> 'recruitment'
      or (preparation_id is not null and applicant_id is not null and application_id is not null)
    ),
  constraint company_training_enrollments_pending
    check (
      status <> 'pending'
      or (
        trainee_user_id is null
        and invitation_token_hash is not null
        and invite_email is not null
      )
    ),
  constraint company_training_enrollments_active
    check (status <> 'active' or trainee_user_id is not null),
  constraint company_training_enrollments_accepted
    check (status <> 'active' or accepted_at is not null or source = 'staff'),
  constraint company_training_enrollments_cancelled
    check (
      status not in ('cancelled', 'revoked')
      or (cancelled_at is not null and cancelled_by is not null)
    )
);

create unique index company_training_enrollments_open_user_course
  on public.company_training_enrollments (company_id, trainee_user_id, course_id)
  where status in ('pending', 'active') and trainee_user_id is not null and course_id is not null;

create unique index company_training_enrollments_open_user_path
  on public.company_training_enrollments (company_id, trainee_user_id, path_id)
  where status in ('pending', 'active') and trainee_user_id is not null and path_id is not null;

create unique index company_training_enrollments_open_email_course
  on public.company_training_enrollments (company_id, invite_email, course_id)
  where status = 'pending' and invite_email is not null and course_id is not null;

create unique index company_training_enrollments_open_email_path
  on public.company_training_enrollments (company_id, invite_email, path_id)
  where status = 'pending' and invite_email is not null and path_id is not null;

create unique index company_training_enrollments_open_handoff
  on public.company_training_enrollments (preparation_id)
  where status in ('pending', 'active') and preparation_id is not null;

create unique index company_training_enrollments_token
  on public.company_training_enrollments (invitation_token_hash)
  where invitation_token_hash is not null;

create index company_training_enrollments_company_status
  on public.company_training_enrollments (company_id, status);

create function public.company_training_enrollments_touch()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
       or new.source is distinct from old.source
       or new.target_kind is distinct from old.target_kind
       or new.course_id is distinct from old.course_id
       or new.path_id is distinct from old.path_id
       or new.content_version is distinct from old.content_version
       or new.content_title is distinct from old.content_title
       or new.preparation_id is distinct from old.preparation_id
       or new.applicant_id is distinct from old.applicant_id
       or new.application_id is distinct from old.application_id
       or new.assigned_by is distinct from old.assigned_by
       or new.assigned_at is distinct from old.assigned_at then
      raise exception 'training enrollments are immutable except for acceptance and cancellation';
    end if;
    if old.status = 'pending' and new.status not in ('pending', 'active', 'revoked') then
      raise exception 'a pending invitation can only be accepted or revoked';
    end if;
    if old.status = 'active' and new.status not in ('active', 'cancelled') then
      raise exception 'an active enrollment can only be cancelled';
    end if;
    if old.status in ('cancelled', 'revoked') and new.status is distinct from old.status then
      raise exception 'a cancelled or revoked enrollment cannot change status';
    end if;
    if old.trainee_user_id is not null and new.trainee_user_id is distinct from old.trainee_user_id then
      raise exception 'trainee identity cannot change';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_training_enrollments_touch
before insert or update on public.company_training_enrollments
for each row
execute function public.company_training_enrollments_touch();

create function public.list_company_staff_for_training(p_company_id uuid)
returns table (
  user_id uuid,
  email text,
  role public.system_role,
  status text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select membership.user_id, users.email, membership.role, membership.status
  from public.company_memberships as membership
  join auth.users as users on users.id = membership.user_id
  where membership.company_id = p_company_id
    and public.is_guided_owner_of(p_company_id)
    and membership.status = 'active';
$$;

create function public.get_training_invitation(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  enrollment public.company_training_enrollments;
  company_name text;
begin
  if p_token_hash is null or char_length(btrim(p_token_hash)) <> 64 then
    return jsonb_build_object('ok', false, 'code', 'not-found');
  end if;
  select * into enrollment
  from public.company_training_enrollments
  where invitation_token_hash = p_token_hash;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not-found');
  end if;
  select name into company_name from public.companies where id = enrollment.company_id;
  return jsonb_build_object(
    'ok', true,
    'status', enrollment.status,
    'inviteEmail', enrollment.invite_email,
    'contentTitle', enrollment.content_title,
    'companyName', company_name,
    'targetKind', enrollment.target_kind
  );
end;
$$;

create function public.enroll_company_training(
  p_company_id uuid,
  p_source text,
  p_target_kind text,
  p_course_id uuid default null,
  p_path_id uuid default null,
  p_trainee_user_id uuid default null,
  p_invite_email text default null,
  p_preparation_id uuid default null,
  p_confirmed boolean default false,
  p_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  published_version integer;
  published_title text;
  v_invite_email text;
  existing_user uuid;
  existing_member uuid;
  existing_id uuid;
  existing_status text;
  existing_version integer;
  v_applicant_id uuid;
  v_application_id uuid;
  prep_company uuid;
  prep_status text;
  enrollment_id uuid;
  result_status text;
  stored_hash text;
  stored_user uuid;
begin
  if not public.is_guided_owner_of(p_company_id) then
    raise exception 'training-enrollment:not-owner';
  end if;
  if p_confirmed is not true then
    raise exception 'training-enrollment:confirmation-required';
  end if;
  if p_source not in ('recruitment', 'staff', 'invitation') then
    raise exception 'training-enrollment:invalid-source';
  end if;
  if p_target_kind = 'course' then
    if p_course_id is null or p_path_id is not null then
      raise exception 'training-enrollment:invalid-target';
    end if;
    select version.version, btrim(version.content ->> 'title')
      into published_version, published_title
    from public.company_training_course_versions as version
    join public.company_training_courses as course
      on course.id = version.course_id
    where version.course_id = p_course_id
      and course.company_id = p_company_id
      and version.status = 'published';
  elsif p_target_kind = 'path' then
    if p_path_id is null or p_course_id is not null then
      raise exception 'training-enrollment:invalid-target';
    end if;
    select version.version, btrim(version.content ->> 'title')
      into published_version, published_title
    from public.company_training_path_versions as version
    join public.company_training_paths as path
      on path.id = version.path_id
    where version.path_id = p_path_id
      and path.company_id = p_company_id
      and version.status = 'published';
  else
    raise exception 'training-enrollment:invalid-target';
  end if;
  if published_version is null or published_title is null or published_title = '' then
    raise exception 'training-enrollment:unpublished-target';
  end if;

  v_invite_email := null;
  v_applicant_id := null;
  v_application_id := null;

  if p_source = 'recruitment' then
    if p_preparation_id is null then
      raise exception 'training-enrollment:missing-handoff';
    end if;
    select prep.company_id, prep.status, prep.applicant_id, prep.application_id, lower(btrim(applicant.email))
      into prep_company, prep_status, v_applicant_id, v_application_id, v_invite_email
    from public.company_applicant_training_preparations as prep
    join public.company_applicants as applicant
      on applicant.id = prep.applicant_id
    where prep.id = p_preparation_id;
    if prep_company is null then
      raise exception 'training-enrollment:missing-handoff';
    end if;
    if prep_company is distinct from p_company_id then
      raise exception 'training-enrollment:handoff-wrong-company';
    end if;
    if prep_status is distinct from 'approved' then
      raise exception 'training-enrollment:handoff-not-approved';
    end if;
  elsif p_source = 'staff' then
    if p_trainee_user_id is null then
      raise exception 'training-enrollment:staff-required';
    end if;
    select membership.user_id into existing_member
    from public.company_memberships as membership
    where membership.company_id = p_company_id
      and membership.user_id = p_trainee_user_id
      and membership.status = 'active';
    if existing_member is null then
      raise exception 'training-enrollment:staff-not-member';
    end if;
    select lower(btrim(users.email)) into v_invite_email
    from auth.users as users
    where users.id = p_trainee_user_id;
  elsif p_source = 'invitation' then
    v_invite_email := lower(btrim(p_invite_email));
    if v_invite_email is null or v_invite_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'training-enrollment:invalid-email';
    end if;
  end if;

  select users.id into existing_user
  from auth.users as users
  where lower(btrim(users.email)) = v_invite_email;

  existing_member := null;
  if existing_user is not null then
    select membership.user_id into existing_member
    from public.company_memberships as membership
    where membership.company_id = p_company_id
      and membership.user_id = existing_user
      and membership.status = 'active';
  end if;

  if p_source = 'staff' then
    result_status := 'active';
    stored_user := p_trainee_user_id;
    stored_hash := null;
  elsif existing_member is not null then
    result_status := 'active';
    stored_user := existing_member;
    stored_hash := null;
  else
    result_status := 'pending';
    stored_user := null;
    if p_token_hash is null or char_length(btrim(p_token_hash)) <> 64 then
      raise exception 'training-enrollment:token-required';
    end if;
    stored_hash := lower(btrim(p_token_hash));
  end if;

  select enrollment.id, enrollment.status, enrollment.content_version
    into existing_id, existing_status, existing_version
  from public.company_training_enrollments as enrollment
  where enrollment.company_id = p_company_id
    and enrollment.status in ('pending', 'active')
    and (
      (p_preparation_id is not null and enrollment.preparation_id = p_preparation_id)
      or (stored_user is not null and enrollment.trainee_user_id = stored_user and enrollment.course_id is not distinct from p_course_id and enrollment.path_id is not distinct from p_path_id)
      or (result_status = 'pending' and enrollment.invite_email = v_invite_email and enrollment.course_id is not distinct from p_course_id and enrollment.path_id is not distinct from p_path_id)
    )
  for update
  limit 1;

  if existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'enrollmentId', existing_id,
      'status', existing_status,
      'existing', true,
      'inviteToken', null
    );
  end if;

  insert into public.company_training_enrollments (
    company_id,
    trainee_user_id,
    invite_email,
    source,
    target_kind,
    course_id,
    path_id,
    content_version,
    content_title,
    assigned_by,
    status,
    invitation_token_hash,
    accepted_at,
    preparation_id,
    applicant_id,
    application_id
  ) values (
    p_company_id,
    stored_user,
    v_invite_email,
    p_source,
    p_target_kind,
    p_course_id,
    p_path_id,
    published_version,
    published_title,
    auth.uid(),
    result_status,
    stored_hash,
    case when result_status = 'active' and p_source <> 'staff' then now() else null end,
    p_preparation_id,
    v_applicant_id,
    v_application_id
  )
  returning id into enrollment_id;

  return jsonb_build_object(
    'ok', true,
    'enrollmentId', enrollment_id,
    'status', result_status,
    'existing', false,
    'inviteToken', null
  );
exception
  when unique_violation then
    raise exception 'training-enrollment:duplicate-open';
end;
$$;

create function public.accept_training_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  enrollment public.company_training_enrollments;
  signed_in uuid;
  signed_email text;
begin
  signed_in := auth.uid();
  if signed_in is null then
    raise exception 'training-enrollment:sign-in-required';
  end if;
  if p_token_hash is null or char_length(btrim(p_token_hash)) <> 64 then
    raise exception 'training-enrollment:not-found';
  end if;
  select * into enrollment
  from public.company_training_enrollments
  where invitation_token_hash = lower(btrim(p_token_hash))
  for update;
  if not found then
    raise exception 'training-enrollment:not-found';
  end if;
  if enrollment.status = 'revoked' then
    raise exception 'training-enrollment:revoked';
  end if;
  if enrollment.status <> 'pending' then
    raise exception 'training-enrollment:not-pending';
  end if;
  select lower(btrim(users.email)) into signed_email
  from auth.users as users
  where users.id = signed_in;
  if signed_email is distinct from enrollment.invite_email then
    raise exception 'training-enrollment:wrong-account';
  end if;

  insert into public.company_memberships (company_id, user_id, role, status)
  values (enrollment.company_id, signed_in, 'dj_trainee', 'active')
  on conflict (company_id, user_id) do nothing;

  update public.company_training_enrollments
  set
    trainee_user_id = signed_in,
    status = 'active',
    accepted_at = now()
  where id = enrollment.id;

  return jsonb_build_object('ok', true, 'enrollmentId', enrollment.id, 'status', 'active');
end;
$$;

create function public.cancel_company_training_enrollment(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  enrollment public.company_training_enrollments;
  next_status text;
begin
  select * into enrollment
  from public.company_training_enrollments
  where id = p_enrollment_id
  for update;
  if not found then
    raise exception 'training-enrollment:not-found';
  end if;
  if not public.is_guided_owner_of(enrollment.company_id) then
    raise exception 'training-enrollment:not-owner';
  end if;
  if enrollment.status = 'pending' then
    next_status := 'revoked';
  elsif enrollment.status = 'active' then
    next_status := 'cancelled';
  else
    raise exception 'training-enrollment:already-closed';
  end if;
  update public.company_training_enrollments
  set
    status = next_status,
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    invitation_token_hash = null
  where id = enrollment.id;
  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;

alter table public.company_training_enrollments enable row level security;
revoke all on table public.company_training_enrollments from public, anon, authenticated;
grant select on table public.company_training_enrollments to authenticated;

revoke all on function public.list_company_staff_for_training(uuid) from public;
revoke all on function public.get_training_invitation(text) from public;
revoke all on function public.enroll_company_training(uuid, text, text, uuid, uuid, uuid, text, uuid, boolean, text) from public;
revoke all on function public.accept_training_invitation(text) from public;
revoke all on function public.cancel_company_training_enrollment(uuid) from public;

grant execute on function public.list_company_staff_for_training(uuid) to authenticated;
grant execute on function public.get_training_invitation(text) to anon, authenticated;
grant execute on function public.enroll_company_training(uuid, text, text, uuid, uuid, uuid, text, uuid, boolean, text) to authenticated;
grant execute on function public.accept_training_invitation(text) to authenticated;
grant execute on function public.cancel_company_training_enrollment(uuid) to authenticated;

create policy company_training_enrollments_owner_select
on public.company_training_enrollments
for select
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_enrollments_trainee_select
on public.company_training_enrollments
for select
to authenticated
using (
  trainee_user_id = auth.uid()
  and status = 'active'
);
