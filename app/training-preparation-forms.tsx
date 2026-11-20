"use client"

import { useEffect, useRef, useState } from "react"

import { Button, Chip, Fact, SaveStatus, Select, TextArea, TextField } from "@/components/blueprint"
import {
  ENGAGEMENT_MODEL_LABELS,
  HIRING_PATH_LABELS,
  currentHiredOutcome,
} from "@/lib/blueprint/hiring-workflow"
import {
  approveApplicantTrainingPreparation,
  reviseApplicantTrainingPreparation,
  saveApplicantTrainingPreparation,
  startApplicantTrainingPreparation,
} from "@/lib/blueprint/training-preparation-actions"
import {
  TRAINING_APPROACH_ADVISORY,
  TRAINING_APPROACH_LABELS,
  TRAINING_APPROACHES,
  TRAINING_EXPERIENCE_LABELS,
  TRAINING_EXPERIENCE_LEVELS,
  TRAINING_PREP_CONFIRM_LABEL,
  TRAINING_PREP_HELP,
  TRAINING_PREP_NOT_HIRED,
  TRAINING_PREP_REVERSED,
  TRAINING_PREP_STATUS_LABELS,
  TRAINING_READINESS_LABELS,
  TRAINING_STAGE4_CLOSED,
  canPrepareTraining,
  currentApproved,
  currentDraft,
  padTrainingItems,
  suggestedApproachFromExperience,
  suggestedStartingFocus,
  trainingReadinessFromFacts,
  type TrainingPreparationRecord,
} from "@/lib/blueprint/training-preparation"
import type { ApplicantProfile } from "@/lib/blueprint/applicants"
import { EnrollFromHandoffForm } from "@/app/training-enrollment-forms"
import { useSaveForm } from "./use-save-form"

function useReloadWhenSaved(saveState: string) {
  const reloaded = useRef(false)
  useEffect(() => {
    if (saveState === "saved" && !reloaded.current) {
      reloaded.current = true
      window.location.reload()
    }
    if (saveState !== "saved") reloaded.current = false
  }, [saveState])
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US")
}

function ItemFields({
  prefix,
  label,
  values,
}: {
  prefix: string
  label: string
  values: string[]
}) {
  const items = padTrainingItems(values)
  return (
    <div className="grid gap-2">
      <p className="m-0 text-[14px] font-bold text-ink">{label}</p>
      {items.map((value, index) => (
        <TextField
          key={`${prefix}-${index}`}
          id={`${prefix}-${index}`}
          name={`${prefix}-${index}`}
          label={`${label} ${index + 1}`}
          defaultValue={value}
          optional
        />
      ))}
    </div>
  )
}

function HiddenDraftFields({ draft }: { draft: TrainingPreparationRecord }) {
  const demonstrated = padTrainingItems(draft.skillsDemonstrated)
  const development = padTrainingItems(draft.skillsNeedingDevelopment)
  const verification = padTrainingItems(draft.skillsNeedingVerification)
  const goals = padTrainingItems(draft.startingGoals)
  return (
    <>
      <input type="hidden" name="intendedRole" value={draft.intendedRole} />
      <input type="hidden" name="experienceLevel" value={draft.experienceLevel} />
      <input type="hidden" name="trainingApproach" value={draft.trainingApproach} />
      <input type="hidden" name="plannedStartDate" value={draft.plannedStartDate ?? ""} />
      <input type="hidden" name="ownerNotes" value={draft.ownerNotes ?? ""} />
      {demonstrated.map((value, index) => (
        <input key={`demonstrated-${index}`} type="hidden" name={`demonstrated-${index}`} value={value} />
      ))}
      {development.map((value, index) => (
        <input key={`development-${index}`} type="hidden" name={`development-${index}`} value={value} />
      ))}
      {verification.map((value, index) => (
        <input key={`verification-${index}`} type="hidden" name={`verification-${index}`} value={value} />
      ))}
      {goals.map((value, index) => (
        <input key={`goal-${index}`} type="hidden" name={`goal-${index}`} value={value} />
      ))}
    </>
  )
}

