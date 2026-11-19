"use client"

import { useEffect, useRef, useState } from "react"

import { Button, SaveStatus, Select, TextArea, TextField } from "@/components/blueprint"
import {
  addCustomHiringActivityAction,
  saveApplicantAuditionAction,
  saveApplicantConversationAction,
  saveApplicantHiringPath,
  updateApplicantHiringActivity,
} from "@/lib/blueprint/hiring-workflow-actions"
import {
  ACTIVITY_TITLE_MAX,
  AUDITION_HELP,
  AUDITION_SKILL_MAX,
  AUDITION_STATUS_LABELS,
  AUDITION_STATUSES,
  CONVERSATION_HELP,
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUSES,
  CONVERSATION_TYPE_LABELS,
  CONVERSATION_TYPES,
  DEFAULT_AUDITION_SKILLS,
  HIRING_CHECKLIST_HELP,
  HIRING_PATH_HELP,
  HIRING_PATH_LABELS,
  HIRING_PATHS,
  TRAINING_HANDOFF_HELP,
  toDateTimeLocalValue,
  type ApplicantAudition,
  type ApplicantConversation,
  type HiringActivity,
  type HiringPathKind,
} from "@/lib/blueprint/hiring-workflow"
import { ratingSelectOptions } from "@/lib/blueprint/candidate-review"
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

