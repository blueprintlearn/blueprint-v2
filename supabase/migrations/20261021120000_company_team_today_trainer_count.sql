alter table public.company_team_today
  add column current_trainer_count integer
  constraint company_team_today_current_trainer_count_range
    check (current_trainer_count between 0 and 999);
