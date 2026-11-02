"use client"

import { useState } from "react"

import {
  AnswerStateNote,
  Button,
  CheckboxGroup,
  NotSure,
  RadioGroup,
  SaveStatus,
  Select,
  TextField,
} from "@/components/blueprint"
import { saveAnswer, saveCompanyGoals, skipQuestion } from "@/lib/blueprint/actions"
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
  ADD_MORE_DETAIL,
  ALREADY_ANSWERED_MESSAGE,
  G1_SKIPPED_TEXT,
  G3_CHOOSE_MESSAGE,
  G3_HELP,
  G3_LABEL,
  G3_OPTIONS,
  QUESTION_BY_KEY,
} from "@/lib/blueprint/questions"
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

function TimeframeForm({ savedValue }: { savedValue: string | null }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveAnswer)
  const [value, setValue] = useState<string | null>(savedValue)

  return (
    <form {...formProps} className="flex flex-col gap-4" data-saved-g3={savedValue ?? ""}>
      <input type="hidden" name="questionKey" value="G3" />
      {value ? <input type="hidden" name="value" value={value} /> : null}
      <div id="q-G3">
        <RadioGroup
          id="g3"
          label={G3_LABEL}
          name="g3-display"
          options={G3_OPTIONS}
          value={value}
          help={G3_HELP}
          error={error === G3_CHOOSE_MESSAGE ? error : null}
          optional
          onChange={setValue}
        />
      </div>
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function OwnerGoalsForm({
  companyId,
  goals: savedGoals,
  primary: savedPrimary,
  otherText: savedOtherText,
  g1Skipped = false,
  g3Value = null,
}: {
  companyId: string
  goals: OwnerGoalCode[]
  primary: OwnerGoalCode | null
  otherText: string | null
  g1Skipped?: boolean
  g3Value?: string | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveCompanyGoals)
  const [goals, setGoals] = useState<string[]>(savedGoals)
  const [primary, setPrimary] = useState<string>(
    savedPrimary ?? (savedGoals.length === 1 ? savedGoals[0] : ""),
  )
  const [note, setNote] = useState<string | null>(null)
  const [skipError, setSkipError] = useState<string | null>(null)
  const [justSkipped, setJustSkipped] = useState(false)

  const groupError = error && GROUP_ERRORS.has(error) ? error : null
  const primaryError = error === CHOOSE_PRIMARY_GOAL_MESSAGE ? error : null
  const otherError = error === OWNER_GOAL_OTHER_REQUIRED_MESSAGE ? error : null
  const primaryOptions = GOAL_SET_OPTIONS.filter((option) => goals.includes(option.value)).map(
    (option) => ({ value: option.value, label: option.label }),
  )
  const g1 = QUESTION_BY_KEY.G1
  const g2 = QUESTION_BY_KEY.G2
  const showSkipped = g1Skipped || justSkipped
  const canSkipG1 = savedGoals.length === 0 && !showSkipped

  async function handleSkipG1() {
    const result = await skipQuestion("G1")
    if (result.error) {
      setSkipError(result.error)
      return
    }
    setJustSkipped(true)
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#blueprint-section-footer a")?.focus()
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-saved-company-goals={savedGoals.join(",")}
        data-saved-primary={savedPrimary ?? ""}
        data-saved-other-text={savedOtherText ?? ""}
        data-company-id={companyId}
        data-g1-skipped={g1Skipped ? "true" : "false"}
      >
        <div id="q-G1">
          <CheckboxGroup
            label={g1.label}
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
          <NotSure
            question={g1.label}
            why={g1.guidance?.why}
            examples={g1.guidance?.examples}
            canSkip={canSkipG1}
            onSkip={handleSkipG1}
          />
          {showSkipped ? <AnswerStateNote state="skipped" text={G1_SKIPPED_TEXT} /> : null}
          {skipError === ALREADY_ANSWERED_MESSAGE ? (
            <p className="bp-field__error" role="alert">
              {skipError}
            </p>
          ) : null}
        </div>
        {goals.length >= 2 ? (
          <div id="q-G2">
            <Select
              key={`primary:${goals.join(",")}:${primary}`}
              label={g2.label}
              name="primary"
              options={primaryOptions}
              placeholderOption="Select your main goal"
              defaultValue={primary || null}
              help={PRIMARY_SELECT_HELP}
              error={primaryError}
              onChange={(event) => setPrimary(event.currentTarget.value)}
            />
            <NotSure question={g2.label} why={g2.guidance?.why} examples={g2.guidance?.examples} />
          </div>
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
      <details className="bp-more-detail" open={Boolean(g3Value)}>
        <summary>{ADD_MORE_DETAIL}</summary>
        <TimeframeForm savedValue={g3Value} />
      </details>
    </div>
  )
}
