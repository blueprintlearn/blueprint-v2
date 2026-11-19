# Legacy curriculum import (Stage 4.2)

Local-only mapping of the original Blueprint V1 LearnDash catalog into Blueprint V2 **private** master courses. This is a faithful IP migration, not a rewrite.

Do not apply hosted migrations, import trainee accounts, import progress, publish imported courses to the Starter Library, or merge this work without independent review.

Source of truth for product rules remains `docs/01`–`05`. Stage 4.1 library rules remain in `docs/07_TRAINING_LIBRARY.md`. The export location remains `docs/06_CURRICULUM_IMPORT_SPEC.md`.

## Canonical source

Inspected on branch `curriculum-learndash-export` (`7129e75`):

| File | Role |
| --- | --- |
| `scripts/data/learndash-export-production.json` | Canonical Cloudways LearnDash export, generated 2026-08-03. **Stays off `main`.** Contains quiz answer keys and 9 assignment submissions. |
| `scripts/data/learndash-export-v2-verified.json` | Different demo site. Schema notes only. |
| `scripts/data/lms-curriculum-tree.md` | Human-readable tree of the production export. |

The importer reads the export from a local path (`--export` or `BLUEPRINT_LEGACY_EXPORT`). It never commits the raw JSON to `main`.

## Inventory (production export, 2026-08-03)

Top-level keys: `export_info`, `taxonomies`, `courses`, `unassigned_lessons`, `unassigned_quizzes`, `assignment_submissions`.

| Record | In export | Imported |
| --- | --- | --- |
| Assigned courses | 16 | 16 private masters |
| Lessons in those courses | 242 | 242, original order |
| Topics | 0 | nothing to import |
| In-lesson quizzes | 103 | 103 |
| Course-level quiz rows | 103 | skipped as duplicates of the in-lesson quizzes |
| Questions on those quizzes | 356 (`single` 349, `multiple` 3, `matrix_sort_answer` 4) | 356 |
| Assignment upload lessons | 60 | 60 assignment blocks; no learner files |
| Lesson Vimeo refs | 289 | 289 video blocks (original `url`, not rewritten) |
| Question-level Vimeo refs | 6 | 6 video blocks |
| YouTube refs | 2 | 2 video blocks (one URL is malformed in the export and kept as-is) |
| Downloadable links | 186 | 186 resource blocks |
| Unassigned lessons | 20 | skipped (orphans; several point at retired course ids 28421 / 28674) |
| Unassigned quizzes | 16 | skipped |
| Assignment submissions | 9 | skipped (`author_id` + Cloudways `file_link`) |
| Trainee accounts / progress | not in this export | not imported |

LearnDash `status: publish` on 15 courses is **not** Starter visibility. Every imported course is private, including `onboarding-for-instructors` which was already `private` in WordPress.

### Assigned courses

| LearnDash id | Slug | Title | WP status | Lessons | Quizzes | Questions | Assignments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 28417 | beatmixing-basics | Beatmixing Basics | publish | 5 | 0 | 0 | 5 |
| 28419 | controller-extension | Controller Extension | publish | 8 | 0 | 0 | 2 |
| 28881 | how-to-train-an-event-dj-2 | How to Train an Event DJ | publish | 9 | 8 | 27 | 0 |
| 28303 | onboarding-for-instructors | Onboarding [For Instructors] | private | 6 | 1 | 3 | 1 |
| 28931 | social-media-success | Social Media Success | publish | 9 | 9 | 42 | 0 |
| 28770 | the-art-of-networking | The Art of Networking | publish | 5 | 5 | 23 | 0 |
| 27976 | event-assistant | Event Assistant | publish | 42 | 22 | 71 | 6 |
| 25905 | beatmixing-bootcamp-instructor | Beatmixing Bootcamp | publish | 23 | 0 | 0 | 17 |
| 28809 | curating-a-vibe-2 | Curating A Vibe | publish | 5 | 0 | 0 | 0 |
| 26067 | event-dj-foundations-instructor | Event DJ Foundations | publish | 77 | 33 | 103 | 17 |
| 25649 | event-lighting-instructor | Event Lighting Course | publish | 16 | 10 | 32 | 4 |
| 27865 | observer-basics | Observation Basics | publish | 3 | 3 | 11 | 1 |
| 28810 | scratch-toolkit-2 | Scratch Toolkit | publish | 10 | 0 | 0 | 0 |
| 28808 | the-master-mc-2 | The Master MC | publish | 10 | 4 | 18 | 3 |
| 28521 | uplighting | UPLIGHTING | publish | 4 | 3 | 10 | 1 |
| 25339 | soundswitch-tutorial | SoundSwitch Tutorial | publish | 10 | 5 | 16 | 3 |

Lesson `order` is sequential per course (Social Media Success starts at 0). The importer sorts by `order` then id.

## Mapping

