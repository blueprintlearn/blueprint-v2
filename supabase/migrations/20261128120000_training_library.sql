-- Stage 4.1: master and company training libraries, versioned courses and paths.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved, and not before Stage 3.7
-- (20261127120000_company_training_preparations) is present in that environment.
--
-- Hosted apply order: Stage 3.2 recruiting pages, then Stage 3.3 applicants,
-- then Stage 3.4 interviews, then Stage 3.5 candidate review, then Stage 3.6
-- hiring workflow, then Stage 3.7 training preparations, then this Stage 4.1
-- migration (20261128120000_training_library).
-- Do not enable live recruiting, trainee enrollment, grading, or certification.
-- Stage 2 and Stage 3.1 hosted applies are not required for local 4.1.
--
-- Imported legacy content must default to private master visibility.
-- Company copies are independent. Published versions are immutable.
-- There is no trainee account, enrollment, progress, invitation, or certificate.

create table public.training_platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_training_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.training_platform_admins
    where user_id = auth.uid()
  );
$$;

create function public.is_guided_company_owner()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.company_memberships as membership
    where membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
      and public.is_guided_blueprint_company(membership.company_id)
  );
$$;

create function public.is_guided_owner_of(p_company_id uuid)
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
      and membership.role = 'owner_admin'
      and public.is_guided_blueprint_company(p_company_id)
  );
$$;

create table public.training_master_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  visibility text not null default 'private',
  legacy_source_id text,
  legacy_content_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_master_courses_title_len
    check (char_length(btrim(title)) between 1 and 80),
  constraint training_master_courses_visibility
    check (visibility in ('private', 'starter', 'archived')),
  constraint training_master_courses_legacy_id
    check (legacy_source_id is null or char_length(btrim(legacy_source_id)) between 1 and 120),
  constraint training_master_courses_legacy_version
    check (legacy_content_version is null or char_length(btrim(legacy_content_version)) between 1 and 120)
);

create table public.training_master_course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.training_master_courses (id) on delete cascade,
  version integer not null,
  status text not null,
  content jsonb not null,
  published_by uuid references auth.users (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_master_course_versions_positive
    check (version >= 1),
  constraint training_master_course_versions_status
    check (status in ('draft', 'published', 'superseded')),
  constraint training_master_course_versions_unique
    unique (course_id, version),
  constraint training_master_course_versions_content_object
    check (jsonb_typeof(content) = 'object'),
  constraint training_master_course_versions_content_size
    check (octet_length(content::text) <= 262144),
  constraint training_master_course_versions_draft_stamp
    check (status <> 'draft' or (published_by is null and published_at is null)),
  constraint training_master_course_versions_published_stamp
    check (
      status not in ('published', 'superseded')
      or (published_by is not null and published_at is not null)
    )
);

create unique index training_master_course_versions_one_draft
  on public.training_master_course_versions (course_id)
  where status = 'draft';

create unique index training_master_course_versions_one_published
  on public.training_master_course_versions (course_id)
  where status = 'published';

create table public.company_training_courses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  origin text not null,
  source_master_course_id uuid references public.training_master_courses (id) on delete set null,
  source_master_version integer,
  library_status text not null default 'active',
  legacy_source_id text,
  legacy_content_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_training_courses_title_len
    check (char_length(btrim(title)) between 1 and 80),
  constraint company_training_courses_origin
    check (origin in ('original', 'adopted')),
  constraint company_training_courses_library_status
    check (library_status in ('active', 'archived')),
  constraint company_training_courses_source_version
    check (source_master_version is null or source_master_version >= 1),
  constraint company_training_courses_origin_source
    check (
      (origin = 'original' and source_master_course_id is null and source_master_version is null)
      or (origin = 'adopted' and source_master_course_id is not null and source_master_version is not null)
    ),
  constraint company_training_courses_legacy_id
    check (legacy_source_id is null or char_length(btrim(legacy_source_id)) between 1 and 120),
  constraint company_training_courses_legacy_version
    check (legacy_content_version is null or char_length(btrim(legacy_content_version)) between 1 and 120)
);

