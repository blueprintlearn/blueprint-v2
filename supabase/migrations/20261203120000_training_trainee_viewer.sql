-- Stage 4.4: trainee frozen-content viewer. Active members may read the
-- published or superseded snapshot frozen on their active enrollment.
-- Inactive memberships cannot read enrollments or version content, even when
-- an enrollment row still exists. Local database only. Do not apply to hosted,
-- staging, or production until that apply is separately approved, and not
-- before Stage 4.3 follow-up 20261202120000_training_enrollment_invite_fixes.
--
-- Hosted apply order: Stage 3.2 through Stage 4.3 invite fixes, then this
-- Stage 4.4 migration. Do not enable lesson progress, grading, submissions,
-- sequential enforcement, certification, or live invitation email.

create function public.has_active_company_membership(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = p_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create function public.can_view_frozen_training_version(
  p_company_id uuid,
  p_kind text,
  p_course_id uuid,
  p_path_id uuid,
  p_version integer
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and p_version is not null
    and p_version >= 1
    and p_kind in ('course', 'path')
    and public.has_active_company_membership(p_company_id)
    and exists (
      select 1
      from public.company_training_enrollments as enrollment
      where enrollment.company_id = p_company_id
        and enrollment.trainee_user_id = auth.uid()
        and enrollment.status = 'active'
        and enrollment.target_kind = p_kind
        and enrollment.content_version = p_version
        and (
          (p_kind = 'course' and enrollment.course_id is not distinct from p_course_id)
          or (p_kind = 'path' and enrollment.path_id is not distinct from p_path_id)
        )
    );
$$;

revoke all on function public.has_active_company_membership(uuid) from public, anon;
revoke all on function public.can_view_frozen_training_version(uuid, text, uuid, uuid, integer) from public, anon;
grant execute on function public.has_active_company_membership(uuid) to authenticated;
grant execute on function public.can_view_frozen_training_version(uuid, text, uuid, uuid, integer) to authenticated;

drop policy company_training_enrollments_trainee_select on public.company_training_enrollments;

create policy company_training_enrollments_trainee_select
on public.company_training_enrollments
for select
to authenticated
using (
  trainee_user_id = auth.uid()
  and status = 'active'
  and public.has_active_company_membership(company_id)
);

create policy company_training_course_versions_trainee_select
on public.company_training_course_versions
for select
to authenticated
using (
  status in ('published', 'superseded')
  and public.can_view_frozen_training_version(company_id, 'course', course_id, null, version)
);

create policy company_training_path_versions_trainee_select
on public.company_training_path_versions
for select
to authenticated
using (
  status in ('published', 'superseded')
  and public.can_view_frozen_training_version(company_id, 'path', null, path_id, version)
);
