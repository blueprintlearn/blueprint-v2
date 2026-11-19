-- Stage 4.2: local-only support for importing the LearnDash curriculum
-- into private master courses. Do not apply to hosted, staging, or production
-- until that apply is separately approved, and not before Stage 4.1
-- (20261128120000_training_library and 20261129120000_training_publish_atomicity)
-- is present in that environment.
--
-- This migration does not import curriculum, trainee accounts, or progress.
-- It only makes the master library able to store the original V1 catalog:
-- unique legacy source ids for idempotent imports, and a larger version
-- snapshot so Event DJ Foundations and The Art of Networking fit.

alter table public.training_master_course_versions
  drop constraint training_master_course_versions_content_size;
alter table public.training_master_course_versions
  add constraint training_master_course_versions_content_size
    check (octet_length(content::text) <= 1048576);

alter table public.company_training_course_versions
  drop constraint company_training_course_versions_content_size;
alter table public.company_training_course_versions
  add constraint company_training_course_versions_content_size
    check (octet_length(content::text) <= 1048576);

alter table public.company_training_path_versions
  drop constraint company_training_path_versions_content_size;
alter table public.company_training_path_versions
  add constraint company_training_path_versions_content_size
    check (octet_length(content::text) <= 1048576);

create unique index training_master_courses_legacy_source_id
  on public.training_master_courses (legacy_source_id)
  where legacy_source_id is not null;

-- Insert the master course and its published version in one transaction.
-- "unchanged" requires a private published snapshot whose content matches
-- this export, not merely the same legacy_content_version label.
-- Incomplete rows (course without a published snapshot) are completed.
-- Content drift never overwrites the stored original.

create function public.import_legacy_master_course(
  p_course_id uuid,
  p_title text,
  p_legacy_source_id text,
  p_legacy_content_version text,
  p_version_id uuid,
  p_content jsonb,
  p_published_by uuid
)
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  existing_id uuid;
  existing_visibility text;
  existing_version text;
  published_content jsonb;
  attempt integer;
begin
  if auth.uid() is not null and not public.is_training_platform_admin() then
    raise exception 'legacy-import:not-admin: only a training platform admin can import legacy courses';
  end if;
  if p_course_id is null
     or p_title is null
     or p_legacy_source_id is null
     or p_legacy_content_version is null
     or p_version_id is null
     or p_content is null
     or p_published_by is null then
    raise exception 'legacy-import:arguments-required: import arguments are required';
  end if;
  if auth.uid() is not null and p_published_by is distinct from auth.uid() then
    raise exception 'legacy-import:published-by-mismatch: published_by must be the signed-in platform admin';
  end if;
  if not exists (
    select 1
    from public.training_platform_admins as admin
    where admin.user_id = p_published_by
  ) then
    raise exception 'legacy-import:published-by-not-admin: published_by must be a training platform admin';
  end if;
  if jsonb_typeof(p_content) <> 'object' then
    raise exception 'legacy-import:content-not-object: import content must be an object';
  end if;

  for attempt in 1..2 loop
    select course.id, course.visibility, course.legacy_content_version
      into existing_id, existing_visibility, existing_version
    from public.training_master_courses as course
    where course.legacy_source_id = btrim(p_legacy_source_id)
    for update;

    if existing_id is not null then
      if existing_visibility is distinct from 'private' then
        raise exception 'legacy-import:existing-not-private: existing master % is %; importer will not change visibility or duplicate it', existing_id, existing_visibility;
      end if;
      if existing_id is distinct from p_course_id then
        raise exception 'legacy-import:legacy-id-collision: LearnDash % already maps to master %', btrim(p_legacy_source_id), existing_id;
      end if;

      perform 1
      from public.training_master_course_versions as version
      where version.course_id = existing_id
      for update;

      select version.content
        into published_content
      from public.training_master_course_versions as version
      where version.course_id = existing_id
        and version.status = 'published';

      if found then
        if published_content is distinct from p_content then
          raise exception 'legacy-import:content-drift: published snapshot for LearnDash % does not match this export. The original was not overwritten', btrim(p_legacy_source_id);
        end if;
        return 'unchanged';
      end if;

      delete from public.training_master_course_versions
      where course_id = existing_id;
      update public.training_master_courses
      set
        title = btrim(p_title),
        legacy_content_version = btrim(p_legacy_content_version)
      where id = existing_id;
      insert into public.training_master_course_versions (
        id,
        course_id,
        version,
        status,
        content,
        published_by
      ) values (
        p_version_id,
        existing_id,
        1,
        'published',
        p_content,
        p_published_by
      );
      return 'imported';
    end if;

    begin
      insert into public.training_master_courses (
        id,
        title,
        visibility,
        legacy_source_id,
        legacy_content_version
      ) values (
        p_course_id,
        btrim(p_title),
        'private',
        btrim(p_legacy_source_id),
        btrim(p_legacy_content_version)
      );
      insert into public.training_master_course_versions (
        id,
        course_id,
        version,
        status,
        content,
        published_by
      ) values (
        p_version_id,
        p_course_id,
        1,
        'published',
        p_content,
        p_published_by
      );
      return 'imported';
    exception
      when unique_violation then
        if attempt = 2 then
          raise exception 'legacy-import:race: concurrent import could not be reconciled';
        end if;
    end;
  end loop;

  raise exception 'legacy-import:race: concurrent import could not be reconciled';
end;
$$;

revoke all on function public.import_legacy_master_course(uuid, text, text, text, uuid, jsonb, uuid) from public;
grant execute on function public.import_legacy_master_course(uuid, text, text, text, uuid, jsonb, uuid) to authenticated;
