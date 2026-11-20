# Training enrollment (Stage 4.3)

Local-only assignment of published company courses and paths. Owners enroll people from an approved recruitment handoff, from existing company staff, or with an email invitation. Trainees can accept an invitation and see assigned names and status.

Do not apply hosted migrations, send live invitation email, import historical trainee progress, or enable lesson completion, grading, or certification from this document.

Source of truth for product rules remains `docs/01`–`05`. Course and path libraries remain in `docs/07_TRAINING_LIBRARY.md`. Legacy import remains in `docs/08_LEGACY_CURRICULUM_IMPORT.md`.

## What this stage provides

- `company_training_enrollments` rows scoped to a company.
- Three sources: `recruitment`, `staff`, `invitation`.
- Frozen `content_title` and `content_version` from the published course or path at assignment time.
- Owner surfaces at `/blueprint/training/enrollments` and on an approved applicant profile.
- Minimum trainee surfaces at `/training` and `/training/invite/[token]`.
- Copy-link invitations only. `TRAINING_EMAIL_DELIVERY = copy_link_only`.

## What this stage does not provide

- Lesson completion, progress tracking, quiz submission, or assignment grading.
- Certification, advancement, or employment records.
- Automatic enrollment after a recruitment handoff is approved.
- Historical LearnDash trainee import.
- Real invitation email. Local and CI flows show a copyable `/training/invite/[token]` link.

## Hosted apply order

Do not apply until separately approved, and not before Stage 4.2 exists in that environment:

1. Stage 3.2 through Stage 3.7 recruiting and training-preparation migrations
2. Stage 4.1 `20261128120000_training_library`
3. Stage 4.1 follow-up `20261129120000_training_publish_atomicity`
4. Stage 4.2 `20261130120000_training_legacy_import`
5. Stage 4.3 `20261201120000_training_enrollment`
6. Stage 4.3 follow-up `20261202120000_training_enrollment_invite_fixes`
7. Stage 4.4 `20261203120000_training_trainee_viewer` (see `docs/10_TRAINEE_FROZEN_CONTENT.md`; do not apply until separately approved)

## Lifecycle

| Status | Meaning | Next steps |
| --- | --- | --- |
| `pending` | Invitation issued. No trainee user yet. Only the token hash is stored. | Accept (invited email), owner copies a new link, or revoke. |
| `active` | Assigned to a user. Staff enrollments start here. Accepted invitations and matching existing members also start here. Accepted copy-links keep their hash so the page can show the assignment; they cannot be accepted again. | Owner can cancel. |
| `revoked` | Pending invitation closed by the owner. Token hash is cleared. | Cannot be reused. Owner may create a new invitation. |
| `cancelled` | Active enrollment closed by the owner. | History is kept. A new enrollment may be created later. |

Assignment fields (`company_id`, source, target, published version/title, handoff references, assigned by/at) are immutable after insert. Only acceptance, cancellation, and owner link regeneration may change status, trainee identity (null → accepted user), token hash, and cancellation stamps.

Accepting an invitation creates an active `dj_trainee` membership only when none exists. If the invited email already has an **inactive** company membership, acceptance fails, the enrollment stays `pending`, and the membership stays inactive. Former staff are not reactivated by accepting training.

## Entry points

### Recruitment

An approved Stage 3.7 preparation is visible as “awaiting enrollment.” The owner chooses a published course or path, checks an explicit confirmation, and enrolls. Approving the handoff does not enroll anyone. The original preparation and hiring history stay in place. One open (`pending` or `active`) enrollment is allowed per preparation.

If the applicant email already belongs to an active company member, the enrollment becomes `active` on that existing user. Otherwise it stays `pending` until that email accepts the copy-link invitation.

### Existing staff

The owner picks an active `company_memberships` row and a published target. The enrollment is `active` immediately. This does not create a second user.

### Invitation

The owner enters an email and a published target. Duplicate pending invitations for the same company, email, and course or path are rejected (the RPC returns the existing row without a new link). If that email already belongs to an active member, the enrollment activates on that account instead of creating a new identity.

Plaintext invite tokens are not stored. After a refresh, the owner copies a new link from the pending invitation. `regenerate_training_invitation` atomically replaces the stored hash; the previous link stops working immediately.

## Permissions

| Actor | Assign / cancel | Read |
| --- | --- | --- |
| Guided company owner | Yes, through security-definer RPCs | All enrollments for that company |
| Other company roles | No | Own `active` enrollments only |
| Invited email, signed in | Accept own pending invitation | After accept, own `active` rows |
| Other accounts | Cannot accept | Cannot see another company’s rows |
| Anonymous | No writes | `get_training_invitation` returns title, company name, invited email, and status for a valid token hash. No trainee identity. |
| Platform admin | No special enrollment rights | No cross-tenant enrollment read |

`enroll_company_training`, `accept_training_invitation`, `regenerate_training_invitation`, `cancel_company_training_enrollment`, and `list_company_staff_for_training` are the write/list paths. Table INSERT/UPDATE/DELETE is revoked from `authenticated`. Only the guided company owner can regenerate a pending copy-link.

## Isolation and integrity

- Unique open indexes: user+course, user+path, pending email+course, pending email+path, open handoff, token hash.
- Unpublished drafts cannot be assigned.
- A handoff from another company cannot be consumed.
- Repeated enroll requests return the existing open row instead of inserting a second one. A unique-violation race still fails closed as `training-enrollment:duplicate-open`.
- Publishing a later course or path version does not rewrite `content_title` / `content_version` on existing enrollments.
- Revoking clears the token hash, so the old link cannot be accepted.
- Regenerating a pending invitation replaces the token hash in the same update. The previous hash no longer matches `get_training_invitation` or `accept_training_invitation`.
- Accepting while an inactive membership exists for that company and user fails closed as `training-enrollment:inactive-membership`. The enrollment stays pending. Membership status does not change.

## Remaining limitations

- Invitation email delivery is disabled until separately approved infrastructure exists.
- Hosted/staging/production must not apply `20261201120000_training_enrollment`, `20261202120000_training_enrollment_invite_fixes`, or `20261203120000_training_trainee_viewer` until that apply is named.
- Inviting an inactive email can still create a pending enrollment. Acceptance stays blocked (`training-enrollment:inactive-membership`).
- Trainees cannot complete lessons or submit work yet. Stage 4.4 is read-only frozen content.
- Private master curriculum stays hidden from company owners.
