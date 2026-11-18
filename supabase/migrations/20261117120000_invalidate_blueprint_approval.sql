-- Slice 10: durable Blueprint approval invalidation.
-- Local database only. Do not apply to hosted, staging, or production.
--
-- After a real R1 approval, any later intake write must bump currentRevision
-- in the same statement. A successful edit cannot leave the previous approval
-- valid, including when the owner later restores the earlier answers.
--
-- S2-7 switch enforcement is in 20261118120000_guided_blueprint_allowlist.sql.
-- This trigger invalidates an existing approval on later intake writes. It does
-- not stop an owner from writing R1 jsonb directly; the later migration stamps
-- approval owner, time, and revision from the session. Do not apply this
-- migration to production.

create function public.invalidate_blueprint_approval(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_company_id is null then
    return;
  end if;

  update public.company_blueprint_answers as answer
  set value = jsonb_set(
    answer.value,
    '{currentRevision}',
    to_jsonb(
      coalesce(
        case
          when jsonb_typeof(answer.value -> 'currentRevision') = 'number'
            then (answer.value ->> 'currentRevision')::integer
        end,
        case
          when jsonb_typeof(answer.value -> 'revision') = 'number'
            then (answer.value ->> 'revision')::integer
        end,
        0
      ) + 1
    ),
    true
  )
  where answer.company_id = p_company_id
    and answer.question_key = 'R1'
    and answer.state = 'answered'
    and jsonb_typeof(answer.value) = 'object'
    and coalesce(answer.value ->> 'code', '') = 'approved';
end;
$$;

create function public.company_blueprint_answers_invalidate_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_company uuid;
  target_key text;
begin
  if tg_op = 'DELETE' then
    target_company := old.company_id;
    target_key := old.question_key;
  else
    target_company := new.company_id;
    target_key := new.question_key;
  end if;

  if target_key is distinct from 'R1' then
    perform public.invalidate_blueprint_approval(target_company);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create function public.company_intake_invalidate_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.invalidate_blueprint_approval(old.company_id);
    return old;
  end if;
  perform public.invalidate_blueprint_approval(new.company_id);
  return new;
end;
$$;

create trigger company_blueprint_answers_invalidate_approval
after insert or update or delete on public.company_blueprint_answers
for each row
execute function public.company_blueprint_answers_invalidate_approval();

create trigger company_team_today_invalidate_approval
after insert or update or delete on public.company_team_today
for each row
execute function public.company_intake_invalidate_approval();

create trigger company_goals_invalidate_approval
after insert or update or delete on public.company_goals
for each row
execute function public.company_intake_invalidate_approval();

revoke all on function public.invalidate_blueprint_approval(uuid) from public, anon, authenticated;
revoke all on function public.company_blueprint_answers_invalidate_approval() from public, anon, authenticated;
revoke all on function public.company_intake_invalidate_approval() from public, anon, authenticated;
