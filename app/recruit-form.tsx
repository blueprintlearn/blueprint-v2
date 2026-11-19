"use client"

import { useEffect, useRef, useState } from "react"

import {
  Button,
  CheckboxGroup,
  NumberField,
  RadioGroup,
  SaveStatus,
  Select,
  TextField,
} from "@/components/blueprint"
import {
  approveRecruitmentStrategy,
  saveRecruitmentDraft,
  saveRecruitmentInputs,
  startRecruitmentRevision,
} from "@/lib/blueprint/recruitment-actions"
import {
  RECRUIT_BUDGET_OPTIONS,
  RECRUIT_CHANNEL_OPTIONS,
  RECRUIT_COMPENSATION_OPTIONS,
  RECRUIT_EMPLOYMENT_OPTIONS,
  RECRUIT_NO_ADS,
  RECRUIT_PROFILE_OPTIONS,
  RECRUIT_REASON_OPTIONS,
  RECRUIT_STANCE_OPTIONS,
  RECRUIT_TRAINING_OPTIONS,
  RECRUIT_URGENCY_OPTIONS,
  type RecruitInputs,
  type RecruitView,
} from "@/lib/blueprint/recruitment"
import { AVAILABILITY_OPTIONS, TRAVEL_OPTIONS } from "@/lib/blueprint/ideal-dj"
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

function HiddenRecruitInputs({ inputs }: { inputs: RecruitInputs }) {
  const compensation = inputs.compensation
  const budget = inputs.budget
  return (
    <>
      {inputs.reason ? <input type="hidden" name="reason" value={inputs.reason} /> : null}
      {inputs.useGrowthPlan ? <input type="hidden" name="useGrowthPlan" value="1" /> : null}
      {inputs.hiringTarget !== null ? <input type="hidden" name="hiringTarget" value={String(inputs.hiringTarget)} /> : null}
      {inputs.hireProfile ? <input type="hidden" name="hireProfile" value={inputs.hireProfile} /> : null}
      {inputs.responsibilities ? <input type="hidden" name="responsibilities" value={inputs.responsibilities} /> : null}
      {(inputs.availability ?? []).map((code) => (
        <input key={code} type="hidden" name="availability" value={code} />
      ))}
      {inputs.travel ? <input type="hidden" name="travel" value={inputs.travel} /> : null}
      {inputs.employment ? <input type="hidden" name="employment" value={inputs.employment} /> : null}
      <input type="hidden" name="compensationKind" value={compensation.kind} />
      {compensation.kind === "hourly" || compensation.kind === "per_event" || compensation.kind === "salary" ? (
        <input type="hidden" name="compensationAmount" value={String(compensation.amount)} />
      ) : null}
      {compensation.kind === "range" ? (
        <>
          <input type="hidden" name="compensationMin" value={String(compensation.min)} />
          <input type="hidden" name="compensationMax" value={String(compensation.max)} />
        </>
      ) : null}
      {inputs.urgency ? <input type="hidden" name="urgency" value={inputs.urgency} /> : null}
      {inputs.training ? <input type="hidden" name="training" value={inputs.training} /> : null}
      <input type="hidden" name="budgetKind" value={budget.kind} />
      {budget.kind === "set" ? <input type="hidden" name="budgetAmount" value={String(budget.amount)} /> : null}
      {inputs.note ? <input type="hidden" name="note" value={inputs.note} /> : null}
    </>
  )
}

