"use client"

import { useState } from "react"

import { Button, SaveStatus, Select, TextField } from "@/components/blueprint"
import { saveOwnerGoal } from "@/lib/blueprint/actions"
import {
  OWNER_GOAL_CODES,
  OWNER_GOAL_LABELS,
  OWNER_GOAL_OTHER_MAX_LENGTH,
  OWNER_GOAL_OTHER_REQUIRED_MESSAGE,
  type OwnerGoalCode,
} from "@/lib/blueprint/goals"

import { useSaveForm } from "./use-save-form"

const goalOptions = OWNER_GOAL_CODES.map((code) => ({ value: code, label: OWNER_GOAL_LABELS[code] }))

export function OwnerGoalForm({
  ownerGoal,
  ownerGoalOther,
}: {
  ownerGoal: OwnerGoalCode | null
  ownerGoalOther: string | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveOwnerGoal)
  const [selectedGoal, setSelectedGoal] = useState<string>(ownerGoal ?? "")
  const otherError = error === OWNER_GOAL_OTHER_REQUIRED_MESSAGE ? error : null

  return (
    <form
      {...formProps}
      className="flex flex-col gap-3"
      data-saved-owner-goal={ownerGoal ?? ""}
      data-saved-owner-goal-other={ownerGoalOther ?? ""}
    >
      <Select
        label="Owner goal"
        name="ownerGoal"
        options={goalOptions}
        placeholderOption="Select a goal"
        defaultValue={ownerGoal}
        help="What you most want Blueprint to help you do."
        error={otherError ? null : error}
        onChange={(event) => setSelectedGoal(event.target.value)}
      />
      {selectedGoal === "other" ? (
        <TextField
          label="Other goal"
          name="ownerGoalOther"
          defaultValue={ownerGoalOther ?? ""}
          maxLength={OWNER_GOAL_OTHER_MAX_LENGTH}
          placeholder="e.g. Open a second market"
          help="Describe your goal in a few words."
          error={otherError}
        />
      ) : null}
      <div className="bp-form-row">
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          Save owner goal
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
