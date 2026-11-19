# Curriculum import specification

Status: Stage 4.2 mapper exists locally. **Do not import, seed, or migrate hosted databases from this document.**

Source of truth for product rules remains `docs/01`–`05`. Stage 4.2 implementation notes live in `docs/08_LEGACY_CURRICULUM_IMPORT.md`. This spec still says where the export lives and what must stay off `main`.

## Canonical export

Use `scripts/data/learndash-export-production.json` (Cloudways LearnDash, generated 2026-08-03). It is on branch `curriculum-learndash-export` (`7129e75`).

Raw LearnDash exports stay off `main`. They contain learner submissions and quiz answer keys. Any later importer must read the export from outside `main`, and only a reviewed, sanitized subset may ever be committed.

Treat `scripts/data/learndash-export-v2-verified.json` as a different demo site. Use it for schema notes only.

Do not import:

- `assignment_submissions` (9 rows, Cloudways `file_link` + `author_id`)
- unassigned lessons (20) or unassigned quizzes (16)
- trainee accounts or historical progress

Quiz answer keys (`answers[].correct`) are in the JSON. Treat the file as sensitive.

Stage 4.2 maps all 16 assigned courses / 242 in-course lessons into private masters. The earlier Bravo 4-course subset is still a useful smoke path, but it is not the Stage 4.2 scope.

## Target content model (later, after competency contract)

Map export fields to versioned **master-library** records, not company copies:

| Export | Intended Blueprint entity |
| --- | --- |
| course | master course (`is_system`, no `tenant_id`) |
| lesson | master lesson, ordered |
| `media.vimeo[]` | video reference (do not rewrite player URLs on import) |
| quiz + questions | quiz + items; keep correct flags server-side only |
| `assignment.upload_enabled` | assignment requirement, no learner files |
| course `status: private` | visibility, not published to every tenant |

Rules from the constitutions:

- Courses teach. They do not grant competency.
- Customizing master content forks a company copy.
- Updating a course must not change historical evidence.

Bravo will not write competency verifications or advancement rows.

## Decisions (David, 2026-10-21)

1. Raw exports stay off `main`.
2. Edge course is The Master MC.

## Still requires a named yes

Hosted staging import. Never production seed.

## Out of scope until a later slice

Hosted apply, Vimeo account transfer, Google Drive cleanup, learner progress, certificates, drip, topics (export has none), and turning LearnDash course prerequisites into V2 paths.