create table public.company_training_course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.company_training_courses (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null,
  status text not null,
  content jsonb not null,
  published_by uuid references auth.users (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_training_course_versions_positive
    check (version >= 1),
  constraint company_training_course_versions_status
    check (status in ('draft', 'published', 'superseded')),
  constraint company_training_course_versions_unique
    unique (course_id, version),
  constraint company_training_course_versions_content_object
    check (jsonb_typeof(content) = 'object'),
  constraint company_training_course_versions_content_size
    check (octet_length(content::text) <= 262144),
  constraint company_training_course_versions_draft_stamp
    check (status <> 'draft' or (published_by is null and published_at is null)),
  constraint company_training_course_versions_published_stamp
    check (
      status not in ('published', 'superseded')
      or (published_by is not null and published_at is not null)
    )
);

create unique index company_training_course_versions_one_draft
  on public.company_training_course_versions (course_id)
  where status = 'draft';

create unique index company_training_course_versions_one_published
  on public.company_training_course_versions (course_id)
  where status = 'published';

create index company_training_courses_company_status
  on public.company_training_courses (company_id, library_status);

create table public.company_training_paths (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  library_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_training_paths_title_len
    check (char_length(btrim(title)) between 1 and 80),
  constraint company_training_paths_library_status
    check (library_status in ('active', 'archived'))
);

create table public.company_training_path_versions (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.company_training_paths (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null,
  status text not null,
  content jsonb not null,
  published_by uuid references auth.users (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_training_path_versions_positive
    check (version >= 1),
  constraint company_training_path_versions_status
    check (status in ('draft', 'published', 'superseded')),
  constraint company_training_path_versions_unique
    unique (path_id, version),
  constraint company_training_path_versions_content_object
    check (jsonb_typeof(content) = 'object'),
  constraint company_training_path_versions_content_size
    check (octet_length(content::text) <= 262144),
  constraint company_training_path_versions_draft_stamp
    check (status <> 'draft' or (published_by is null and published_at is null)),
  constraint company_training_path_versions_published_stamp
    check (
      status not in ('published', 'superseded')
      or (published_by is not null and published_at is not null)
    )
);

create unique index company_training_path_versions_one_draft
  on public.company_training_path_versions (path_id)
  where status = 'draft';

create unique index company_training_path_versions_one_published
  on public.company_training_path_versions (path_id)
  where status = 'published';

create index company_training_paths_company_status
  on public.company_training_paths (company_id, library_status);

create function public.training_master_courses_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'id cannot change';
  end if;
  if new.visibility = 'starter' and not exists (
    select 1
    from public.training_master_course_versions as version
    where version.course_id = new.id
      and version.status = 'published'
  ) then
    raise exception 'starter courses need a published version';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger training_master_courses_touch
before insert or update on public.training_master_courses
for each row
execute function public.training_master_courses_touch();

create function public.training_version_row_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.course_id is distinct from old.course_id then
      raise exception 'course_id cannot change';
    end if;
    if new.version is distinct from old.version then
      raise exception 'version cannot change';
    end if;
    if old.status in ('published', 'superseded') then
      if new.content is distinct from old.content
         or new.published_by is distinct from old.published_by
         or new.published_at is distinct from old.published_at then
        raise exception 'published training versions are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded training versions cannot change status';
      end if;
      if old.status = 'published' and new.status not in ('published', 'superseded') then
        raise exception 'a published training version can only be superseded';
      end if;
    end if;
  end if;

  if new.status = 'draft' then
    new.published_by := null;
    new.published_at := null;
  elsif new.status in ('published', 'superseded')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.status = 'published' then
    new.published_by := coalesce(auth.uid(), new.published_by);
    new.published_at := now();
    if new.published_by is null then
      raise exception 'published_by is required';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger training_master_course_versions_touch
before insert or update on public.training_master_course_versions
for each row
execute function public.training_version_row_touch();

create function public.company_training_courses_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
    if new.origin is distinct from old.origin then
      raise exception 'origin cannot change';
    end if;
    if new.source_master_course_id is distinct from old.source_master_course_id
       and old.source_master_course_id is not null
       and new.source_master_course_id is distinct from old.source_master_course_id then
      raise exception 'source master course cannot change';
    end if;
  end if;

  if new.origin = 'adopted' then
    if not exists (
      select 1
      from public.training_master_courses as master
      where master.id = new.source_master_course_id
        and master.visibility = 'starter'
    ) then
      raise exception 'company courses can only adopt starter master courses';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_training_courses_touch
before insert or update on public.company_training_courses
for each row
execute function public.company_training_courses_touch();

create function public.company_training_course_versions_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.course_id is distinct from old.course_id then
      raise exception 'course_id cannot change';
    end if;
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
    if new.version is distinct from old.version then
      raise exception 'version cannot change';
    end if;
    if old.status in ('published', 'superseded') then
      if new.content is distinct from old.content
         or new.published_by is distinct from old.published_by
         or new.published_at is distinct from old.published_at then
        raise exception 'published training versions are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded training versions cannot change status';
      end if;
      if old.status = 'published' and new.status not in ('published', 'superseded') then
        raise exception 'a published training version can only be superseded';
      end if;
    end if;
  end if;

  if not exists (
    select 1
    from public.company_training_courses as course
    where course.id = new.course_id
      and course.company_id = new.company_id
  ) then
    raise exception 'course company_id must match';
  end if;

  if new.status = 'draft' then
    new.published_by := null;
    new.published_at := null;
  elsif new.status in ('published', 'superseded')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.status = 'published' then
    new.published_by := coalesce(auth.uid(), new.published_by);
    new.published_at := now();
    if new.published_by is null then
      raise exception 'published_by is required';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_training_course_versions_touch
before insert or update on public.company_training_course_versions
for each row
execute function public.company_training_course_versions_touch();

create function public.company_training_paths_touch()
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

create trigger company_training_paths_touch
before insert or update on public.company_training_paths
for each row
execute function public.company_training_paths_touch();

create function public.company_training_path_versions_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.path_id is distinct from old.path_id then
      raise exception 'path_id cannot change';
    end if;
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
    if new.version is distinct from old.version then
      raise exception 'version cannot change';
    end if;
    if old.status in ('published', 'superseded') then
      if new.content is distinct from old.content
         or new.published_by is distinct from old.published_by
         or new.published_at is distinct from old.published_at then
        raise exception 'published training versions are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded training versions cannot change status';
      end if;
      if old.status = 'published' and new.status not in ('published', 'superseded') then
        raise exception 'a published training version can only be superseded';
      end if;
    end if;
  end if;

  if not exists (
    select 1
    from public.company_training_paths as path
    where path.id = new.path_id
      and path.company_id = new.company_id
  ) then
    raise exception 'path company_id must match';
  end if;

  if new.status = 'draft' then
    new.published_by := null;
    new.published_at := null;
  elsif new.status in ('published', 'superseded')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.status = 'published' then
    new.published_by := coalesce(auth.uid(), new.published_by);
    new.published_at := now();
    if new.published_by is null then
      raise exception 'published_by is required';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_training_path_versions_touch
before insert or update on public.company_training_path_versions
for each row
execute function public.company_training_path_versions_touch();

alter table public.training_platform_admins enable row level security;
alter table public.training_master_courses enable row level security;
alter table public.training_master_course_versions enable row level security;
alter table public.company_training_courses enable row level security;
alter table public.company_training_course_versions enable row level security;
alter table public.company_training_paths enable row level security;
alter table public.company_training_path_versions enable row level security;

revoke all on table public.training_platform_admins from public, anon, authenticated;
revoke all on table public.training_master_courses from public, anon, authenticated;
revoke all on table public.training_master_course_versions from public, anon, authenticated;
revoke all on table public.company_training_courses from public, anon, authenticated;
revoke all on table public.company_training_course_versions from public, anon, authenticated;
revoke all on table public.company_training_paths from public, anon, authenticated;
revoke all on table public.company_training_path_versions from public, anon, authenticated;

grant select on table public.training_platform_admins to authenticated;
grant select, insert, update, delete on table public.training_master_courses to authenticated;
grant select, insert, update, delete on table public.training_master_course_versions to authenticated;
grant select, insert, update, delete on table public.company_training_courses to authenticated;
grant select, insert, update, delete on table public.company_training_course_versions to authenticated;
grant select, insert, update, delete on table public.company_training_paths to authenticated;
grant select, insert, update, delete on table public.company_training_path_versions to authenticated;

revoke all on function public.is_training_platform_admin() from public;
revoke all on function public.is_guided_company_owner() from public;
revoke all on function public.is_guided_owner_of(uuid) from public;
grant execute on function public.is_training_platform_admin() to authenticated;
grant execute on function public.is_guided_company_owner() to authenticated;
grant execute on function public.is_guided_owner_of(uuid) to authenticated;

create policy training_platform_admins_self_select
on public.training_platform_admins
for select
to authenticated
using (user_id = auth.uid());

create policy training_master_courses_select
on public.training_master_courses
for select
to authenticated
using (
  public.is_training_platform_admin()
  or (visibility = 'starter' and public.is_guided_company_owner())
);

create policy training_master_courses_admin_insert
on public.training_master_courses
for insert
to authenticated
with check (public.is_training_platform_admin());

create policy training_master_courses_admin_update
on public.training_master_courses
for update
to authenticated
using (public.is_training_platform_admin())
with check (public.is_training_platform_admin());

create policy training_master_courses_admin_delete
on public.training_master_courses
for delete
to authenticated
using (public.is_training_platform_admin());

create policy training_master_course_versions_select
on public.training_master_course_versions
for select
to authenticated
using (
  public.is_training_platform_admin()
  or (
    status = 'published'
    and public.is_guided_company_owner()
    and exists (
      select 1
      from public.training_master_courses as course
      where course.id = training_master_course_versions.course_id
        and course.visibility = 'starter'
    )
  )
);

create policy training_master_course_versions_admin_insert
on public.training_master_course_versions
for insert
to authenticated
with check (public.is_training_platform_admin());

create policy training_master_course_versions_admin_update
on public.training_master_course_versions
for update
to authenticated
using (public.is_training_platform_admin())
with check (public.is_training_platform_admin());

create policy training_master_course_versions_admin_delete
on public.training_master_course_versions
for delete
to authenticated
using (public.is_training_platform_admin());

create policy company_training_courses_owner_select
on public.company_training_courses
for select
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_courses_owner_insert
on public.company_training_courses
for insert
to authenticated
with check (public.is_guided_owner_of(company_id));

create policy company_training_courses_owner_update
on public.company_training_courses
for update
to authenticated
using (public.is_guided_owner_of(company_id))
with check (public.is_guided_owner_of(company_id));

create policy company_training_courses_owner_delete
on public.company_training_courses
for delete
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_course_versions_owner_select
on public.company_training_course_versions
for select
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_course_versions_owner_insert
on public.company_training_course_versions
for insert
to authenticated
with check (public.is_guided_owner_of(company_id));

create policy company_training_course_versions_owner_update
on public.company_training_course_versions
for update
to authenticated
using (public.is_guided_owner_of(company_id))
with check (public.is_guided_owner_of(company_id));

create policy company_training_course_versions_owner_delete
on public.company_training_course_versions
for delete
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_paths_owner_select
on public.company_training_paths
for select
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_paths_owner_insert
on public.company_training_paths
for insert
to authenticated
with check (public.is_guided_owner_of(company_id));

create policy company_training_paths_owner_update
on public.company_training_paths
for update
to authenticated
using (public.is_guided_owner_of(company_id))
with check (public.is_guided_owner_of(company_id));

create policy company_training_paths_owner_delete
on public.company_training_paths
for delete
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_path_versions_owner_select
on public.company_training_path_versions
for select
to authenticated
using (public.is_guided_owner_of(company_id));

create policy company_training_path_versions_owner_insert
on public.company_training_path_versions
for insert
to authenticated
with check (public.is_guided_owner_of(company_id));

create policy company_training_path_versions_owner_update
on public.company_training_path_versions
for update
to authenticated
using (public.is_guided_owner_of(company_id))
with check (public.is_guided_owner_of(company_id));

create policy company_training_path_versions_owner_delete
on public.company_training_path_versions
for delete
to authenticated
using (public.is_guided_owner_of(company_id));
