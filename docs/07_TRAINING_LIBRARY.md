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
- A documented legacy import mapping. No production import.

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

Stage 2 and Stage 3.1 hosted applies are not required for local 4.1.

## Isolation

- Private and archived master courses are visible only to `training_platform_admins`.
- Guided company owners can select **published starter** master versions only.
- Company course and path rows are limited to the owner of that guided company.
- Platform administrators cannot read another company’s library through these policies.
- Updating a company course cannot change master content or another tenant.

## Versioning

Published and superseded version `content` is frozen by trigger. Later edits create or update a draft, then publish a new version. Assigned copies, when enrollment exists later, must keep the version they were given.

Publishing is atomic: `publish_training_version` supersedes the current published snapshot and publishes the draft in one transaction. A deferred constraint also rejects a superseded row unless a published row exists at commit, so a split table update cannot leave a course or path without a published version. If either step fails, the previous published version stays published.

Master updates never overwrite company copies. `source_master_version` records the adopted master version. Owners may review and explicitly adopt a newer published master into a new company draft.

Archiving or privatizing a master course does not freeze existing company copies. Owners can still edit, publish, and archive those copies. Starter visibility is required only when adding a starter course or explicitly adopting a later master update.

## Stage 3.7 handoff

`trainingPreparationHandoffFromApproved` still sets `nextStepDestination: "not_enabled"`. `planFutureEnrollment` in `lib/blueprint/training-enrollment.ts` can recommend a published path or course from an approved preparation. It does not enroll, invite, or create progress.

## Legacy import contract

Do not assume the export format without inspecting the actual files on `curriculum-learndash-export`. Map later imports to **private** master records, preserving `legacy.sourceId` and `legacy.contentVersion`. See `lib/blueprint/training-legacy-contract.ts`.

Do not import assignment submission files, unassigned lessons/quizzes, trainee accounts, or historical progress in this stage.

## Intentionally deferred

- Trainee accounts and enrollment
- Grading, submissions, and certification engines
- Advancement ladders
- AI course generation and modernization
- Marketplace payments and public sharing
- A full platform-admin console

Extension points exist as inert `extensions.ai` and `extensions.marketplace` fields on course and path snapshots.
