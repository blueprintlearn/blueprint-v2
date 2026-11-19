-- Stage 4.1 follow-up: reject a superseded snapshot unless a published
-- snapshot exists in the same transaction. Direct table updates cannot
-- supersede first and fail later. Local database only. Do not apply to
-- hosted, staging, or production until that apply is separately approved,
-- and not before 20261128120000_training_library is present.

create function public.training_versions_require_published()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'training_master_course_versions' then
    if exists (
      select 1
      from public.training_master_course_versions as version
      where version.course_id = new.course_id
        and version.status = 'superseded'
    ) and not exists (
      select 1
      from public.training_master_course_versions as version
      where version.course_id = new.course_id
        and version.status = 'published'
    ) then
      raise exception 'superseding a published version requires publishing a draft in the same transaction';
    end if;
    return null;
  end if;

  if tg_table_name = 'company_training_course_versions' then
    if exists (
      select 1
      from public.company_training_course_versions as version
      where version.course_id = new.course_id
        and version.status = 'superseded'
    ) and not exists (
      select 1
      from public.company_training_course_versions as version
      where version.course_id = new.course_id
        and version.status = 'published'
    ) then
      raise exception 'superseding a published version requires publishing a draft in the same transaction';
    end if;
    return null;
  end if;

  if tg_table_name = 'company_training_path_versions' then
    if exists (
      select 1
      from public.company_training_path_versions as version
      where version.path_id = new.path_id
        and version.status = 'superseded'
    ) and not exists (
      select 1
      from public.company_training_path_versions as version
      where version.path_id = new.path_id
        and version.status = 'published'
    ) then
      raise exception 'superseding a published version requires publishing a draft in the same transaction';
    end if;
    return null;
  end if;

  raise exception 'unknown training version table';
end;
$$;

create constraint trigger training_master_course_versions_publish_atomic
after insert or update of status on public.training_master_course_versions
deferrable initially deferred
for each row
when (new.status = 'superseded')
execute function public.training_versions_require_published();

create constraint trigger company_training_course_versions_publish_atomic
after insert or update of status on public.company_training_course_versions
deferrable initially deferred
for each row
when (new.status = 'superseded')
execute function public.training_versions_require_published();

create constraint trigger company_training_path_versions_publish_atomic
after insert or update of status on public.company_training_path_versions
deferrable initially deferred
for each row
when (new.status = 'superseded')
execute function public.training_versions_require_published();

revoke all on function public.training_versions_require_published() from public;
