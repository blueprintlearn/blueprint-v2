"use client"

import { useState } from "react"

import { Button, CheckboxGroup, SaveStatus, Select, TextField } from "@/components/blueprint"
import { saveCompanyGoals } from "@/lib/blueprint/actions"
import {
  CHOOSE_ONE_GOAL_MESSAGE,
  CHOOSE_PRIMARY_GOAL_MESSAGE,
  DJ_PAIR_MESSAGE,
  GOAL_SET_OPTIONS,
  OWNER_ONLY_GOAL_MESSAGE,
  PRIMARY_SELECT_HELP,
  SAVE_GOALS_FAILED_MESSAGE,
  SINGLE_PRIMARY_LINE,
  reconcileGoalSelection,
} from "@/lib/blueprint/company-goals"
import {
  OWNER_GOAL_OTHER_MAX_LENGTH,
  OWNER_GOAL_OTHER_REQUIRED_MESSAGE,
  type OwnerGoalCode,
} from "@/lib/blueprint/goals"

import { useSaveForm } from "./use-save-form"

const GROUP_ERRORS = new Set([
  CHOOSE_ONE_GOAL_MESSAGE,
  DJ_PAIR_MESSAGE,
  OWNER_ONLY_GOAL_MESSAGE,
  SAVE_GOALS_FAILED_MESSAGE,
])

export function OwnerGoalsForm({
  companyId,
  goals: savedGoals,
  primary: savedPrimary,
  otherText: savedOtherText,
}: {
  companyId: string
  goals: OwnerGoalCode[]
  primary: OwnerGoalCode | null
  otherText: string | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveCompanyGoals)
  const [goals, setGoals] = useState<string[]>(savedGoals)
  const [primary, setPrimary] = useState<string>(
    savedPrimary ?? (savedGoals.length === 1 ? savedGoals[0] : ""),
  )
  const [note, setNote] = useState<string | null>(null)

  const groupError = error && GROUP_ERRORS.has(error) ? error : null
  const primaryError = error === CHOOSE_PRIMARY_GOAL_MESSAGE ? error : null
  const otherError = error === OWNER_GOAL_OTHER_REQUIRED_MESSAGE ? error : null
  const primaryOptions = GOAL_SET_OPTIONS.filter((option) => goals.includes(option.value)).map(
    (option) => ({ value: option.value, label: option.label }),
  )

  return (
    <form
      {...formProps}
      className="flex flex-col gap-5"
      data-saved-company-goals={savedGoals.join(",")}
      data-saved-primary={savedPrimary ?? ""}
      data-saved-other-text={savedOtherText ?? ""}
      data-company-id={companyId}
    >
      <CheckboxGroup
        label="What do you want Blueprint to help you do? Choose all that apply."
        name="goals"
        options={GOAL_SET_OPTIONS}
        value={goals}
        help="Pick everything that’s true. You’ll choose the most important one next."
        note={note}
        error={groupError}
        followUp={{
          other: (
            <TextField
              label="Other goal"
              name="otherText"
              defaultValue={savedOtherText ?? ""}
              maxLength={OWNER_GOAL_OTHER_MAX_LENGTH}
              placeholder="e.g. Open a second market"
              help="Describe your goal in a few words."
              error={otherError}
            />
          ),
        }}
        onChange={(next) => {
          const reconciled = reconcileGoalSelection(goals, next, primary)
          setGoals(reconciled.goals)
          setPrimary(reconciled.primary)
          setNote(reconciled.note)
        }}
      />
      {goals.length >= 2 ? (
        <Select
          key={`primary:${goals.join(",")}:${primary}`}
          label="Which one matters most right now?"
          name="primary"
          options={primaryOptions}
          placeholderOption="Select your main goal"
          defaultValue={primary || null}
          help={PRIMARY_SELECT_HELP}
          error={primaryError}
          onChange={(event) => setPrimary(event.target.value)}
        />
      ) : goals.length === 1 ? (
        <>
          <input type="hidden" name="primary" value={goals[0]} />
          <p className="m-0 text-[14px] text-ink-2">{SINGLE_PRIMARY_LINE}</p>
        </>
      ) : null}
      <div className="bp-form-row">
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          Save goals
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
