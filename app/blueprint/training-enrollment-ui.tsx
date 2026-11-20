import Link from "next/link"

import { Card, Chip, Fact } from "@/components/blueprint"
import {
  CancelEnrollmentForm,
  EnrollFromHandoffForm,
  EnrollStaffForm,
  InviteTraineeForm,
} from "@/app/training-enrollment-forms"
import {
  ENROLLMENT_SOURCE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  TRAINING_ENROLLMENT_HELP,
  TRAINING_ENROLLMENT_OPENING,
  TRAINING_ENROLLMENT_TITLE,
  TRAINING_NO_AWAITING,
  TRAINING_NO_ENROLLMENTS,
  TRAINING_NO_PUBLISHED_TARGET,
  type AwaitingHandoff,
  type StoredTrainingEnrollment,
  type TrainingStaffMember,
} from "@/lib/blueprint/training-enrollment"
import { TRAINING_APPROACH_LABELS, type TrainingApproach } from "@/lib/blueprint/training-preparation"

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US")
}

function EnrollmentList({
  title,
  rows,
  empty,
  testId,
}: {
  title: string
  rows: StoredTrainingEnrollment[]
  empty: string
  testId: string
}) {
  return (
    <Card as="section" aria-labelledby={`${testId}-title`}>
      <h2 id={`${testId}-title`} className="bp-card__title">
        {title}
      </h2>
      <div data-enrollment-list={testId}>
      {rows.length === 0 ? <p className="bp-card__body">{empty}</p> : null}
      <ul className="m-0 grid list-none gap-4 p-0">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0" data-enrollment={row.id} data-enrollment-status={row.status}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 font-bold text-ink">{row.contentTitle}</p>
              <Chip tone={row.status === "active" ? "mint" : row.status === "pending" ? "butter" : "neutral"}>
                {ENROLLMENT_STATUS_LABELS[row.status]}
              </Chip>
            </div>
            <p className="m-0 text-[14px] text-muted">
              {ENROLLMENT_SOURCE_LABELS[row.source]} · {row.targetKind} v{row.contentVersion} · {row.inviteEmail ?? "Assigned staff"}
            </p>
            <p className="m-0 text-[13px] text-muted">Assigned {when(row.assignedAt)}</p>
            {row.status === "pending" || row.status === "active" ? (
              <CancelEnrollmentForm enrollmentId={row.id} pendingInvite={row.status === "pending"} />
            ) : null}
          </li>
        ))}
      </ul>
      </div>
    </Card>
  )
}

export function TrainingEnrollmentView({
  companyName,
  awaiting,
  staff,
  enrollments,
  targets,
  recommendations,
}: {
  companyName: string
  awaiting: AwaitingHandoff[]
  staff: TrainingStaffMember[]
  enrollments: StoredTrainingEnrollment[]
  targets: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>
  recommendations: Record<string, { kind: string; pathId: string | null; courseId: string | null }>
}) {
  const pending = enrollments.filter((row) => row.status === "pending")
  const active = enrollments.filter((row) => row.status === "active")
  const closed = enrollments.filter((row) => row.status === "cancelled" || row.status === "revoked")
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-training-enrollment="owner">
        <div className="flex flex-wrap gap-4">
          <Link href="/blueprint/training" className="bp-link self-start font-bold">
            Back to training library
          </Link>
          <Link href="/blueprint/applicants" className="bp-link self-start font-bold">
            Review applicants
          </Link>
        </div>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{TRAINING_ENROLLMENT_TITLE}</h1>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{TRAINING_ENROLLMENT_OPENING}</p>
        <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_ENROLLMENT_HELP}</p>
      </section>

      <Card as="section" tone="lavender" aria-labelledby="awaiting-title">
        <h2 id="awaiting-title" className="bp-card__title">
          Awaiting enrollment
        </h2>
        <div data-enrollment-awaiting="">
        {targets.length === 0 ? <p className="bp-card__body">{TRAINING_NO_PUBLISHED_TARGET}</p> : null}
        {awaiting.length === 0 ? <p className="bp-card__body">{TRAINING_NO_AWAITING}</p> : null}
        <ul className="m-0 grid list-none gap-5 p-0">
          {awaiting.map((row) => (
            <li key={row.preparationId} className="grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0" data-awaiting-handoff={row.preparationId}>
              <Fact label="Applicant" value={row.applicantName} />
              <Fact label="Email" value={row.applicantEmail} />
              <Fact label="Intended role" value={row.intendedRole} />
              <Fact
                label="Training approach"
                value={TRAINING_APPROACH_LABELS[row.trainingApproach as TrainingApproach] ?? row.trainingApproach}
              />
              <Link href={`/blueprint/applicants/${row.applicationId}`} className="bp-link self-start font-bold">
                Open approved handoff
              </Link>
              <EnrollFromHandoffForm
                preparationId={row.preparationId}
                applicationId={row.applicationId}
                recommended={recommendations[row.preparationId] ?? { kind: "none", pathId: null, courseId: null }}
                targets={targets}
              />
            </li>
          ))}
        </ul>
        </div>
      </Card>

      <Card as="section" aria-labelledby="staff-title">
        <h2 id="staff-title" className="bp-card__title">
          Existing staff
        </h2>
        <p className="bp-card__body">Enroll someone who already has a company membership. This does not create a second account.</p>
        <EnrollStaffForm staff={staff} targets={targets} />
      </Card>

      <Card as="section" aria-labelledby="invite-title">
        <h2 id="invite-title" className="bp-card__title">
          Invite a trainee
        </h2>
        <p className="bp-card__body">Invitations stay pending until the invited email accepts. Blueprint does not send email.</p>
        <InviteTraineeForm targets={targets} />
      </Card>

      <EnrollmentList title="Pending invitations" rows={pending} empty="No pending invitations." testId="pending" />
      <EnrollmentList title="Active enrollments" rows={active} empty={TRAINING_NO_ENROLLMENTS} testId="active" />
      <EnrollmentList title="Closed enrollments" rows={closed} empty="No cancelled or revoked enrollments." testId="closed" />
    </>
  )
}
