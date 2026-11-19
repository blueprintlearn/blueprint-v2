"use client"

import { useEffect, useRef, useState } from "react"

import {
  AnswerStateNote,
  Button,
  NumberField,
  RadioGroup,
  SaveStatus,
  Select,
  TextField,
} from "@/components/blueprint"
import { saveGrowthInputs, saveGrowthResponse } from "@/lib/blueprint/growth-actions"
import {
  GROWTH_KIND_OPTIONS,
  GROWTH_NOTE_MAX,
  OWNER_RESPONSE_OPTIONS,
  TRAINING_AVAILABILITY_OPTIONS,
  type GrowthOwnerResponse,
  type GrowthPlanningInputs,
  type GrowthRecommendationKind,
} from "@/lib/blueprint/growth"
import { useSaveForm } from "./use-save-form"

function EstimateSkip({
  name,
  estimated,
  skipped,
  onEstimated,
  onSkipped,
}: {
  name: string
  estimated: boolean
  skipped: boolean
  onEstimated: (value: boolean) => void
  onSkipped: (value: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={estimated}
          disabled={skipped}
          onChange={(event) => onEstimated(event.target.checked)}
        />
        This is an estimate
      </label>
      {estimated ? <input type="hidden" name={`${name}Estimated`} value="1" /> : null}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={skipped} onChange={(event) => onSkipped(event.target.checked)} />
        Skip for now
      </label>
      {skipped ? <input type="hidden" name={`${name}Skip`} value="1" /> : null}
    </div>
  )
}

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

export function GrowthInputsForm({ inputs }: { inputs: GrowthPlanningInputs }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveGrowthInputs)
  useReloadWhenSaved(saveState)
  const [typicalEstimated, setTypicalEstimated] = useState(inputs.typicalLeadCapacity.state === "estimated")
  const [typicalSkip, setTypicalSkip] = useState(inputs.typicalLeadCapacity.state === "skipped")
  const [targetEstimated, setTargetEstimated] = useState(inputs.targetAnnualBookings.state === "estimated")
  const [targetSkip, setTargetSkip] = useState(inputs.targetAnnualBookings.state === "skipped")
  const [baselineEstimated, setBaselineEstimated] = useState(
    inputs.expectedBookingsWithoutExpansion.state === "estimated",
  )
  const [baselineSkip, setBaselineSkip] = useState(inputs.expectedBookingsWithoutExpansion.state === "skipped")
  const [rateEstimated, setRateEstimated] = useState(inputs.closingRatePercent.state === "estimated")
  const [rateSkip, setRateSkip] = useState(inputs.closingRatePercent.state === "skipped")
  const [training, setTraining] = useState(inputs.trainingAvailability.value)
  const [trainingSkip, setTrainingSkip] = useState(inputs.trainingAvailability.state === "skipped")

  return (
    <form {...formProps} className="flex flex-col gap-5" data-growth-form="inputs">
      <div className="grid gap-3">
        <NumberField
          id="typicalLeadCapacity"
          label="How many events can one lead DJ take in a year, typically?"
          name="typicalLeadCapacity"
          min={0}
          max={9999}
          placeholder="e.g. 40"
          defaultValue={typicalSkip ? null : inputs.typicalLeadCapacity.value}
          disabled={typicalSkip}
          help="This is applied to each independent lead DJ as an assumption. Blueprint does not fill in 20, 30, or 40."
          optional
        />
        {typicalEstimated && !typicalSkip ? <AnswerStateNote state="estimated" /> : null}
        <EstimateSkip
          name="typicalLeadCapacity"
          estimated={typicalEstimated}
          skipped={typicalSkip}
          onEstimated={setTypicalEstimated}
          onSkipped={setTypicalSkip}
        />
      </div>
      <div className="grid gap-3">
        <NumberField
          id="targetAnnualBookings"
          label="How many events do you want to book in a year?"
          name="targetAnnualBookings"
          min={0}
          max={9999}
          placeholder="e.g. 100"
          defaultValue={targetSkip ? null : inputs.targetAnnualBookings.value}
          disabled={targetSkip}
          help="This is a forward-looking target, not last year’s volume."
          optional
        />
        {targetEstimated && !targetSkip ? <AnswerStateNote state="estimated" /> : null}
        <EstimateSkip
          name="targetAnnualBookings"
          estimated={targetEstimated}
          skipped={targetSkip}
          onEstimated={setTargetEstimated}
          onSkipped={setTargetSkip}
        />
      </div>
      <div className="grid gap-3">
        <NumberField
          id="expectedBookingsWithoutExpansion"
          label="How many events do you expect next year if you stay the same size?"
          name="expectedBookingsWithoutExpansion"
          min={0}
          max={9999}
          placeholder="e.g. 80"
          defaultValue={baselineSkip ? null : inputs.expectedBookingsWithoutExpansion.value}
          disabled={baselineSkip}
          help="This is an owner-confirmed baseline. Current or historical volume is not used automatically."
          optional
        />
        {baselineEstimated && !baselineSkip ? <AnswerStateNote state="estimated" /> : null}
        <EstimateSkip
          name="expectedBookingsWithoutExpansion"
          estimated={baselineEstimated}
          skipped={baselineSkip}
          onEstimated={setBaselineEstimated}
          onSkipped={setBaselineSkip}
        />
      </div>
      <div className="grid gap-3">
        <NumberField
          id="closingRatePercent"
          label="What share of qualified leads become bookings?"
          name="closingRatePercent"
          min={0.01}
          max={100}
          step={0.1}
          placeholder="e.g. 25"
          defaultValue={rateSkip ? null : inputs.closingRatePercent.value}
          disabled={rateSkip}
          help="A percentage greater than 0 and at most 100. Decimals are allowed. Blueprint will not invent this."
          optional
        />
        {rateEstimated && !rateSkip ? <AnswerStateNote state="estimated" /> : null}
        <EstimateSkip
          name="closingRatePercent"
          estimated={rateEstimated}
          skipped={rateSkip}
          onEstimated={setRateEstimated}
          onSkipped={setRateSkip}
        />
      </div>
      <div className="grid gap-3">
        <RadioGroup
          id="trainingAvailability"
          label="Can you train new DJs in the next 12 months?"
          name="trainingAvailability"
          options={TRAINING_AVAILABILITY_OPTIONS}
          value={trainingSkip ? null : training}
          onChange={(next) => {
            setTrainingSkip(false)
            setTraining(next as GrowthPlanningInputs["trainingAvailability"]["value"])
          }}
          help="This is about the next year, not how people joined in the past."
          optional
        />
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          <input
            type="checkbox"
            checked={trainingSkip}
            onChange={(event) => setTrainingSkip(event.target.checked)}
          />
          Skip for now
        </label>
        {trainingSkip ? <input type="hidden" name="trainingAvailabilitySkip" value="1" /> : null}
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save planning answers
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function GrowthResponseForm({
  response,
  recommendedKind,
}: {
  response: GrowthOwnerResponse | null
  recommendedKind: GrowthRecommendationKind
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveGrowthResponse)
  useReloadWhenSaved(saveState)
  const [status, setStatus] = useState(response?.status ?? null)
  const kind = response?.selectedKind ?? recommendedKind

  return (
    <form {...formProps} className="flex flex-col gap-4" data-growth-form="response">
      <RadioGroup
        id="responseStatus"
        label="What do you want to do with this recommendation?"
        name="responseStatus"
        options={OWNER_RESPONSE_OPTIONS}
        value={status}
        onChange={(next) => setStatus(next as NonNullable<typeof status>)}
        help="This does not change your saved company goals, and it does not start recruiting."
      />
      {status === "modified" ? (
        <Select
          id="selectedKind"
          name="selectedKind"
          label="Use this next step instead"
          options={GROWTH_KIND_OPTIONS}
          defaultValue={kind}
        />
      ) : null}
      <TextField
        id="responseNote"
        name="responseNote"
        label="Add a note (optional)"
        defaultValue={response?.note ?? ""}
        maxLength={GROWTH_NOTE_MAX}
        optional
      />
      {error ? <p role="alert">{error}</p> : null}
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save your decision
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
