create type public.system_role as enum (
  'owner_admin',
  'manager',
  'trainer_mentor',
  'dj_trainee'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_name_not_blank check (length(trim(name)) > 0)
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.system_role not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint company_memberships_status_check check (status in ('active', 'inactive')),
  constraint company_memberships_company_user_key unique (company_id, user_id)
);

alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;

revoke all on table public.companies from public, anon, authenticated;
revoke all on table public.company_memberships from public, anon, authenticated;

grant select, update on table public.companies to authenticated;
grant select on table public.company_memberships to authenticated;

create policy companies_select_member
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = companies.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

create policy companies_update_owner
on public.companies
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = companies.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = companies.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
);

-- Own-row select avoids RLS recursion on company_memberships.
-- Slice 0.1 has one member per company; same-company member listing waits.
create policy memberships_select_own
on public.company_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  and status = 'active'
);

create function public.create_company(p_name text)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_company public.companies;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_name := trim(p_name);
  if v_name is null or length(v_name) = 0 then
    raise exception 'Company name is required';
  end if;

  insert into public.companies (name)
  values (v_name)
  returning * into v_company;

  insert into public.company_memberships (company_id, user_id, role, status)
  values (v_company.id, v_user_id, 'owner_admin', 'active');

  return v_company;
end;
$$;

revoke all on function public.create_company(text) from public, anon;
grant execute on function public.create_company(text) to authenticated;
