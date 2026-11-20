-- Stage 4.3 follow-up: refuse invitation acceptance when a former membership is
-- still inactive, and let owners rotate a pending copy-link. Local database
-- only. Do not apply to hosted, staging, or production until that apply is
-- separately approved, and not before 20261201120000_training_enrollment.
--
-- Do not enable lesson progress, grading, certification, live invitation
-- email, or automatic reactivation of inactive company memberships.

create or replace function public.company_training_enrollments_touch()
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
    if new.invitation_token_hash is distinct from old.invitation_token_hash then
      if old.status = 'pending' and new.status in ('pending', 'active', 'revoked') then
        null;
      elsif old.status = 'active' and new.status = 'cancelled' and new.invitation_token_hash is null then
        null;
      else
        raise exception 'invitation token can only be replaced while pending or cleared on close';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.accept_training_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  enrollment public.company_training_enrollments;
  signed_in uuid;
  signed_email text;
  v_member_status text;
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

  select membership.status into v_member_status
  from public.company_memberships as membership
  where membership.company_id = enrollment.company_id
    and membership.user_id = signed_in
  for update;

  if v_member_status = 'inactive' then
    raise exception 'training-enrollment:inactive-membership';
  end if;

  if v_member_status is null then
    begin
      insert into public.company_memberships (company_id, user_id, role, status)
      values (enrollment.company_id, signed_in, 'dj_trainee', 'active');
    exception
      when unique_violation then
        select membership.status into v_member_status
        from public.company_memberships as membership
        where membership.company_id = enrollment.company_id
          and membership.user_id = signed_in
        for update;
        if v_member_status is distinct from 'active' then
          raise exception 'training-enrollment:inactive-membership';
        end if;
    end;
  end if;

  select membership.status into v_member_status
  from public.company_memberships as membership
  where membership.company_id = enrollment.company_id
    and membership.user_id = signed_in;
  if v_member_status is distinct from 'active' then
    raise exception 'training-enrollment:inactive-membership';
  end if;

  update public.company_training_enrollments
  set
    trainee_user_id = signed_in,
    status = 'active',
    accepted_at = now()
  where id = enrollment.id;

  return jsonb_build_object('ok', true, 'enrollmentId', enrollment.id, 'status', 'active');
end;
$$;

create or replace function public.regenerate_training_invitation(
  p_enrollment_id uuid,
  p_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  enrollment public.company_training_enrollments;
  stored_hash text;
begin
  if p_token_hash is null or char_length(btrim(p_token_hash)) <> 64 then
    raise exception 'training-enrollment:token-required';
  end if;
  stored_hash := lower(btrim(p_token_hash));

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
  if enrollment.status <> 'pending' then
    raise exception 'training-enrollment:not-pending-invite';
  end if;

  update public.company_training_enrollments
  set invitation_token_hash = stored_hash
  where id = enrollment.id;

  return jsonb_build_object(
    'ok', true,
    'enrollmentId', enrollment.id,
    'status', 'pending'
  );
exception
  when unique_violation then
    raise exception 'training-enrollment:duplicate-open';
end;
$$;

revoke all on function public.regenerate_training_invitation(uuid, text) from public;
grant execute on function public.regenerate_training_invitation(uuid, text) to authenticated;
