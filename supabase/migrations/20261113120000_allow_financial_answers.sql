-- Slice 7: allow N* financial intake keys in company_blueprint_answers.
-- Local database only. Do not apply to hosted, staging, or production.
--
-- The original no_financial check blocked N keys until this slice. Numbers
-- reuse the existing answers table, RLS, and owner-only writes. N2 is the UI
-- alias for E2 annual volume and must not be stored as a second row.
--
-- Production-release blocker (S2-7): authenticated owners can still write
-- company_blueprint_answers directly and bypass BLUEPRINT_GUIDED_COMPANY_IDS.
-- This migration does not change that. Do not apply it to production.

alter table public.company_blueprint_answers
  drop constraint company_blueprint_answers_no_financial;

alter table public.company_blueprint_answers
  add constraint company_blueprint_answers_shared_volume_is_e2
    check (question_key <> 'N2');