function DecisionFields({
  idPrefix,
  view,
}: {
  idPrefix: string
  view: RecruitView
}) {
  const [stance, setStance] = useState(view.decisions.stance)
  const recommendedChannels = (view.effective?.channels ?? view.proposed?.channels ?? [])
    .filter((row) => row.recommended)
    .map((row) => row.id)
  return (
    <>
      <RadioGroup
        id={`${idPrefix}-stance`}
        label="What do you want to do with this strategy?"
        name="stance"
        options={RECRUIT_STANCE_OPTIONS}
        value={stance}
        onChange={(next) => setStance(next as typeof stance)}
        help="This does not publish a job or contact anyone."
      />
      {stance === "modify" ? (
        <>
          <NumberField
            id={`${idPrefix}-hiringTarget`}
            label="People to recruit"
            name="decisionHiringTarget"
            min={1}
            max={9999}
            placeholder="e.g. 2"
            defaultValue={view.decisions.hiringTarget ?? view.effective?.hiringTarget ?? view.proposed?.hiring.target}
            help="A whole number from 1 to 9,999. Blueprint does not invent a headcount."
          />
          <Select
            id={`${idPrefix}-hireProfile`}
            name="decisionHireProfile"
            label="Beginner or experienced"
            options={RECRUIT_PROFILE_OPTIONS}
            defaultValue={view.decisions.hireProfile ?? view.effective?.hireProfile ?? view.proposed?.hiring.profile}
          />
          <CheckboxGroup
            id={`${idPrefix}-channels`}
            name="decisionChannels"
            label="Recruiting channels"
            options={RECRUIT_CHANNEL_OPTIONS}
            defaultValue={view.decisions.channels ?? recommendedChannels}
            help="Nothing is posted from this page."
          />
        </>
      ) : null}
      <TextField
        id={`${idPrefix}-note`}
        name="decisionNote"
        label="Add a note (optional)"
        defaultValue={view.decisions.note ?? ""}
        maxLength={400}
        optional
      />
    </>
  )
}

