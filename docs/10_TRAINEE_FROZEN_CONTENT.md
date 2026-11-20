# Trainee frozen-content viewer (Stage 4.4)

Local-only read of the published course or path snapshot frozen on an active enrollment. Trainees open assigned lessons and mixed content blocks. Quiz and assignment blocks are visible and cannot be submitted.

Do not apply hosted migrations, send live invitation email, or enable lesson completion, grading, sequential enforcement, or certification from this document.

Source of truth for product rules remains `docs/01`–`05`. Libraries remain in `docs/07_TRAINING_LIBRARY.md`. Enrollment remains in `docs/09_TRAINING_ENROLLMENT.md`.

## What this stage provides

- Trainee SELECT of `company_training_course_versions` / `company_training_path_versions` only when:
  - the viewer has an **active** company membership,
  - the viewer has an **active** enrollment for that course or path,
  - the version number matches `content_version`,
  - the version status is `published` or `superseded` (never `draft`).
- Trainee SELECT of own active enrollments only while the membership is active.
- Trainee surfaces at `/training`, `/training/assignments/[enrollmentId]`, and course lesson pages under that assignment.
- Frozen title and body after a later publish. Path assignments show frozen path metadata only; they do not load live course titles.
- Read-only quiz prompts/options and assignment instructions. Correct-answer keys are stripped from the trainee DTO.

## What this stage does not provide

- Lesson completion, progress tracking, or required-before-advance locks.
- Quiz submission, assignment upload, grading, or certification.
- Historical LearnDash trainee import.
- Real invitation email.
- Viewing private master curriculum.

## Hosted apply order

Do not apply until separately approved, and not before Stage 4.3 exists in that environment:

1. Stage 3.2 through Stage 3.7 recruiting and training-preparation migrations
2. Stage 4.1 `20261128120000_training_library`
3. Stage 4.1 follow-up `20261129120000_training_publish_atomicity`
4. Stage 4.2 `20261130120000_training_legacy_import`
5. Stage 4.3 `20261201120000_training_enrollment`
6. Stage 4.3 follow-up `20261202120000_training_enrollment_invite_fixes`
7. Stage 4.4 `20261203120000_training_trainee_viewer`

## Permissions

| Actor | View frozen assigned content |
| --- | --- |
| Active company member with an active enrollment | Yes, matching `content_version` only |
| Inactive company member, even with an enrollment row | No |
| Cancelled or revoked enrollment | No |
| Other company’s member | No |
| Anonymous | No |
| Guided owner | Owner library policies unchanged; the trainee viewer still loads the frozen enrollment version, not the current draft |
| Platform admin | No extra trainee-content rights |

`has_active_company_membership` and `can_view_frozen_training_version` are security-definer read helpers used by RLS. They do not write progress, grades, or memberships.

## Remaining limitations

- Invitation email delivery is disabled until separately approved infrastructure exists.
- Hosted/staging/production must not apply `20261203120000_training_trainee_viewer` (or earlier Stage 4.3 enrollment migrations) until that apply is named.
- Inviting an inactive email can still create a pending enrollment; acceptance stays blocked, and this viewer does not show content to inactive members.
- Trainees cannot complete lessons or submit work yet.
- Path assignments do not open nested course lesson pages from the path snapshot.
- Private master curriculum stays hidden from company owners.
