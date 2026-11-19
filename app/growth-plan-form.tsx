"use client"

import { useEffect, useRef, useState } from "react"

import { Button, NumberField, RadioGroup, SaveStatus, Select, TextField } from "@/components/blueprint"
import {
  approveGrowthPlan,
  saveGrowthPlanDraft,
  startGrowthPlanRevision,
} from "@/lib/blueprint/growth-plan-actions"
import { GROWTH_KIND_OPTIONS } from "@/lib/blueprint/growth"
import {
  GROWTH_PLAN_NOTE_MAX,
  GROWTH_PLAN_NO_RECRUITING,
  GROWTH_PLAN_STANCE_OPTIONS,
  HIRE_PROFILE_OPTIONS,
  type GrowthPlanDecisions,
  type GrowthPlanView,
} from "@/lib/blueprint/growth-plan"
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

function DecisionFields({
  idPrefix,
  decisions,
  recommendedTarget,
  recommendedKind,
}: {
  idPrefix: string
  decisions: GrowthPlanDecisions
  recommendedTarget: number | null
  recommendedKind: string | null
}) {
  const [stance, setStance] = useState(decisions.stance)
  return (
    <>
      <RadioGroup
        id={`${idPrefix}-stance`}
        label="What do you want to do with this plan?"
        name="stance"
        options={GROWTH_PLAN_STANCE_OPTIONS}
        value={stance}
        onChange={(next) => setStance(next as GrowthPlanDecisions["stance"])}
        help="This does not change your saved company goals, and it does not start recruiting."
      />
      {stance === "modify" ? (
        <>
          <NumberField
            id={`${idPrefix}-hiringTarget`}
            label="Hiring target (additional DJs)"
            name="hiringTarget"
            min={0}
            max={9999}
            placeholder="e.g. 2"
            defaultValue={decisions.hiringTarget ?? recommendedTarget}
            help="A whole number from 0 to 9,999. Blueprint does not accept a fraction of a DJ."
          />
          <Select
            id={`${idPrefix}-hireProfile`}
            name="hireProfile"
            label="Beginner or experienced DJs"
            options={HIRE_PROFILE_OPTIONS}
            defaultValue={decisions.hireProfile ?? "unspecified"}
          />
          <Select
            id={`${idPrefix}-recruitingKind`}
            name="recruitingKind"
            label="Recruiting direction"
            options={GROWTH_KIND_OPTIONS}
            defaultValue={decisions.recruitingKind ?? recommendedKind ?? "recruit"}
          />
        </>
      ) : null}
      <TextField
        id={`${idPrefix}-note`}
        name="note"
        label="Add a note (optional)"
        defaultValue={decisions.note ?? ""}
        maxLength={GROWTH_PLAN_NOTE_MAX}
        optional
      />
    </>
  )
}

export function GrowthPlanDraftForm({ view }: { view: GrowthPlanView }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveGrowthPlanDraft)
  useReloadWhenSaved(saveState)
  if (!view.proposed) return null
  return (
    <form {...formProps} className="flex flex-col gap-4" data-growth-plan-form="draft">
      <DecisionFields
        idPrefix="draft"
        decisions={view.decisions}
        recommendedTarget={view.proposed.hiring.recommendedTarget.value}
        recommendedKind={view.proposed.recruiting.kind}
      />
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save draft
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function GrowthPlanApproveForm({ view }: { view: GrowthPlanView }) {
  const { error, pending, saveState, formProps } = useSaveForm(approveGrowthPlan)
  useReloadWhenSaved(saveState)
  const [confirmed, setConfirmed] = useState(false)
  if (!view.proposed) return null
  return (
    <form {...formProps} className="flex flex-col gap-4" data-growth-plan-form="approve">
      <DecisionFields
        idPrefix="approve"
        decisions={view.decisions}
        recommendedTarget={view.proposed.hiring.recommendedTarget.value}
        recommendedKind={view.proposed.recruiting.kind}
      />
      <p className="m-0 text-[14px] text-muted">{GROWTH_PLAN_NO_RECRUITING}</p>
      <label className="flex items-center gap-2 text-[14px] text-ink-2">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I have reviewed this plan and want to approve it
      </label>
      {confirmed ? <input type="hidden" name="confirmApproval" value="1" /> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
          Approve Growth Plan
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function GrowthPlanReviseForm() {
  const { error, pending, saveState, formProps } = useSaveForm(startGrowthPlanRevision)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="flex flex-col gap-3" data-growth-plan-form="revise">
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Revise this plan
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
