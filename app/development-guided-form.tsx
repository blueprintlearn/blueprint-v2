"use client"

import { useState } from "react"

import {
  AnswerStateNote,
  Button,
  Card,
  CheckboxGroup,
  NotSure,
  RadioGroup,
  SaveStatus,
} from "@/components/blueprint"
import {
  saveDevelopmentGoalsCard,
  saveDevelopmentResourcesCard,
  saveDevelopmentTodayCard,
  skipQuestion,
} from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import {
  CHALLENGE_CODES,
  CHALLENGE_OPTIONS,
  DEVELOPMENT_CHOICE_MAX,
  DEVELOPMENT_CHOICE_MAX_MESSAGE,
  EQUIPMENT_OPTIONS,
  HANDS_ON_CODES,
  HANDS_ON_OPTIONS,
  IMPROVE_CODES,
  IMPROVE_OPTIONS,
  JOIN_OPTIONS,
  LEARN_CODES,
  LEARN_OPTIONS,
  MATERIALS_CODES,
  MATERIALS_OPTIONS,
  READY_CODES,
  READY_OPTIONS,
  TIME_OPTIONS,
  TRAINER_OPTIONS,
  capChoices,
  codedListFromUnknown,
  exclusiveList,
  skippedDevelopmentNote,
} from "@/lib/blueprint/development"
import { ALREADY_ANSWERED_MESSAGE, QUESTION_BY_KEY } from "@/lib/blueprint/questions"

import { useSaveForm } from "./use-save-form"

function stateOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.state ?? "unanswered"
}

function valueOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.value ?? null
}

function savedChoice(resolved: readonly ResolvedAnswer[], key: string) {
  return typeof valueOf(resolved, key) === "string" ? String(valueOf(resolved, key)) : null
}

function codesAttr(codes: readonly string[] | undefined) {
  return codes?.join(",") ?? ""
}

function SkipBlock({
  questionKey,
  label,
  why,
  examples,
  skipped,
  canSkip,
}: {
  questionKey: "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8" | "D9" | "D10"
  label: string
  why?: string
  examples?: readonly { text: string; desktopOnly?: boolean }[]
  skipped: boolean
  canSkip: boolean
}) {
  const [justSkipped, setJustSkipped] = useState(false)
  const [skipError, setSkipError] = useState<string | null>(null)
  const showSkipped = skipped || justSkipped

  async function handleSkip() {
    const result = await skipQuestion(questionKey)
    if (result.error) {
      setSkipError(result.error)
      return
    }
    setJustSkipped(true)
  }

  return (
    <>
      {showSkipped ? <AnswerStateNote state="skipped" text={skippedDevelopmentNote()} /> : null}
      <NotSure
        question={label}
        why={why}
        examples={examples}
        canSkip={canSkip && !showSkipped}
        onSkip={handleSkip}
      />
      {skipError === ALREADY_ANSWERED_MESSAGE ? (
        <p className="bp-field__error" role="alert">
          {skipError}
        </p>
      ) : null}
    </>
  )
}

function TodayCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveDevelopmentTodayCard)
  const d1Saved = savedChoice(resolved, "D1")
  const d2Saved = codedListFromUnknown(valueOf(resolved, "D2"), LEARN_CODES)
  const d3Saved = savedChoice(resolved, "D3")
  const d4Saved = codedListFromUnknown(valueOf(resolved, "D4"), READY_CODES)
  const [d1Value, setD1Value] = useState(d1Saved)
  const [d2Value, setD2Value] = useState<string[]>(d2Saved ?? [])
  const [d3Value, setD3Value] = useState(d3Saved)
  const [d4Value, setD4Value] = useState<string[]>(d4Saved ?? [])
  const d1q = QUESTION_BY_KEY.D1
  const d2q = QUESTION_BY_KEY.D2
  const d3q = QUESTION_BY_KEY.D3
  const d4q = QUESTION_BY_KEY.D4
  const exclusiveError = error && error.includes("on its own") ? error : null
  const choiceError = error && error.includes("options") ? error : null
  const listError = error && error.includes("at least one") ? error : null

  return (
    <Card as="section" aria-labelledby="development-today-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="today"
        data-saved-d1={d1Saved ?? ""}
        data-saved-d2={codesAttr(d2Saved ?? undefined)}
        data-saved-d3={d3Saved ?? ""}
        data-saved-d4={codesAttr(d4Saved ?? undefined)}
      >
        <h2 id="development-today-card-title" className="bp-card__title">
          Your training today
        </h2>
        <div id="q-D1">
          <RadioGroup
            label={d1q.label}
            name="d1"
            options={[...JOIN_OPTIONS]}
            value={d1Value}
            help="Solo operators and companies with a team both belong here."
            error={choiceError}
            onChange={setD1Value}
          />
          <SkipBlock
            questionKey="D1"
            label={d1q.label}
            why={d1q.guidance?.why}
            examples={d1q.guidance?.examples}
            skipped={stateOf(resolved, "D1") === "skipped"}
            canSkip={stateOf(resolved, "D1") === "unanswered"}
          />
        </div>
        <div id="q-D2">
          <CheckboxGroup
            label={d2q.label}
            name="d2"
            options={[...LEARN_OPTIONS]}
            value={d2Value}
            help="What happens today, even if there is no formal process."
            error={exclusiveError ?? listError}
            onChange={(next) => setD2Value(exclusiveList(next, "no_formal"))}
          />
          <SkipBlock
            questionKey="D2"
            label={d2q.label}
            why={d2q.guidance?.why}
            examples={d2q.guidance?.examples}
            skipped={stateOf(resolved, "D2") === "skipped"}
            canSkip={stateOf(resolved, "D2") === "unanswered"}
          />
        </div>
        <div id="q-D3">
          <RadioGroup
            label={d3q.label}
            name="d3"
            options={[...TRAINER_OPTIONS]}
            value={d3Value}
            help="Nobody yet is a complete answer."
            error={choiceError}
            onChange={setD3Value}
          />
          <SkipBlock
            questionKey="D3"
            label={d3q.label}
            why={d3q.guidance?.why}
            examples={d3q.guidance?.examples}
            skipped={stateOf(resolved, "D3") === "skipped"}
            canSkip={stateOf(resolved, "D3") === "unanswered"}
          />
        </div>
        <div id="q-D4">
          <CheckboxGroup
            label={d4q.label}
            name="d4"
            options={[...READY_OPTIONS]}
            value={d4Value}
            help="How you decide today. No defined process yet stands on its own."
            error={exclusiveError ?? listError}
            onChange={(next) => setD4Value(exclusiveList(next, "no_process"))}
          />
          <SkipBlock
            questionKey="D4"
            label={d4q.label}
            why={d4q.guidance?.why}
            examples={d4q.guidance?.examples}
            skipped={stateOf(resolved, "D4") === "skipped"}
            canSkip={stateOf(resolved, "D4") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your training today
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function ResourcesCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveDevelopmentResourcesCard)
  const d5Saved = codedListFromUnknown(valueOf(resolved, "D5"), MATERIALS_CODES)
  const d6Saved = savedChoice(resolved, "D6")
  const d7Saved = codedListFromUnknown(valueOf(resolved, "D7"), HANDS_ON_CODES)
  const [d5Value, setD5Value] = useState<string[]>(d5Saved ?? [])
  const [d6Value, setD6Value] = useState(d6Saved)
  const [d7Value, setD7Value] = useState<string[]>(d7Saved ?? [])
  const d5q = QUESTION_BY_KEY.D5
  const d6q = QUESTION_BY_KEY.D6
  const d7q = QUESTION_BY_KEY.D7
  const exclusiveError = error && error.includes("on its own") ? error : null
  const choiceError = error && error.includes("options") ? error : null
  const listError = error && error.includes("at least one") ? error : null

  return (
    <Card as="section" aria-labelledby="development-resources-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="resources"
        data-saved-d5={codesAttr(d5Saved ?? undefined)}
        data-saved-d6={d6Saved ?? ""}
        data-saved-d7={codesAttr(d7Saved ?? undefined)}
      >
        <h2 id="development-resources-card-title" className="bp-card__title">
          Your training resources
        </h2>
        <div id="q-D5">
          <CheckboxGroup
            label={d5q.label}
            name="d5"
            options={[...MATERIALS_OPTIONS]}
            value={d5Value}
            help="Only what you already have. You don’t need to create anything here."
            error={exclusiveError ?? listError}
            onChange={(next) => setD5Value(exclusiveList(next, "nothing"))}
          />
          <SkipBlock
            questionKey="D5"
            label={d5q.label}
            why={d5q.guidance?.why}
            examples={d5q.guidance?.examples}
            skipped={stateOf(resolved, "D5") === "skipped"}
            canSkip={stateOf(resolved, "D5") === "unanswered"}
          />
        </div>
        <div id="q-D6">
          <RadioGroup
            label={d6q.label}
            name="d6"
            options={[...EQUIPMENT_OPTIONS]}
            value={d6Value}
            help="This is access today, not a shopping list."
            error={choiceError}
            onChange={setD6Value}
          />
          <SkipBlock
            questionKey="D6"
            label={d6q.label}
            why={d6q.guidance?.why}
            examples={d6q.guidance?.examples}
            skipped={stateOf(resolved, "D6") === "skipped"}
            canSkip={stateOf(resolved, "D6") === "unanswered"}
          />
        </div>
        <div id="q-D7">
          <CheckboxGroup
            label={d7q.label}
            name="d7"
            options={[...HANDS_ON_OPTIONS]}
            value={d7Value}
            help="What is possible today, even if it is not regular yet."
            error={exclusiveError ?? listError}
            onChange={(next) => setD7Value(exclusiveList(next, "no_opportunities"))}
          />
          <SkipBlock
            questionKey="D7"
            label={d7q.label}
            why={d7q.guidance?.why}
            examples={d7q.guidance?.examples}
            skipped={stateOf(resolved, "D7") === "skipped"}
            canSkip={stateOf(resolved, "D7") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your training resources
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function GoalsCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveDevelopmentGoalsCard)
  const d8Saved = codedListFromUnknown(valueOf(resolved, "D8"), CHALLENGE_CODES)
  const d9Saved = codedListFromUnknown(valueOf(resolved, "D9"), IMPROVE_CODES)
  const d10Saved = savedChoice(resolved, "D10")
  const [d8Value, setD8Value] = useState<string[]>(d8Saved ?? [])
  const [d9Value, setD9Value] = useState<string[]>(d9Saved ?? [])
  const [d10Value, setD10Value] = useState(d10Saved)
  const d8q = QUESTION_BY_KEY.D8
  const d9q = QUESTION_BY_KEY.D9
  const d10q = QUESTION_BY_KEY.D10
  const maxError = error && error.includes("up to three") ? error : null
  const exclusiveError = error && error.includes("on its own") ? error : null
  const choiceError = error && error.includes("options") && !maxError ? error : null
  const listError = error && error.includes("at least one") ? error : null

  return (
    <Card as="section" aria-labelledby="development-goals-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="goals"
        data-saved-d8={codesAttr(d8Saved ?? undefined)}
        data-saved-d9={codesAttr(d9Saved ?? undefined)}
        data-saved-d10={d10Saved ?? ""}
      >
        <h2 id="development-goals-card-title" className="bp-card__title">
          Your development goals
        </h2>
        <div id="q-D8">
          <CheckboxGroup
            label={d8q.label}
            name="d8"
            options={[...CHALLENGE_OPTIONS]}
            value={d8Value}
            help="Pick up to three. No major challenge yet stands on its own."
            note={d8Value.length >= DEVELOPMENT_CHOICE_MAX ? DEVELOPMENT_CHOICE_MAX_MESSAGE : "Choose up to three."}
            error={maxError ?? exclusiveError ?? listError}
            onChange={(next) => setD8Value(capChoices(exclusiveList(next, "no_major")))}
          />
          <SkipBlock
            questionKey="D8"
            label={d8q.label}
            why={d8q.guidance?.why}
            examples={d8q.guidance?.examples}
            skipped={stateOf(resolved, "D8") === "skipped"}
            canSkip={stateOf(resolved, "D8") === "unanswered"}
          />
        </div>
        <div id="q-D9">
          <CheckboxGroup
            label={d9q.label}
            name="d9"
            options={[...IMPROVE_OPTIONS]}
            value={d9Value}
            help="Pick up to three. Blueprint will not recommend a training path from this yet."
            note={d9Value.length >= DEVELOPMENT_CHOICE_MAX ? DEVELOPMENT_CHOICE_MAX_MESSAGE : "Choose up to three."}
            error={maxError ?? listError}
            onChange={(next) => setD9Value(capChoices(next))}
          />
          <SkipBlock
            questionKey="D9"
            label={d9q.label}
            why={d9q.guidance?.why}
            examples={d9q.guidance?.examples}
            skipped={stateOf(resolved, "D9") === "skipped"}
            canSkip={stateOf(resolved, "D9") === "unanswered"}
          />
        </div>
        <div id="q-D10">
          <RadioGroup
            label={d10q.label}
            name="d10"
            options={[...TIME_OPTIONS]}
            value={d10Value}
            help="This is your own time each week, not the whole team’s training time."
            error={choiceError}
            onChange={setD10Value}
          />
          <SkipBlock
            questionKey="D10"
            label={d10q.label}
            why={d10q.guidance?.why}
            examples={d10q.guidance?.examples}
            skipped={stateOf(resolved, "D10") === "skipped"}
            canSkip={stateOf(resolved, "D10") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your development goals
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

export function DevelopmentGuidedForm({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  return (
    <>
      <TodayCard resolved={resolved} />
      <ResourcesCard resolved={resolved} />
      <GoalsCard resolved={resolved} />
    </>
  )
}