| Export | V2 |
| --- | --- |
| course id | `training_master_courses.id` = uuid v5(`course:{id}`) and `legacy_source_id` |
| course modified / export date | `legacy_content_version` = `learndash-2026-08-03` |
| lesson id, order, title | `CourseContent.lessons[]` in export order |
| `content_html` | text block, `format: "html"` (not rewritten) |
| `media.vimeo[].url` | video block; player URLs are not rewritten |
| `links[]` | resource blocks |
| quiz + `answers[].correct` | quiz block inside the version snapshot |
| `matrix_sort_answer` | `matrix_sort` question kind; `sortString` + original answer HTML |
| `assignment.upload_enabled` | assignment block, no learner files |
| WP `publish` / `private` | master visibility **private** |

Deterministic ids live in `lib/blueprint/training-legacy-ids.ts` (namespace `8f2c6d1a-9b47-5e0c-a3d1-6e5b4c7a9012`). The full course / lesson / quiz / question / assignment map is `docs/legacy-curriculum/identifier-map.json`.

Future progress migration should key off LearnDash post ids (`legacy.sourceId`), then look up the v5 UUID. This stage does not import or reset progress.

## Schema extensions (backward compatible)

The original catalog does not fit the Stage 4.1 editor caps:

| Limit | 4.1 | 4.2 | Why |
| --- | --- | --- | --- |
| `LESSON_MAX` | 40 | 80 | Event DJ Foundations has 77 lessons |
| `BODY_MAX` | 8,000 | 50,000 | The Art of Networking “Interact” HTML is 42,962 characters |
| `DESCRIPTION_MAX` | 400 | 2,000 | Beatmixing Bootcamp description is 448 characters |
| `OPTION_MAX` | 6 | 8 | matrix-sort questions have up to 8 pairs |
| `OPTION_LABEL_MAX` | 80 (shared title) | 200 | several answer texts exceed 80 characters |
| `RETRY_MAX` | 20 | 50 | 77 quizzes set LearnDash `retry_repeats` to 50 |
| version `content` size | 256 KiB | 1 MiB | large HTML courses |
| question kinds | four | plus `matrix_sort` | 4 matching questions |
| text blocks | plain | optional `format: "html"` | preserve original HTML |

A unique index on `training_master_courses.legacy_source_id` makes re-runs idempotent.

## What is preserved vs reported

Preserved in the master snapshot: titles, lesson order, HTML, Vimeo/YouTube URLs, Drive links, quiz prompts, answer labels, correct flags, matrix pairs, assignment upload flags, LearnDash ids.

Reported, not invented, not dropped silently:

| Code | Count | Handling |
| --- | --- | --- |
| `unassigned-lesson` / `unassigned-quiz` | 20 / 16 | skipped by contract |
| `assignment-submission` | 9 | skipped; no trainee files |
| `trainee-progress` | 1 | skipped by contract |
| `course-quiz-already-on-lesson` | 103 | not imported twice |
| `course-prerequisites` | 3 | Beatmixing Bootcamp, Event Lighting, SoundSwitch. Not turned into a training path |
| `matrix-sort-extension` | 4 | stored as `matrix_sort` |
| `broken-answer-message` | 356 | export has `[object Object]`; messages were not repaired |
| `malformed-youtube-url` | 1 | URL kept exactly as exported |
| `wordpress-publish-is-not-starter` | 15 | private, not Starter |
| `assignment-files-not-imported` | 60 | requirement imported, files not |
| `intended-role-not-in-export` | 16 | library default role `DJ` |
| `duration-estimated` | 16 | duration is not a LearnDash field |

Product decisions still required later: whether those three LearnDash prerequisite links become V2 paths; whether image-only quiz choices get a dedicated UI; Vimeo account transfer and Google Drive cleanup.

## Dry-run reconciliation (this PR)

`docs/legacy-curriculum/reconciliation.json` is the dry-run against the 2026-08-03 production export:

- 16 courses, 242 lessons, 103 quizzes, 356 questions mapped
- 0 failed schema validations
- every course visibility `private`
- no Starter publication

The local seed still contains the Stage 4.1 placeholder “Legacy Beatmixing (import)” with `legacy_source_id = beatmixing-basics`. Real import uses numeric LearnDash ids (`28417`, …), so it does not collide with that placeholder.

## Future approved import (local only)

1. Do not run this against hosted staging or production until that apply is separately named.
2. Checkout the export without committing it: `git show curriculum-learndash-export:scripts/data/learndash-export-production.json > /tmp/learndash-export-production.json`
3. Local Supabase only (`supabase start` + `db reset` from committed migrations).
4. Dry-run: `pnpm curriculum:import -- --export /tmp/learndash-export-production.json`
5. Apply: `pnpm curriculum:import -- --apply --export /tmp/learndash-export-production.json`
6. `--apply` refuses non-local database URLs, stamps `published_by` from `training_platform_admins`, writes **private published** version 1 (frozen original, not Starter), and no-ops when `legacy_source_id` + `legacy_content_version` already match.
7. Do not import trainees, progress, or assignment files. Do not set visibility to `starter`.

A later AI modernization must copy into a new draft/version. It must not overwrite these published originals.