export function HiringPathForm({
  applicationId,
  path,
}: {
  applicationId: string
  path: HiringPathKind
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveApplicantHiringPath)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-hiring-form="path" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="m-0 text-[14px] text-ink-2">{HIRING_PATH_HELP}</p>
      <Select
        id={`hiring-path-${applicationId}`}
        name="path"
        label="Hiring path"
        options={HIRING_PATHS.map((value) => ({ value, label: HIRING_PATH_LABELS[value] }))}
        defaultValue={path}
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Save hiring path
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function ActivityActionForm({
  applicationId,
  activity,
  intent,
  label,
}: {
  applicationId: string
  activity: HiringActivity
  intent: "complete" | "skip" | "reopen"
  label: string
}) {
  const { error, pending, saveState, formProps } = useSaveForm(updateApplicantHiringActivity)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-hiring-activity-action={intent} className="grid gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="activityId" value={activity.id} />
      <input type="hidden" name="activityKey" value={activity.activityKey} />
      <input type="hidden" name="title" value={activity.title} />
      <input type="hidden" name="intent" value={intent} />
      {intent === "skip" ? (
        <TextField
          id={`skip-${activity.id}`}
          name="skipReason"
          label="Skip reason"
          defaultValue={activity.skipReason ?? ""}
          optional
        />
      ) : null}
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="plain" disabled={pending}>
          {label}
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function HiringChecklist({
  applicationId,
  activities,
}: {
  applicationId: string
  activities: HiringActivity[]
}) {
  const custom = useSaveForm(addCustomHiringActivityAction)
  useReloadWhenSaved(custom.saveState)
  return (
    <div className="grid gap-4" data-hiring-checklist="">
      <p className="m-0 text-[14px] text-ink-2">{HIRING_CHECKLIST_HELP}</p>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="grid gap-2 rounded-[18px] bg-surface-soft p-4"
            data-hiring-activity={activity.activityKey}
            data-hiring-activity-status={activity.status}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="m-0 text-[15px] font-bold text-ink">{activity.title}</p>
              <p className="m-0 text-[13px] text-muted">
                {activity.status === "complete"
                  ? "Complete"
                  : activity.status === "skipped"
                    ? "Skipped"
                    : activity.required
                      ? "Outstanding"
                      : "Optional"}
              </p>
            </div>
            {activity.activityKey === "video_interview" || activity.activityKey === "practical_audition" ? (
              <p className="m-0 text-[13px] text-muted">Optional for every hiring path.</p>
            ) : null}
            {activity.activityKey === "training_handoff" ? (
              <p className="m-0 text-[13px] text-muted">{TRAINING_HANDOFF_HELP}</p>
            ) : null}
            {activity.skipReason ? <p className="m-0 text-[13px] text-ink-2">Skipped: {activity.skipReason}</p> : null}
            {activity.status === "pending" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <ActivityActionForm applicationId={applicationId} activity={activity} intent="complete" label="Mark complete" />
                <ActivityActionForm applicationId={applicationId} activity={activity} intent="skip" label="Skip activity" />
              </div>
            ) : (
              <ActivityActionForm applicationId={applicationId} activity={activity} intent="reopen" label="Reopen activity" />
            )}
          </li>
        ))}
      </ul>
      <form {...custom.formProps} data-hiring-form="custom-activity" className="grid gap-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        <TextField
          id={`custom-activity-${applicationId}`}
          name="title"
          label="Add a custom activity"
          maxLength={ACTIVITY_TITLE_MAX}
        />
        {custom.error ? (
          <p className="bp-field__error" role="alert">
            {custom.error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="soft" disabled={custom.pending}>
            Add activity
          </Button>
          <SaveStatus state={custom.saveState} />
        </div>
      </form>
    </div>
  )
}

export function ConversationForm({
  applicationId,
  conversation,
}: {
  applicationId: string
  conversation?: ApplicantConversation
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveApplicantConversationAction)
  useReloadWhenSaved(saveState)
  const id = conversation?.id ?? "new"
  return (
    <form {...formProps} data-hiring-form="conversation" data-conversation-id={id} className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      {conversation ? <input type="hidden" name="conversationId" value={conversation.id} /> : null}
      <Select
        id={`conversation-type-${id}`}
        name="conversationType"
        label="Conversation type"
        options={CONVERSATION_TYPES.map((value) => ({ value, label: CONVERSATION_TYPE_LABELS[value] }))}
        defaultValue={conversation?.conversationType ?? "phone"}
      />
      <TextField
        id={`conversation-when-${id}`}
        name="plannedAt"
        type="datetime-local"
        label="Planned date and time"
        defaultValue={toDateTimeLocalValue(conversation?.plannedAt)}
        optional
      />
      <Select
        id={`conversation-status-${id}`}
        name="status"
        label="Status"
        options={CONVERSATION_STATUSES.map((value) => ({ value, label: CONVERSATION_STATUS_LABELS[value] }))}
        defaultValue={conversation?.status ?? "planned"}
      />
      <TextArea
        id={`conversation-notes-${id}`}
        name="notes"
        label="Private notes"
        rows={4}
        defaultValue={conversation?.notes ?? ""}
        optional
      />
      <TextField
        id={`conversation-next-${id}`}
        name="nextAction"
        label="Next action"
        defaultValue={conversation?.nextAction ?? ""}
        optional
      />
      <TextField
        id={`conversation-person-${id}`}
        name="personResponsible"
        label="Person responsible"
        defaultValue={conversation?.personResponsible ?? ""}
        optional
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {conversation ? "Update conversation" : "Save conversation"}
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function ConversationsSection({
  applicationId,
  conversations,
}: {
  applicationId: string
  conversations: ApplicantConversation[]
}) {
  return (
    <div className="grid gap-5" data-hiring-conversations="">
      <p className="m-0 text-[14px] text-ink-2">{CONVERSATION_HELP}</p>
      {conversations.length === 0 ? <p className="m-0 text-[14px] text-muted">No conversations recorded yet.</p> : null}
      {conversations.map((conversation) => (
        <article key={conversation.id} className="grid gap-3 rounded-[18px] bg-surface-soft p-4" data-conversation={conversation.id}>
          <p className="m-0 text-[13px] font-bold text-ink">
            {CONVERSATION_TYPE_LABELS[conversation.conversationType]} · {CONVERSATION_STATUS_LABELS[conversation.status]}
          </p>
          <ConversationForm applicationId={applicationId} conversation={conversation} />
        </article>
      ))}
      <div className="grid gap-2">
        <h3 className="m-0 text-[16px] font-bold">Add a conversation</h3>
        <ConversationForm applicationId={applicationId} />
      </div>
    </div>
  )
}

function AuditionSkillFields({
  id,
  skills,
  ratings,
}: {
  id: string
  skills: string[]
  ratings: ApplicantAudition["skillRatings"] | null
}) {
  const [count, setCount] = useState(Math.max(skills.length, DEFAULT_AUDITION_SKILLS.length))
  const values = Array.from({ length: AUDITION_SKILL_MAX }, (_, index) => skills[index] ?? DEFAULT_AUDITION_SKILLS[index] ?? "")
  return (
    <div className="grid gap-4">
      {values.slice(0, count).map((skill, index) => (
        <div key={`${id}-skill-${index}`} className="grid gap-3" data-audition-skill={index}>
          <TextField
            id={`${id}-skill-${index}`}
            name={`skill-${index}`}
            label={`Skill ${index + 1}`}
            defaultValue={skill}
            optional={index > 0}
          />
          <Select
            id={`${id}-rating-${index}`}
            name={`rating-${index}`}
            label={`${skill || `Skill ${index + 1}`} (your rating)`}
            options={ratingSelectOptions()}
            defaultValue={ratings?.[index]?.rating == null ? "" : String(ratings[index]?.rating)}
            optional
          />
          <TextArea
            id={`${id}-rating-notes-${index}`}
            name={`rating-notes-${index}`}
            label={`Notes for ${skill || `skill ${index + 1}`}`}
            rows={2}
            defaultValue={ratings?.[index]?.notes ?? ""}
            optional
          />
        </div>
      ))}
      {count < AUDITION_SKILL_MAX ? (
        <Button type="button" variant="plain" onClick={() => setCount((value) => Math.min(AUDITION_SKILL_MAX, value + 1))}>
          Add a skill
        </Button>
      ) : null}
    </div>
  )
}

export function AuditionForm({
  applicationId,
  audition,
}: {
  applicationId: string
  audition?: ApplicantAudition
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveApplicantAuditionAction)
  useReloadWhenSaved(saveState)
  const id = audition?.id ?? "new"
  return (
    <form {...formProps} data-hiring-form="audition" data-audition-id={id} className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      {audition ? <input type="hidden" name="auditionId" value={audition.id} /> : null}
      <p className="m-0 text-[14px] text-ink-2">{AUDITION_HELP}</p>
      <TextField
        id={`audition-title-${id}`}
        name="title"
        label="Audition title"
        defaultValue={audition?.title ?? "Practical audition"}
      />
      <TextArea
        id={`audition-description-${id}`}
        name="description"
        label="Description"
        rows={3}
        defaultValue={audition?.description ?? ""}
        optional
      />
      <TextField
        id={`audition-when-${id}`}
        name="scheduledAt"
        type="datetime-local"
        label="Date and time"
        defaultValue={toDateTimeLocalValue(audition?.scheduledAt)}
        optional
      />
      <TextField
        id={`audition-location-${id}`}
        name="locationOrFormat"
        label="Location or remote format"
        defaultValue={audition?.locationOrFormat ?? ""}
        optional
      />
      <TextField
        id={`audition-evaluator-${id}`}
        name="evaluatorName"
        label="Assigned evaluator"
        defaultValue={audition?.evaluatorName ?? ""}
        optional
      />
      <Select
        id={`audition-status-${id}`}
        name="status"
        label="Completion status"
        options={AUDITION_STATUSES.map((value) => ({ value, label: AUDITION_STATUS_LABELS[value] }))}
        defaultValue={audition?.status ?? "planned"}
      />
      <AuditionSkillFields id={id} skills={audition?.skills ?? [...DEFAULT_AUDITION_SKILLS]} ratings={audition?.skillRatings ?? null} />
      <TextArea
        id={`audition-notes-${id}`}
        name="notes"
        label="Private notes and observations"
        rows={4}
        defaultValue={audition?.notes ?? ""}
        optional
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {audition ? "Update audition" : "Save audition"}
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function AuditionsSection({
  applicationId,
  auditions,
}: {
  applicationId: string
  auditions: ApplicantAudition[]
}) {
  return (
    <div className="grid gap-5" data-hiring-auditions="">
      {auditions.length === 0 ? <p className="m-0 text-[14px] text-muted">No practical audition recorded. This step is optional.</p> : null}
      {auditions.map((audition) => (
        <article key={audition.id} className="grid gap-3 rounded-[18px] bg-surface-soft p-4" data-audition={audition.id}>
          <p className="m-0 text-[13px] font-bold text-ink">
            {audition.title} · {AUDITION_STATUS_LABELS[audition.status]}
          </p>
          <AuditionForm applicationId={applicationId} audition={audition} />
        </article>
      ))}
      <div className="grid gap-2">
        <h3 className="m-0 text-[16px] font-bold">Add a practical audition</h3>
        <AuditionForm applicationId={applicationId} />
      </div>
    </div>
  )
}

