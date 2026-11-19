-- Stage 3.2: versioned job ads and Blueprint-hosted recruiting pages.
-- Local database only. Do not apply to hosted, staging, or production until
-- that apply is separately approved.
--
-- Independent of Stage 2 and Stage 3.1 hosted applies. This table references
-- companies only. The approved recruitment strategy id/version are application
-- data, not a foreign key. Pending hosted migrations do not block local 3.2.
--
-- Draft rows are owner-only. Published rows are readable by anyone through
-- get_published_recruiting_page, which returns page content and never ads.

create table public.company_recruiting_pages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null,
  status text not null,
  slug text not null,
  source_fingerprint text not null,
  source_strategy_id uuid,
  source_strategy_version integer,
  page_content jsonb not null,
  ads_content jsonb not null,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_recruiting_pages_version_positive
    check (version >= 1),
  constraint company_recruiting_pages_status_allowed
    check (status in ('draft', 'published', 'unpublished', 'superseded')),
  constraint company_recruiting_pages_company_version
    unique (company_id, version),
  constraint company_recruiting_pages_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  constraint company_recruiting_pages_fingerprint_size
    check (char_length(source_fingerprint) <= 128),
  constraint company_recruiting_pages_strategy_version
    check (source_strategy_version is null or source_strategy_version >= 1),
  constraint company_recruiting_pages_page_object
    check (jsonb_typeof(page_content) = 'object'),
  constraint company_recruiting_pages_page_size
    check (octet_length(page_content::text) <= 65536),
  constraint company_recruiting_pages_ads_object
    check (jsonb_typeof(ads_content) = 'object'),
  constraint company_recruiting_pages_ads_size
    check (octet_length(ads_content::text) <= 65536),
  constraint company_recruiting_pages_draft_has_no_stamp
    check (
      status <> 'draft'
      or (published_by is null and published_at is null)
    ),
  constraint company_recruiting_pages_published_has_stamp
    check (
      status not in ('published', 'unpublished')
      or (published_by is not null and published_at is not null)
    )
);

create unique index company_recruiting_pages_one_draft
  on public.company_recruiting_pages (company_id)
  where status = 'draft';

create unique index company_recruiting_pages_one_published
  on public.company_recruiting_pages (company_id)
  where status = 'published';

create unique index company_recruiting_pages_public_slug
  on public.company_recruiting_pages (slug)
  where status in ('published', 'unpublished');

create index company_recruiting_pages_company_status
  on public.company_recruiting_pages (company_id, status, version desc);

create function public.company_recruiting_pages_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('draft', 'published', 'unpublished')
     and exists (
      select 1
      from public.company_recruiting_pages as page
      where page.slug = new.slug
        and page.company_id is distinct from new.company_id
        and page.status in ('draft', 'published', 'unpublished')
        and page.id is distinct from coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
    raise exception 'slug is taken';
  end if;

  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot change';
    end if;
    if new.version is distinct from old.version then
      raise exception 'version cannot change';
    end if;
    if old.status in ('published', 'unpublished', 'superseded') then
      if new.slug is distinct from old.slug
         or new.source_fingerprint is distinct from old.source_fingerprint
         or new.source_strategy_id is distinct from old.source_strategy_id
         or new.source_strategy_version is distinct from old.source_strategy_version
         or new.page_content is distinct from old.page_content
         or new.ads_content is distinct from old.ads_content
         or new.published_by is distinct from old.published_by
         or new.published_at is distinct from old.published_at then
        raise exception 'published recruiting pages are read-only';
      end if;
      if old.status = 'superseded' and new.status is distinct from 'superseded' then
        raise exception 'superseded recruiting pages cannot change status';
      end if;
      if old.status = 'unpublished' and new.status not in ('unpublished', 'superseded') then
        raise exception 'an unpublished page cannot become current without a new version';
      end if;
      if old.status = 'published' and new.status not in ('published', 'unpublished', 'superseded') then
        raise exception 'a published page can only be unpublished or superseded';
      end if;
    end if;
  end if;

  if new.status = 'draft' then
    new.published_by := null;
    new.published_at := null;
  elsif new.status in ('published', 'unpublished')
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

create trigger company_recruiting_pages_touch
before insert or update on public.company_recruiting_pages
for each row
execute function public.company_recruiting_pages_touch();

create function public.get_published_recruiting_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) not between 3 and 48 then
    return null;
  end if;

  select jsonb_build_object(
    'id', page.id,
    'company_id', page.company_id,
    'version', page.version,
    'slug', page.slug,
    'page_content', page.page_content,
    'published_at', page.published_at
  )
  into result
  from public.company_recruiting_pages as page
  where page.slug = p_slug
    and page.status = 'published'
  limit 1;

  return result;
end;
$$;

create function public.recruiting_slug_taken(p_slug text, p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_recruiting_pages as page
    where page.slug = p_slug
      and page.company_id is distinct from p_company_id
      and page.status in ('draft', 'published', 'unpublished')
  );
$$;

alter table public.company_recruiting_pages enable row level security;

revoke all on table public.company_recruiting_pages from public, anon, authenticated;
grant select, insert, update, delete on table public.company_recruiting_pages to authenticated;

revoke all on function public.get_published_recruiting_page(text) from public;
grant execute on function public.get_published_recruiting_page(text) to anon, authenticated;

revoke all on function public.recruiting_slug_taken(text, uuid) from public;
grant execute on function public.recruiting_slug_taken(text, uuid) to authenticated;

create policy company_recruiting_pages_owner_select
on public.company_recruiting_pages
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruiting_pages.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruiting_pages.company_id)
);

create policy company_recruiting_pages_owner_insert
on public.company_recruiting_pages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruiting_pages.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruiting_pages.company_id)
);

create policy company_recruiting_pages_owner_update
on public.company_recruiting_pages
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruiting_pages.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruiting_pages.company_id)
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruiting_pages.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruiting_pages.company_id)
);

create policy company_recruiting_pages_owner_delete
on public.company_recruiting_pages
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_recruiting_pages.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
  and public.is_guided_blueprint_company(company_recruiting_pages.company_id)
);
