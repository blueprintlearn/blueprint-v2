"use client"

import { useActionState, useEffect, useRef } from "react"

import { Button, NumberField, SaveStatus, Select, TextArea } from "@/components/blueprint"
import { retryInterviewProcessing, saveInterviewQuestions, sendInterviewInvite } from "@/lib/blueprint/interview-actions"
import {
  INTERVIEW_QUESTION_COUNT,
  INTERVIEW_TIME_OPTIONS,
  type InterviewTemplate,
  type InviteInterviewState,
} from "@/lib/blueprint/interviews"
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

export function InterviewTemplateForm({ template }: { template: InterviewTemplate }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveInterviewQuestions)
  return (
    <form {...formProps} data-interview-form="template" className="grid gap-5">
      <input type="hidden" name="slug" value={template.slug} />
      {Array.from({ length: INTERVIEW_QUESTION_COUNT }, (_, index) => (
        <div key={index} className="grid gap-3" data-interview-question={index}>
          <TextArea
            id={`prompt-${index}`}
            name={`prompt-${index}`}
            label={`Question ${index + 1}`}
            rows={3}
            defaultValue={template.questions[index]?.prompt}
          />
          <Select
            id={`timeLimit-${index}`}
            name={`timeLimit-${index}`}
            label="Time limit"
            options={INTERVIEW_TIME_OPTIONS.map((seconds) => ({
              value: String(seconds),
              label: `${seconds} seconds`,
            }))}
            defaultValue={String(template.questions[index]?.timeLimitSeconds ?? 60)}
          />
        </div>
      ))}
      <NumberField
        id="deadlineDays"
        name="deadlineDays"
        label="Invitation deadline (days)"
        min={1}
        max={30}
        defaultValue={template.deadlineDays}
        help="Applicants must finish before this many days after you send the link. Missing it does not reject them."
      />
      <NumberField
        id="retentionDays"
        name="retentionDays"
        label="Keep videos for (days)"
        min={30}
        max={730}
        defaultValue={template.retentionDays}
        help="Videos and transcripts are deleted after this. Invitation records stay."
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Save interview questions
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

const initialInvite: InviteInterviewState = { error: null, savedAt: null, inviteUrl: null }

export function InterviewInvitePanel({
  applicationId,
  canSend,
  label,
}: {
  applicationId: string
  canSend: boolean
  label: string
}) {
  const [state, dispatch, pending] = useActionState(sendInterviewInvite, initialInvite)
  const saveState = pending ? "saving" : state.savedAt ? "saved" : "idle"
  return (
    <form action={dispatch} data-interview-form="invite" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      {state.error ? (
        <p className="bp-field__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.inviteUrl ? (
        <p className="m-0 break-all rounded-md bg-surface-soft px-3 py-2 text-[14px]" data-interview-invite-url="">
          {state.inviteUrl}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="coral" disabled={pending || !canSend}>
          {label}
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function InterviewRetryForm({ applicationId }: { applicationId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(retryInterviewProcessing)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-interview-form="retry" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Retry processing
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
