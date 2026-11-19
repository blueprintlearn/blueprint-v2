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
