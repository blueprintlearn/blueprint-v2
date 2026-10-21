# Curriculum import specification

Status: Bravo planning only. **Do not import, seed, or migrate hosted databases from this document.**

Source of truth for product rules remains `docs/01`–`05`. This spec only says what Bravo may import later, and from where.

## Canonical export

Use `scripts/data/learndash-export-production.json` (Cloudways LearnDash, generated 2026-08-03). It is on branch `curriculum-learndash-export` (`7129e75`).

Raw LearnDash exports stay off `main`. They contain learner submissions and quiz answer keys. Any later importer must read the export from outside `main`, and only a reviewed, sanitized subset may ever be committed.

Treat `scripts/data/learndash-export-v2-verified.json` as a different demo site. Use it for schema notes only.

Do not import:

- `assignment_submissions` (9 rows, Cloudways `file_link` + `author_id`)
- unassigned lessons (20) or unassigned quizzes (16)
- the full 242-lesson catalog on the first importer

Quiz answer keys (`answers[].correct`) are in the JSON. Treat the file as sensitive.

## First import subset (prove the model)

About 20–30 lessons:

1. `beatmixing-basics` — 5 lessons, Vimeo, assignment upload, no quizzes
2. `how-to-train-an-event-dj-2` — 9 lessons, 8 quizzes, 27 single-choice questions
3. `onboarding-for-instructors` — 6 lessons, private course, 1 quiz, 1 assignment
4. One edge course: `soundswitch-tutorial` (multiple-choice) **or** `the-master-mc-2` (matrix sort)

This is enough to prove course → lesson → video → quiz → assignment without Event DJ Foundations (77 lessons) or Event Assistant (42).

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

## Open decisions (David)

1. Land `scripts/data/` on `main` via `curriculum-learndash-export`, or keep the export off `main` until the importer exists.
2. First edge course: SoundSwitch or Master MC.
3. Hosted staging import: only after a named migrate yes. Never production seed.

## Out of scope until a later Bravo slice

Importer code, hosted apply, Vimeo account transfer, Google Drive cleanup, remaining 200+ lessons, learner progress, certificates, drip, topics (export has none).
