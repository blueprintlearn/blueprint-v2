create table public.company_team_today (
  company_id uuid primary key references public.companies (id) on delete cascade,
  current_dj_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_team_today_dj_count_range check (
    current_dj_count between 0 and 999
  )
);

alter table public.company_team_today enable row level security;

revoke all on table public.company_team_today from public, anon, authenticated;
grant select, insert, update on table public.company_team_today to authenticated;

create policy team_today_select_member
on public.company_team_today
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_team_today.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

create policy team_today_insert_owner
on public.company_team_today
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_team_today.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
);

create policy team_today_update_owner
on public.company_team_today
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_team_today.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
)
with check (
  exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = company_team_today.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner_admin'
  )
);

create function public.reject_company_team_today_company_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot change';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger company_team_today_lock_company_id
before update on public.company_team_today
for each row
execute function public.reject_company_team_today_company_id_change();

revoke all on function public.reject_company_team_today_company_id_change() from public, anon, authenticated;