function StartTrainingForm({ applicationId }: { applicationId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(startApplicantTrainingPreparation)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-training-form="start" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Prepare for Training
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function ReviseTrainingForm({ applicationId }: { applicationId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(reviseApplicantTrainingPreparation)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-training-form="revise" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Revise preparation
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function TrainingPrepDraftForm({
  applicationId,
  draft,
}: {
  applicationId: string
  draft: TrainingPreparationRecord
}) {
  const save = useSaveForm(saveApplicantTrainingPreparation)
  useReloadWhenSaved(save.saveState)
  const suggested = suggestedApproachFromExperience(draft.experienceLevel)
  return (
    <form {...save.formProps} data-training-form="draft" className="grid gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <TextField
        id="training-intended-role"
        name="intendedRole"
        label="Intended training role"
        defaultValue={draft.intendedRole}
      />
      <Select
        id="training-experience-level"
        name="experienceLevel"
        label="Experience level"
        options={TRAINING_EXPERIENCE_LEVELS.map((value) => ({
          value,
          label: TRAINING_EXPERIENCE_LABELS[value],
        }))}
        defaultValue={draft.experienceLevel}
      />
      <Select
        id="training-approach"
        name="trainingApproach"
        label="Training approach"
        help={`${TRAINING_APPROACH_ADVISORY} Suggested: ${TRAINING_APPROACH_LABELS[suggested]}.`}
        options={TRAINING_APPROACHES.map((value) => ({
          value,
          label: TRAINING_APPROACH_LABELS[value],
        }))}
        defaultValue={draft.trainingApproach}
      />
      <TextField
        id="training-start-date"
        name="plannedStartDate"
        label="Planned training start date"
        type="date"
        defaultValue={draft.plannedStartDate ?? ""}
        optional
      />
      <ItemFields prefix="demonstrated" label="Skills already demonstrated" values={draft.skillsDemonstrated} />
      <ItemFields prefix="development" label="Areas needing development" values={draft.skillsNeedingDevelopment} />
      <ItemFields prefix="verification" label="Skills needing verification" values={draft.skillsNeedingVerification} />
      <ItemFields prefix="goal" label="Starting training goals" values={draft.startingGoals} />
      <TextArea
        id="training-owner-notes"
        name="ownerNotes"
        label="Owner notes for training"
        defaultValue={draft.ownerNotes ?? ""}
        optional
      />
      {save.error ? (
        <p className="bp-field__error" role="alert">
          {save.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={save.pending}>
          Save draft
        </Button>
        <SaveStatus state={save.saveState} />
      </div>
    </form>
  )
}

function TrainingPrepApproveForm({
  applicationId,
  draft,
}: {
  applicationId: string
  draft: TrainingPreparationRecord
}) {
  const { error, pending, saveState, formProps } = useSaveForm(approveApplicantTrainingPreparation)
  useReloadWhenSaved(saveState)
  const [confirmed, setConfirmed] = useState(false)
  return (
    <form {...formProps} data-training-form="approve" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <HiddenDraftFields draft={draft} />
      <p className="m-0 text-[14px] text-muted">{TRAINING_STAGE4_CLOSED} Save the draft first if you changed anything above.</p>
      <label className="flex items-center gap-2 text-[14px] text-ink-2">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        {TRAINING_PREP_CONFIRM_LABEL}
      </label>
      {confirmed ? <input type="hidden" name="confirmApproval" value="1" /> : null}
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Approve training handoff
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function listOrNone(items: string[]) {
  return items.length ? items.join(", ") : "None recorded"
}

export function TrainingReadinessReview({
  draft,
}: {
  draft: TrainingPreparationRecord
}) {
  const focus = suggestedStartingFocus({
    trainingApproach: draft.trainingApproach,
    startingGoals: draft.startingGoals,
    skillsNeedingDevelopment: draft.skillsNeedingDevelopment,
    skillsNeedingVerification: draft.skillsNeedingVerification,
  })
  return (
    <div className="grid gap-3 rounded-[18px] bg-surface-soft p-4" data-training-readiness-review="">
      <p className="m-0 text-[15px] font-bold text-ink">Training readiness review</p>
      <Fact label="Intended role" value={draft.intendedRole} />
      <Fact label="Training approach" value={TRAINING_APPROACH_LABELS[draft.trainingApproach]} />
      <Fact label="Suggested approach" value={TRAINING_APPROACH_LABELS[draft.suggestedApproach]} />
      <Fact label="Hiring path from recruitment" value={HIRING_PATH_LABELS[draft.evidence.hiringPath]} />
      <Fact
        label="Engagement model from hiring"
        value={draft.evidence.engagementModel ? ENGAGEMENT_MODEL_LABELS[draft.evidence.engagementModel] : "Not specified"}
      />
      <Fact label="Application experience" value={draft.evidence.applicationExperience} />
      <Fact
        label="Completed hiring activities"
        value={
          draft.evidence.completedActivities.length
            ? draft.evidence.completedActivities.map((row) => `${row.title} (${row.status})`).join(", ")
            : "None recorded"
        }
      />
      <Fact
        label="Audition observations"
        value={
          draft.evidence.auditionObservations.length
            ? draft.evidence.auditionObservations
                .map((row) => `${row.title}${row.observations ? `: ${row.observations}` : ""}`)
                .join(" ")
            : "None recorded"
        }
      />
      <Fact label="Skills demonstrated" value={listOrNone(draft.skillsDemonstrated)} />
      <Fact label="Skills requiring verification" value={listOrNone(draft.skillsNeedingVerification)} />
      <Fact label="Suggested starting focus" value={focus} />
      <Fact
        label="Missing information"
        value={draft.missingInformation.length ? draft.missingInformation.join(", ") : "None"}
      />
      <Fact label="Owner approval status" value={TRAINING_PREP_STATUS_LABELS[draft.status]} />
      <p className="m-0 text-[13px] text-muted">{TRAINING_APPROACH_ADVISORY}</p>
    </div>
  )
}

export function TrainingHandoffSnapshot({
  record,
}: {
  record: TrainingPreparationRecord
}) {
  return (
    <div className="grid gap-3 rounded-[18px] bg-surface-soft p-4" data-training-handoff-approved={record.version}>
      <p className="m-0 text-[15px] font-bold text-ink">
        Approved handoff · version {record.version}
      </p>
      <Fact label="Intended role" value={record.intendedRole} />
      <Fact label="Training approach" value={TRAINING_APPROACH_LABELS[record.trainingApproach]} />
      <Fact label="Experience level" value={TRAINING_EXPERIENCE_LABELS[record.experienceLevel]} />
      <Fact label="Starting goals" value={listOrNone(record.startingGoals)} />
      <Fact label="Skills demonstrated" value={listOrNone(record.skillsDemonstrated)} />
      <Fact label="Skills requiring verification" value={listOrNone(record.skillsNeedingVerification)} />
      <Fact label="Planned start date" value={record.plannedStartDate ?? "Not set"} />
      <Fact label="Owner notes" value={record.ownerNotes ?? "None"} />
      <Fact label="Approved" value={record.approvedAt ? when(record.approvedAt) : "Not approved"} />
      <p className="m-0 text-[13px] text-muted">{TRAINING_STAGE4_CLOSED}</p>
    </div>
  )
}

function TrainingHistory({ rows }: { rows: TrainingPreparationRecord[] }) {
  if (rows.length === 0) return <p className="bp-card__body">No handoff history yet.</p>
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0" data-training-handoff-history="">
      {rows.map((row) => (
        <li key={row.id} className="text-[14px] text-ink" data-training-prep-version={row.version} data-training-prep-status={row.status}>
          <span className="font-bold">
            Version {row.version} · {TRAINING_PREP_STATUS_LABELS[row.status]}
          </span>
          {` · ${TRAINING_APPROACH_LABELS[row.trainingApproach]} · ${row.intendedRole}`}
          <span className="block text-[13px] text-muted">{when(row.updatedAt)}</span>
        </li>
      ))}
    </ol>
  )
}

export function TrainingPreparationSection({
  profile,
  enrollmentTargets = [],
  recommendation = { kind: "none", pathId: null, courseId: null },
}: {
  profile: ApplicantProfile
  enrollmentTargets?: Array<{ kind: "course" | "path"; id: string; title: string; version: number }>
  recommendation?: { kind: string; pathId: string | null; courseId: string | null }
}) {
  const canPrepare = canPrepareTraining(profile.hiringOutcomes)
  const hired = currentHiredOutcome(profile.hiringOutcomes)
  const draft = currentDraft(profile.trainingPreparations)
  const approved = currentApproved(profile.trainingPreparations)
  const readiness = trainingReadinessFromFacts(canPrepare, profile.trainingPreparations)
  const reversed = profile.hiringOutcomes.length > 0 && !canPrepare
  return (
    <div className="grid gap-4" data-training-preparation="" data-training-readiness={readiness}>
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone={readiness === "ready" ? "mint" : readiness === "draft" ? "butter" : "neutral"}>
          {TRAINING_READINESS_LABELS[readiness]}
        </Chip>
      </div>
      <p className="m-0 text-[14px] text-ink-2">{TRAINING_PREP_HELP}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Fact label="Applicant" value={`${profile.firstName} ${profile.lastName}`} />
        <Fact label="Email" value={profile.email} />
        <Fact label="Phone" value={profile.phone} />
        <Fact label="Intended role" value={hired?.intendedRole ?? profile.roleTitle} />
        <Fact label="Hiring path" value={HIRING_PATH_LABELS[profile.hiringPath]} />
        <Fact
          label="W-2 / 1099 engagement"
          value={hired ? ENGAGEMENT_MODEL_LABELS[hired.engagementModel] : "Not recorded"}
        />
        <Fact label="Planned start date" value={hired?.plannedStartDate ?? "Not set"} />
      </div>
      <Fact label="Experience from application" value={profile.answers.experience} />
      {!canPrepare ? (
        <p className="bp-card__body">{reversed ? TRAINING_PREP_REVERSED : TRAINING_PREP_NOT_HIRED}</p>
      ) : null}
      {canPrepare && !draft && !approved ? <StartTrainingForm applicationId={profile.applicationId} /> : null}
      {draft ? (
        <>
          <TrainingPrepDraftForm applicationId={profile.applicationId} draft={draft} />
          <TrainingReadinessReview draft={draft} />
          {canPrepare ? <TrainingPrepApproveForm applicationId={profile.applicationId} draft={draft} /> : null}
        </>
      ) : null}
      {approved && !draft ? (
        <>
          <TrainingHandoffSnapshot record={approved} />
          {canPrepare ? (
            <EnrollFromHandoffForm
              preparationId={approved.id}
              applicationId={profile.applicationId}
              recommended={recommendation}
              targets={enrollmentTargets}
            />
          ) : null}
          {canPrepare ? <ReviseTrainingForm applicationId={profile.applicationId} /> : null}
        </>
      ) : null}
      {approved && draft ? <TrainingHandoffSnapshot record={approved} /> : null}
      <div>
        <p className="m-0 text-[15px] font-bold text-ink">Handoff history</p>
        <TrainingHistory rows={profile.trainingPreparations} />
      </div>
    </div>
  )
}

