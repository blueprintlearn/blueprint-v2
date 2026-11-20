"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Button, SaveStatus, Select, TextField } from "@/components/blueprint"
import {
  cancelEnrollmentAction,
  enrollFromHandoffAction,
  enrollStaffAction,
  inviteTraineeAction,
  acceptTrainingInviteAction,
  regenerateInviteAction,
} from "@/lib/blueprint/training-enrollment-actions"
import {
  TRAINING_ENROLLMENT_CONFIRM_LABEL,
  TRAINING_REGENERATE_INVITE_LABEL,
  type SaveEnrollmentState,
  type TrainingStaffMember,
} from "@/lib/blueprint/training-enrollment"
import { systemRoleLabel } from "@/lib/rules/system-role"

const initial: SaveEnrollmentState = { error: null, savedAt: null, inviteUrl: null }

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p className="m-0 text-[14px] text-danger" role="alert">
      {error}
    </p>
  )
}

function targetOptions(targets: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>) {
  return targets.map((target) => ({
    value: `${target.kind}:${target.id}`,
    label: `${target.kind === "path" ? "Path" : "Course"} · ${target.title} · version ${target.version}`,
  }))
}

function TargetSelect({
  targets,
  defaultValue = "",
  id = "target",
}: {
  targets: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>
  defaultValue?: string
  id?: string
}) {
  return (
    <Select
      id={id}
      name="target"
      label="Published course or path"
      placeholderOption="Choose a published course or path"
      defaultValue={defaultValue || null}
      options={targetOptions(targets)}
    />
  )
}

function ConfirmField() {
  return (
    <label className="flex items-start gap-2 text-[14px] text-ink">
      <input type="checkbox" name="confirmed" value="1" />
      <span>{TRAINING_ENROLLMENT_CONFIRM_LABEL}</span>
    </label>
  )
}

function InviteResult({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <p className="m-0 text-[14px] text-ink" data-invite-url={url}>
      Local invite link (email delivery is off):{" "}
      <a className="bp-link font-bold" href={url}>
        {url}
      </a>
    </p>
  )
}

export function EnrollFromHandoffForm({
  preparationId,
  applicationId,
  recommended,
  targets,
}: {
  preparationId: string
  applicationId: string
  recommended: { kind: string; pathId: string | null; courseId: string | null }
  targets: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>
}) {
  const [state, action, pending] = useActionState(enrollFromHandoffAction, initial)
  const defaultTarget =
    recommended.kind === "path" && recommended.pathId
      ? `path:${recommended.pathId}`
      : recommended.kind === "course" && recommended.courseId
        ? `course:${recommended.courseId}`
        : ""
  return (
    <form action={action} className="grid gap-3" data-enrollment-form="recruitment" data-application={applicationId}>
      <input type="hidden" name="preparationId" value={preparationId} />
      <TargetSelect id={`target-${preparationId}`} targets={targets} defaultValue={defaultTarget} />
      <ConfirmField />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || targets.length === 0}>
          Enroll in training
        </Button>
        <SaveStatus state={pending ? "saving" : state.savedAt ? "saved" : "idle"} />
      </div>
      <InviteResult url={state.inviteUrl} />
      <ErrorText error={state.error} />
    </form>
  )
}

export function EnrollStaffForm({
  staff,
  targets,
}: {
  staff: TrainingStaffMember[]
  targets: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>
}) {
  const [state, action, pending] = useActionState(enrollStaffAction, initial)
  return (
    <form action={action} className="grid gap-3" data-enrollment-form="staff">
      <Select
        id="traineeUserId"
        name="traineeUserId"
        label="Company staff member"
        placeholderOption="Choose someone already on this company"
        defaultValue={null}
        options={staff.map((member) => ({
          value: member.userId,
          label: `${member.email} · ${systemRoleLabel(member.role) ?? member.role}`,
        }))}
      />
      <TargetSelect id="target-staff" targets={targets} />
      <ConfirmField />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || targets.length === 0 || staff.length === 0}>
          Enroll staff member
        </Button>
        <SaveStatus state={pending ? "saving" : state.savedAt ? "saved" : "idle"} />
      </div>
      <ErrorText error={state.error} />
    </form>
  )
}

export function InviteTraineeForm({
  targets,
}: {
  targets: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>
}) {
  const [state, action, pending] = useActionState(inviteTraineeAction, initial)
  return (
    <form action={action} className="grid gap-3" data-enrollment-form="invitation">
      <TextField id="inviteEmail" name="inviteEmail" label="Trainee email" type="email" />
      <TargetSelect id="target-invite" targets={targets} />
      <ConfirmField />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || targets.length === 0}>
          Invite trainee
        </Button>
        <SaveStatus state={pending ? "saving" : state.savedAt ? "saved" : "idle"} />
      </div>
      <InviteResult url={state.inviteUrl} />
      <ErrorText error={state.error} />
    </form>
  )
}

export function CancelEnrollmentForm({ enrollmentId, pendingInvite }: { enrollmentId: string; pendingInvite: boolean }) {
  const [state, action, pending] = useActionState(cancelEnrollmentAction, initial)
  return (
    <form action={action} className="grid gap-2" data-enrollment-form="cancel">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {pendingInvite ? "Revoke invitation" : "Cancel enrollment"}
        </Button>
        <SaveStatus state={pending ? "saving" : state.savedAt ? "saved" : "idle"} />
      </div>
      <ErrorText error={state.error} />
    </form>
  )
}

export function RegenerateInviteForm({ enrollmentId }: { enrollmentId: string }) {
  const [state, action, pending] = useActionState(regenerateInviteAction, initial)
  return (
    <form action={action} className="grid gap-2" data-enrollment-form="regenerate">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {TRAINING_REGENERATE_INVITE_LABEL}
        </Button>
        <SaveStatus state={pending ? "saving" : state.savedAt ? "saved" : "idle"} />
      </div>
      <InviteResult url={state.inviteUrl} />
      <ErrorText error={state.error} />
    </form>
  )
}

export function AcceptTrainingInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptTrainingInviteAction, { error: null, savedAt: null })
  if (state.savedAt) {
    return (
      <p className="m-0 text-[15px] text-ink" data-invite-accepted="">
        Invitation accepted.{" "}
        <Link href="/training" className="bp-link font-bold">
          Open assigned training
        </Link>
      </p>
    )
  }
  return (
    <form action={action} className="grid gap-3" data-enrollment-form="accept">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Accept invitation
        </Button>
        <SaveStatus state={pending ? "saving" : "idle"} />
      </div>
      <ErrorText error={state.error} />
    </form>
  )
}
