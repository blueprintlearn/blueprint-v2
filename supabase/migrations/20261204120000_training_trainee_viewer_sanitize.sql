-- Stage 4.4 follow-up: trainees read frozen snapshots only through a sanitized
-- security-definer RPC. Direct trainee SELECT on version tables is removed so
-- quiz answer keys never leave Postgres on the trainee path. Local database
-- only. Do not apply to hosted, staging, or production until that apply is
-- separately approved, and not before 20261203120000_training_trainee_viewer.
--
-- Do not enable lesson progress, grading, submissions, sequential enforcement,
-- certification, or live invitation email.

create function public.trainee_safe_course_content(p_content jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_lessons jsonb := '[]'::jsonb;
  v_lesson jsonb;
  v_blocks jsonb;
  v_block jsonb;
  v_questions jsonb;
  v_question jsonb;
  v_options jsonb;
  v_option jsonb;
  v_safe_lesson jsonb;
  v_safe_block jsonb;
  v_safe_question jsonb;
begin
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    return '{}'::jsonb;
  end if;

  if jsonb_typeof(p_content -> 'lessons') = 'array' then
    for v_lesson in
      select value from jsonb_array_elements(p_content -> 'lessons')
    loop
      v_blocks := '[]'::jsonb;
      if jsonb_typeof(v_lesson -> 'blocks') = 'array' then
        for v_block in
          select value from jsonb_array_elements(v_lesson -> 'blocks')
        loop
          if v_block ->> 'type' = 'quiz' and jsonb_typeof(v_block -> 'questions') = 'array' then
            v_questions := '[]'::jsonb;
            for v_question in
              select value from jsonb_array_elements(v_block -> 'questions')
            loop
              v_options := '[]'::jsonb;
              if jsonb_typeof(v_question -> 'options') = 'array' then
                for v_option in
                  select value from jsonb_array_elements(v_question -> 'options')
                loop
                  if jsonb_typeof(v_option) = 'object' then
                    v_options := v_options || jsonb_build_array(
                      v_option - 'correct' - 'sortString' - 'html'
                    );
                  else
                    v_options := v_options || jsonb_build_array(v_option);
                  end if;
                end loop;
              end if;
              v_safe_question := (v_question - 'options') || jsonb_build_object('options', v_options);
              v_questions := v_questions || jsonb_build_array(v_safe_question);
            end loop;
            v_safe_block := (v_block - 'questions') || jsonb_build_object('questions', v_questions);
            v_blocks := v_blocks || jsonb_build_array(v_safe_block);
          else
            v_blocks := v_blocks || jsonb_build_array(v_block);
          end if;
        end loop;
      end if;
      v_safe_lesson := (v_lesson - 'blocks') || jsonb_build_object('blocks', v_blocks);
      v_lessons := v_lessons || jsonb_build_array(v_safe_lesson);
    end loop;
  end if;

  return (p_content - 'lessons') || jsonb_build_object('lessons', v_lessons);
end;
$$;

create function public.get_assigned_training_snapshot(p_enrollment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_enrollment public.company_training_enrollments;
  v_version integer;
  v_status text;
  v_content jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'sign-in-required');
  end if;
  if p_enrollment_id is null then
    return jsonb_build_object('ok', false, 'code', 'not-found');
  end if;

  select * into v_enrollment
  from public.company_training_enrollments
  where id = p_enrollment_id;

  if not found
     or v_enrollment.trainee_user_id is distinct from auth.uid()
     or v_enrollment.status is distinct from 'active'
     or not public.has_active_company_membership(v_enrollment.company_id) then
    return jsonb_build_object('ok', false, 'code', 'not-found');
  end if;

  if v_enrollment.target_kind = 'course' and v_enrollment.course_id is not null then
    select version.version, version.status, version.content
      into v_version, v_status, v_content
    from public.company_training_course_versions as version
    where version.course_id = v_enrollment.course_id
      and version.company_id = v_enrollment.company_id
      and version.version = v_enrollment.content_version
      and version.status in ('published', 'superseded');
    if not found then
      return jsonb_build_object('ok', false, 'code', 'not-found');
    end if;
    return jsonb_build_object(
      'ok', true,
      'kind', 'course',
      'enrollmentId', v_enrollment.id,
      'version', v_version,
      'status', v_status,
      'content', public.trainee_safe_course_content(v_content)
    );
  end if;

  if v_enrollment.target_kind = 'path' and v_enrollment.path_id is not null then
    select version.version, version.status, version.content
      into v_version, v_status, v_content
    from public.company_training_path_versions as version
    where version.path_id = v_enrollment.path_id
      and version.company_id = v_enrollment.company_id
      and version.version = v_enrollment.content_version
      and version.status in ('published', 'superseded');
    if not found then
      return jsonb_build_object('ok', false, 'code', 'not-found');
    end if;
    return jsonb_build_object(
      'ok', true,
      'kind', 'path',
      'enrollmentId', v_enrollment.id,
      'version', v_version,
      'status', v_status,
      'content', v_content
    );
  end if;

  return jsonb_build_object('ok', false, 'code', 'not-found');
end;
$$;

revoke all on function public.trainee_safe_course_content(jsonb) from public, anon, authenticated;
revoke all on function public.get_assigned_training_snapshot(uuid) from public, anon;
grant execute on function public.get_assigned_training_snapshot(uuid) to authenticated;

drop policy if exists company_training_course_versions_trainee_select
  on public.company_training_course_versions;
drop policy if exists company_training_path_versions_trainee_select
  on public.company_training_path_versions;
