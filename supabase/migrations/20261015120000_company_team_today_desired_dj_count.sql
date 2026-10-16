alter table public.company_team_today
  add column desired_dj_count integer
  constraint company_team_today_desired_dj_count_range
    check (desired_dj_count between 0 and 999);
