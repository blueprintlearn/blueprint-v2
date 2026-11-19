"use client"

import { useEffect, useRef } from "react"

import { Button, SaveStatus, Select, TextArea, TextField } from "@/components/blueprint"
import {
  recordApplicantDecision,
  saveApplicantEvaluation,
  saveApplicantFollowUpAction,
  saveEvaluationCategories,
} from "@/lib/blueprint/candidate-review-actions"
import {
  EVALUATION_CATEGORY_MAX,
  FOLLOW_UP_ACTION_LABELS,
  FOLLOW_UP_ACTIONS,
  FOLLOW_UP_HELP,
  HUMAN_EVALUATION_HELP,
  OWNER_DECISION_LABELS,
  OWNER_DECISIONS,
  DECISION_HELP,
  EVALUATION_FROZEN_HELP,
  ratingSelectOptions,
  type EvaluationRating,
  type EvaluationTemplate,
  type FollowUpAction,
  type FollowUpStatus,
  type HumanEvaluation,
} from "@/lib/blueprint/candidate-review"
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

export function EvaluationTemplateForm({
  template,
}: {
  template: EvaluationTemplate
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveEvaluationCategories)
  const categories = Array.from({ length: EVALUATION_CATEGORY_MAX }, (_, index) => template.categories[index] ?? "")
  return (
    <form {...formProps} data-review-form="categories" className="grid gap-4">
      <input type="hidden" name="slug" value={template.slug} />
      {categories.map((category, index) => (
        <TextField
          key={index}
          id={`category-${index}`}
          name={`category-${index}`}
          label={`Category ${index + 1}`}
          defaultValue={category}
          optional={index >= 3}
        />
      ))}
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Save categories
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function ApplicantEvaluationForm({
  applicationId,
  categories,
  evaluation,
}: {
  applicationId: string
  categories: string[]
  evaluation: HumanEvaluation | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveApplicantEvaluation)
  useReloadWhenSaved(saveState)
  const ratings: EvaluationRating[] =
    evaluation?.ratings ?? categories.map((category) => ({ category, rating: null, notes: null }))
  return (
    <form {...formProps} data-review-form="evaluation" className="grid gap-5">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="m-0 text-[14px] text-ink-2">{HUMAN_EVALUATION_HELP}</p>
      {evaluation ? <p className="m-0 text-[13px] text-muted">{EVALUATION_FROZEN_HELP}</p> : null}
      {ratings.map((row, index) => (
        <div key={row.category} className="grid gap-3" data-evaluation-category={index}>
          <Select
            id={`rating-${applicationId}-${index}`}
            name={`rating-${index}`}
            label={`${row.category} (your rating)`}
            options={ratingSelectOptions()}
            defaultValue={row.rating === null ? "" : String(row.rating)}
            optional
          />
          <TextArea
            id={`notes-${applicationId}-${index}`}
            name={`notes-${index}`}
            label={`Notes for ${row.category}`}
            rows={3}
            defaultValue={row.notes ?? ""}
            optional
          />
        </div>
      ))}
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Save human evaluation
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function ApplicantDecisionForm({ applicationId }: { applicationId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(recordApplicantDecision)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-review-form="decision" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="m-0 text-[14px] text-ink-2">{DECISION_HELP}</p>
      <Select
        id={`decision-${applicationId}`}
        name="decision"
        label="Owner decision"
        options={OWNER_DECISIONS.map((value) => ({ value, label: OWNER_DECISION_LABELS[value] }))}
        placeholderOption="Choose a decision"
        defaultValue={null}
      />
      <TextArea
        id={`decision-reason-${applicationId}`}
        name="reason"
        label="Reason or note"
        rows={3}
        optional
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Record decision
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function ApplicantFollowUpForm({
  applicationId,
  action,
  dueOn,
  status,
}: {
  applicationId: string
  action: FollowUpAction | null
  dueOn: string | null
  status: FollowUpStatus | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveApplicantFollowUpAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-review-form="follow-up" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="m-0 text-[14px] text-ink-2">{FOLLOW_UP_HELP}</p>
      <Select
        id={`follow-up-${applicationId}`}
        name="action"
        label="Next action"
        options={FOLLOW_UP_ACTIONS.map((value) => ({ value, label: FOLLOW_UP_ACTION_LABELS[value] }))}
        defaultValue={action ?? "schedule_conversation"}
      />
      <TextField
        id={`follow-up-due-${applicationId}`}
        name="dueOn"
        type="date"
        label="Due date"
        defaultValue={dueOn ?? ""}
        optional
      />
      <Select
        id={`follow-up-status-${applicationId}`}
        name="status"
        label="Status"
        options={[
          { value: "pending", label: "Pending" },
          { value: "done", label: "Done" },
        ]}
        defaultValue={status ?? "pending"}
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Save follow-up
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