export function RecruitNeedForm({ view }: { view: RecruitView }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveRecruitmentInputs)
  useReloadWhenSaved(saveState)
  const [compensationKind, setCompensationKind] = useState(view.inputs.compensation.kind)
  const [budgetKind, setBudgetKind] = useState(view.inputs.budget.kind)
  const [useGrowth, setUseGrowth] = useState(view.inputs.useGrowthPlan)
  const compensationAmount =
    view.inputs.compensation.kind === "hourly" ||
    view.inputs.compensation.kind === "per_event" ||
    view.inputs.compensation.kind === "salary"
      ? view.inputs.compensation.amount
      : null
  const compensationMin = view.inputs.compensation.kind === "range" ? view.inputs.compensation.min : null
  const compensationMax = view.inputs.compensation.kind === "range" ? view.inputs.compensation.max : null
  return (
    <form {...formProps} className="flex flex-col gap-4" data-recruit-form="need">
      <RadioGroup
        id="reason"
        label="Why are you recruiting?"
        name="reason"
        options={RECRUIT_REASON_OPTIONS}
        defaultValue={view.inputs.reason ?? undefined}
      />
      {view.growthAvailable && view.growth ? (
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          <input
            type="checkbox"
            checked={useGrowth}
            onChange={(event) => setUseGrowth(event.target.checked)}
          />
          Use the current approved growth plan (version {view.growth.version}
          {view.growth.hiringTarget.count !== null ? `, ${view.growth.hiringTarget.count} additional DJs` : ""})
        </label>
      ) : null}
      {useGrowth ? <input type="hidden" name="useGrowthPlan" value="1" /> : null}
      <NumberField
        id="hiringTarget"
        label="How many people do you need?"
        name="hiringTarget"
        min={1}
        max={9999}
        placeholder="e.g. 2"
        defaultValue={view.inputs.hiringTarget}
        optional
        help="Leave blank if you do not know yet. Blueprint will not invent a number."
      />
      <Select
        id="hireProfile"
        name="hireProfile"
        label="Beginner or experienced"
        options={RECRUIT_PROFILE_OPTIONS}
        defaultValue={view.inputs.hireProfile}
        placeholderOption="Not sure yet"
        optional
      />
      <TextField
        id="responsibilities"
        name="responsibilities"
        label="Expected responsibilities"
        defaultValue={view.inputs.responsibilities ?? ""}
        maxLength={400}
        optional
        help="What this person must do. Leave blank if you have not decided."
      />
      <CheckboxGroup
        id="availability"
        name="availability"
        label="Desired availability"
        options={AVAILABILITY_OPTIONS}
        defaultValue={view.inputs.availability ?? []}
        optional
        help="Reuse the times from Your ideal DJ, or change them for this search."
      />
      <Select
        id="travel"
        name="travel"
        label="Service area they must be able to reach"
        options={TRAVEL_OPTIONS}
        defaultValue={view.inputs.travel}
        placeholderOption="Not sure yet"
        optional
      />
      <Select
        id="employment"
        name="employment"
        label="Employment arrangement"
        options={RECRUIT_EMPLOYMENT_OPTIONS}
        defaultValue={view.inputs.employment}
        placeholderOption="Not sure yet"
        optional
        help="A recruiting preference only. This is not a legal classification."
      />
      <RadioGroup
        id="compensationKind"
        name="compensationKind"
        label="Expected compensation"
        options={RECRUIT_COMPENSATION_OPTIONS}
        value={compensationKind}
        onChange={(next) => setCompensationKind(next as RecruitInputs["compensation"]["kind"])}
        help="Enter only a number you already pay or plan to offer. Blueprint will not invent a market rate."
      />
      {compensationKind === "hourly" || compensationKind === "per_event" || compensationKind === "salary" ? (
        <NumberField
          id="compensationAmount"
          name="compensationAmount"
          label="Amount in whole dollars"
          min={1}
          max={999999}
          placeholder="e.g. 25"
          defaultValue={compensationAmount}
        />
      ) : null}
      {compensationKind === "range" ? (
        <>
          <NumberField
            id="compensationMin"
            name="compensationMin"
            label="Low end, whole dollars"
            min={1}
            max={999999}
            placeholder="e.g. 20"
            defaultValue={compensationMin}
          />
          <NumberField
            id="compensationMax"
            name="compensationMax"
            label="High end, whole dollars"
            min={1}
            max={999999}
            placeholder="e.g. 40"
            defaultValue={compensationMax}
          />
        </>
      ) : null}
      <Select
        id="urgency"
        name="urgency"
        label="How soon do you need someone?"
        options={RECRUIT_URGENCY_OPTIONS}
        defaultValue={view.inputs.urgency}
        placeholderOption="Not sure yet"
        optional
      />
      <Select
        id="training"
        name="training"
        label="Available training capacity"
        options={RECRUIT_TRAINING_OPTIONS}
        defaultValue={view.inputs.training}
        placeholderOption="Not sure yet"
        optional
      />
      <RadioGroup
        id="budgetKind"
        name="budgetKind"
        label="Recruiting budget"
        options={RECRUIT_BUDGET_OPTIONS}
        value={budgetKind}
        onChange={(next) => setBudgetKind(next as RecruitInputs["budget"]["kind"])}
        help="Unpaid channels come first. Blueprint does not launch ads."
      />
      {budgetKind === "set" ? (
        <NumberField
          id="budgetAmount"
          name="budgetAmount"
          label="Budget in whole dollars"
          min={1}
          max={999999}
          placeholder="e.g. 200"
          defaultValue={view.inputs.budget.kind === "set" ? view.inputs.budget.amount : null}
        />
      ) : null}
      <TextField
        id="note"
        name="note"
        label="Anything else about this search (optional)"
        defaultValue={view.inputs.note ?? ""}
        maxLength={400}
        optional
      />
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save hiring need
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function RecruitDraftForm({ view }: { view: RecruitView }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveRecruitmentDraft)
  useReloadWhenSaved(saveState)
  if (!view.proposed) return null
  return (
    <form {...formProps} className="flex flex-col gap-4" data-recruit-form="draft">
      <HiddenRecruitInputs inputs={view.inputs} />
      <DecisionFields idPrefix="draft" view={view} />
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

export function RecruitApproveForm({ view }: { view: RecruitView }) {
  const { error, pending, saveState, formProps } = useSaveForm(approveRecruitmentStrategy)
  useReloadWhenSaved(saveState)
  const [confirmed, setConfirmed] = useState(false)
  if (!view.proposed) return null
  return (
    <form {...formProps} className="flex flex-col gap-4" data-recruit-form="approve">
      <HiddenRecruitInputs inputs={view.inputs} />
      <DecisionFields idPrefix="approve" view={view} />
      <p className="m-0 text-[14px] text-muted">{RECRUIT_NO_ADS}</p>
      <label className="flex items-center gap-2 text-[14px] text-ink-2">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        I have reviewed this strategy and want to approve it
      </label>
      {confirmed ? <input type="hidden" name="confirmApproval" value="1" /> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
          Approve recruiting strategy
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function RecruitReviseForm() {
  const { error, pending, saveState, formProps } = useSaveForm(startRecruitmentRevision)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="flex flex-col gap-3" data-recruit-form="revise">
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Revise this strategy
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
