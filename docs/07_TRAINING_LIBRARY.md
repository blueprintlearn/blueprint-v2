# Training library (Stage 4.1)

Local-only architecture for Blueprint’s course library. Do not import production curriculum, apply hosted migrations, enable live recruiting, or activate trainee enrollment from this document.

Source of truth for product rules remains `docs/01`–`05`. Curriculum export notes remain in `docs/06_CURRICULUM_IMPORT_SPEC.md`.

## What this stage provides

- Platform-owned master courses with visibility **private**, **starter**, or **archived**.
- Company courses that are independent copies or original drafts.
- Immutable published versions. Owners edit drafts. Publishing freezes a snapshot.
- Mixed lesson content blocks: text, video, image, downloadable resource, quiz, assignment.
- Training paths: ordered company courses, optional prerequisites, draft/published versions.
- Stored progression and assessment configuration. No grading, submissions, or certifications.
- A documented legacy import mapping. Stage 4.2 can import the assigned LearnDash catalog into **private** local masters. It does not import production trainee data.

## Hosted apply order

Do not apply until separately approved, and not before the previous recruiting/training migrations exist in that environment:

1. Stage 3.2 `20261122120000_company_recruiting_pages`
2. Stage 3.3 `20261123120000_company_applicants`
3. Stage 3.4 `20261124120000_company_video_interviews`
4. Stage 3.5 `20261125120000_company_applicant_review`
5. Stage 3.6 `20261126120000_company_hiring_workflow`
6. Stage 3.7 `20261127120000_company_training_preparations`
7. Stage 4.1 `20261128120000_training_library`
8. Stage 4.1 follow-up `20261129120000_training_publish_atomicity`
9. Stage 4.2 `20261130120000_training_legacy_import` (schema support and `import_legacy_master_course`; running the importer is a separate local command)
10. Stage 4.3 `20261201120000_training_enrollment` (see `docs/09_TRAINING_ENROLLMENT.md`; do not apply until separately approved)
11. Stage 4.3 follow-up `20261202120000_training_enrollment_invite_fixes`

Stage 2 and Stage 3.1 hosted applies are not required for local 4.1.

## Isolation

- Private and archived master courses are visible only to `training_platform_admins`.
- Guided company owners can select **published starter** master versions only.
- Company course and path rows are limited to the owner of that guided company.
- Platform administrators cannot read another company’s library through these policies.
- Updating a company course cannot change master content or another tenant.

## Versioning

Published and superseded version `content` is frozen by trigger. Later edits create or update a draft, then publish a new version. Stage 4.3 enrollments store the published title and version at assignment time and do not follow later publishes.

Publishing is atomic: `publish_training_version` supersedes the current published snapshot and publishes the draft in one transaction. A deferred constraint also rejects a superseded row unless a published row exists at commit, so a split table update cannot leave a course or path without a published version. If either step fails, the previous published version stays published.

Legacy import is also atomic: `import_legacy_master_course` writes the private master course and its published version in one transaction. A re-run returns unchanged only when that published snapshot already matches the export. It does not treat a matching `legacy_content_version` label as enough, and it does not overwrite a drifted original.

Master updates never overwrite company copies. `source_master_version` records the adopted master version. Owners may review and explicitly adopt a newer published master into a new company draft.

Archiving or privatizing a master course does not freeze existing company copies. Owners can still edit, publish, and archive those copies. Starter visibility is required only when adding a starter course or explicitly adopting a later master update.

## Stage 3.7 handoff

`trainingPreparationHandoffFromApproved` sets `nextStepDestination: "training_enrollment"`. Approving a preparation does not enroll anyone. Stage 4.3 owners confirm a published course or path. See `docs/09_TRAINING_ENROLLMENT.md`.

## Legacy import contract

Do not assume the export format without inspecting the actual files on `curriculum-learndash-export`. Stage 4.2 maps assigned courses to **private** master records, preserving `legacy.sourceId` and `legacy.contentVersion`. See `lib/blueprint/training-legacy-contract.ts` and `docs/08_LEGACY_CURRICULUM_IMPORT.md`.

Do not import assignment submission files, unassigned lessons/quizzes, trainee accounts, or historical progress in this stage. Do not publish imported courses to the Starter Library.

## Intentionally deferred

- Lesson progress, grading, submissions, and certification engines
- Advancement ladders
- AI course generation and modernization
- Marketplace payments and public sharing
- A full platform-admin console

Extension points exist as inert `extensions.ai` and `extensions.marketplace` fields on course and path snapshots.
