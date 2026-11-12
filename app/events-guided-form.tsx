"use client"

import { useState, type ReactNode } from "react"

import {
  AnswerStateNote,
  Button,
  Card,
  CheckboxGroup,
  EstimateHelper,
  NotSure,
  NumberField,
  RadioGroup,
  SaveStatus,
  TextField,
} from "@/components/blueprint"
import {
  saveEventsFutureCard,
  saveEventsStaffCard,
  saveEventsTodayCard,
  skipQuestion,
} from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import {
  ANNUAL_EVENT_COUNT_MAX,
  ANNUAL_EVENT_COUNT_MIN,
  E2_ESTIMATE_UNIT,
  E2_FIELD_HELP,
  EVENT_OTHER_TEXT_MAX,
  EVENT_TYPE_OPTIONS,
  FUTURE_FOCUS_OPTIONS,
  NEW_DJ_PATH_OPTIONS,
  estimateAnnualVolume,
  eventTypesFromUnknown,
  newTypeOptions,
  skippedEventsNote,
  staffingOptions,
} from "@/lib/blueprint/events"
import { ALREADY_ANSWERED_MESSAGE, QUESTION_BY_KEY } from "@/lib/blueprint/questions"

import { useSaveForm } from "./use-save-form"

function stateOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.state ?? "unanswered"
}

function valueOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.value ?? null
}

function typesValue(resolved: readonly ResolvedAnswer[], key: string) {
  return eventTypesFromUnknown(valueOf(resolved, key))
}

function codesAttr(codes: readonly string[] | undefined) {
  return codes?.join(",") ?? ""
}

function OtherField({ name, defaultValue, error }: { name: string; defaultValue: string; error: string | null }) {
  return (
    <TextField
      label="Other event type"
      name={name}
      defaultValue={defaultValue}
      maxLength={EVENT_OTHER_TEXT_MAX}
      error={error}
    />
  )
}

function SkipBlock({
  questionKey,
  label,
  why,
  examples,
  skipped,
  canSkip,
  helper,
}: {
  questionKey: "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9"
  label: string
  why?: string
  examples?: readonly { text: string; desktopOnly?: boolean }[]
  skipped: boolean
  canSkip: boolean
  helper?: ReactNode
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
      {showSkipped ? <AnswerStateNote state="skipped" text={skippedEventsNote()} /> : null}
      <NotSure
        question={label}
        why={why}
        examples={examples}
        helper={helper}
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
  const { error, pending, saveState, formProps } = useSaveForm(saveEventsTodayCard)
  const e1 = typesValue(resolved, "E1")
  const e3 = typesValue(resolved, "E3")
  const e2State = stateOf(resolved, "E2")
  const e2Saved = typeof valueOf(resolved, "E2") === "number" ? (valueOf(resolved, "E2") as number) : null
  const [volume, setVolume] = useState(e2Saved)
  const [estimated, setEstimated] = useState(e2State === "estimated")
  const e1q = QUESTION_BY_KEY.E1
  const e2q = QUESTION_BY_KEY.E2
  const e3q = QUESTION_BY_KEY.E3
  const otherError = error && error.includes("few words") ? error : null
  const typesError = error && error.includes("event type") ? error : null
  const commonError = error && error.includes("already offer") ? error : null
  const volumeError = error && error.includes("0 to 9,999") ? error : null
  const commonOptions = staffingOptions(e1?.codes ?? null)

  return (
    <Card as="section" aria-labelledby="events-today-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="today"
        data-saved-e1={codesAttr(e1?.codes)}
        data-saved-e2={e2Saved === null ? "" : String(e2Saved)}
        data-saved-e2-state={e2State === "estimated" ? "estimated" : e2State === "answered" ? "answered" : ""}
        data-saved-e3={codesAttr(e3?.codes)}
      >
        <h2 id="events-today-card-title" className="bp-card__title">
          Your events today
        </h2>
        <div id="q-E1">
          <CheckboxGroup
            label={e1q.label}
            name="e1"
            options={[...EVENT_TYPE_OPTIONS]}
            defaultValue={e1?.codes}
            help="Choose every type you currently offer. Add a custom type under Other if you need one."
            error={typesError && !commonError ? typesError : null}
            followUp={{
              other: <OtherField name="e1Other" defaultValue={e1?.other ?? ""} error={otherError} />,
            }}
          />
          <SkipBlock
            questionKey="E1"
            label={e1q.label}
            why={e1q.guidance?.why}
            examples={e1q.guidance?.examples}
            skipped={stateOf(resolved, "E1") === "skipped"}
            canSkip={stateOf(resolved, "E1") === "unanswered"}
          />
        </div>
        <div id="q-E2">
          {estimated ? <AnswerStateNote state="estimated" /> : null}
          <NumberField
            key={`e2:${volume ?? "none"}:${estimated ? "est" : "ans"}`}
            label={e2q.label}
            name="e2"
            defaultValue={volume}
            min={ANNUAL_EVENT_COUNT_MIN}
            max={ANNUAL_EVENT_COUNT_MAX}
            optional
            placeholder="e.g. 80"
            help={E2_FIELD_HELP}
            error={volumeError}
            onChange={(event) => {
              const next = event.currentTarget.value
              setVolume(next === "" ? null : Number(next))
              setEstimated(false)
            }}
          />
          {estimated ? <input type="hidden" name="e2Estimated" value="1" /> : null}
          <SkipBlock
            questionKey="E2"
            label={e2q.label}
            why={e2q.guidance?.why}
            examples={e2q.guidance?.examples}
            skipped={stateOf(resolved, "E2") === "skipped"}
            canSkip={stateOf(resolved, "E2") === "unanswered"}
            helper={
              <EstimateHelper
                inputs={[
                  {
                    name: "typicalMonth",
                    label: "Events in a typical month",
                    min: 0,
                    max: 200,
                    placeholder: "e.g. 8",
                  },
                ]}
                compute={estimateAnnualVolume}
                max={ANNUAL_EVENT_COUNT_MAX}
                unit={E2_ESTIMATE_UNIT}
                onUse={(result) => {
                  setVolume(result)
                  setEstimated(true)
                }}
              />
            }
          />
        </div>
        <div id="q-E3">
          <CheckboxGroup
            label={e3q.label}
            name="e3"
            options={[...commonOptions]}
            defaultValue={e3?.codes}
            help="Choose from the types you already offer. A yearly breakdown by type isn’t needed."
            error={commonError}
            followUp={
              commonOptions.some((option) => option.value === "other")
                ? { other: <OtherField name="e3Other" defaultValue={e3?.other ?? ""} error={otherError} /> }
                : undefined
            }
          />
          <SkipBlock
            questionKey="E3"
            label={e3q.label}
            why={e3q.guidance?.why}
            examples={e3q.guidance?.examples}
            skipped={stateOf(resolved, "E3") === "skipped"}
            canSkip={stateOf(resolved, "E3") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your events today
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function StaffCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveEventsStaffCard)
  const offered = typesValue(resolved, "E1")?.codes ?? null
  const options = staffingOptions(offered)
  const e4 = typesValue(resolved, "E4")
  const e5 = typesValue(resolved, "E5")
  const e6Saved = typeof valueOf(resolved, "E6") === "string" ? String(valueOf(resolved, "E6")) : null
  const [e6Value, setE6Value] = useState(e6Saved)
  const e4q = QUESTION_BY_KEY.E4
  const e5q = QUESTION_BY_KEY.E5
  const e6q = QUESTION_BY_KEY.E6
  const otherError = error && error.includes("few words") ? error : null
  const typesError = error && error.includes("event type") ? error : null
  const pathError = error && error.includes("options") ? error : null

  return (
    <Card as="section" aria-labelledby="events-staff-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="staff"
        data-saved-e4={codesAttr(e4?.codes)}
        data-saved-e5={codesAttr(e5?.codes)}
        data-saved-e6={e6Saved ?? ""}
      >
        <h2 id="events-staff-card-title" className="bp-card__title">
          How you staff events
        </h2>
        <div id="q-E4">
          <CheckboxGroup
            label={e4q.label}
            name="e4"
            options={[...options]}
            defaultValue={e4?.codes}
            help="Choose every type an existing DJ can run alone."
            error={typesError}
            followUp={
              options.some((option) => option.value === "other")
                ? { other: <OtherField name="e4Other" defaultValue={e4?.other ?? ""} error={otherError} /> }
                : undefined
            }
          />
          <SkipBlock
            questionKey="E4"
            label={e4q.label}
            why={e4q.guidance?.why}
            examples={e4q.guidance?.examples}
            skipped={stateOf(resolved, "E4") === "skipped"}
            canSkip={stateOf(resolved, "E4") === "unanswered"}
          />
        </div>
        <div id="q-E5">
          <CheckboxGroup
            label={e5q.label}
            name="e5"
            options={[...options]}
            defaultValue={e5?.codes}
            help="This can overlap with types your DJs can lead. It is about whether you still need to be there."
            error={typesError}
            followUp={
              options.some((option) => option.value === "other")
                ? { other: <OtherField name="e5Other" defaultValue={e5?.other ?? ""} error={otherError} /> }
                : undefined
            }
          />
          <SkipBlock
            questionKey="E5"
            label={e5q.label}
            why={e5q.guidance?.why}
            examples={e5q.guidance?.examples}
            skipped={stateOf(resolved, "E5") === "skipped"}
            canSkip={stateOf(resolved, "E5") === "unanswered"}
          />
        </div>
        <div id="q-E6">
          <RadioGroup
            label={e6q.label}
            name="e6"
            options={[...NEW_DJ_PATH_OPTIONS]}
            value={e6Value}
            help="There is no right path. Tell us what usually happens today."
            error={pathError}
            onChange={setE6Value}
          />
          <SkipBlock
            questionKey="E6"
            label={e6q.label}
            why={e6q.guidance?.why}
            examples={e6q.guidance?.examples}
            skipped={stateOf(resolved, "E6") === "skipped"}
            canSkip={stateOf(resolved, "E6") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save how you staff events
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function FutureCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveEventsFutureCard)
  const offered = typesValue(resolved, "E1")?.codes ?? null
  const e7 = typesValue(resolved, "E7")
  const e8 = typesValue(resolved, "E8")
  const e9Saved = typeof valueOf(resolved, "E9") === "string" ? String(valueOf(resolved, "E9")) : null
  const [e9Value, setE9Value] = useState(e9Saved)
  const e7q = QUESTION_BY_KEY.E7
  const e8q = QUESTION_BY_KEY.E8
  const e9q = QUESTION_BY_KEY.E9
  const otherError = error && error.includes("few words") ? error : null
  const subsetError = error && error.includes("already offer") ? error : null
  const overlapError = error && error.includes("don’t already offer") ? error : null
  const typesError = error && error.includes("event type") && !subsetError && !overlapError ? error : null
  const focusError = error && error.includes("options") ? error : null
  const moreOptions = staffingOptions(offered)
  const addOptions = newTypeOptions(offered)

  return (
    <Card as="section" aria-labelledby="events-future-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="future"
        data-saved-e7={codesAttr(e7?.codes)}
        data-saved-e8={codesAttr(e8?.codes)}
        data-saved-e9={e9Saved ?? ""}
      >
        <h2 id="events-future-card-title" className="bp-card__title">
          Your future events
        </h2>
        <div id="q-E7">
          <CheckboxGroup
            label={e7q.label}
            name="e7"
            options={[...moreOptions]}
            defaultValue={e7?.codes}
            help="These are types you already offer and want more of. New types are the next question."
            error={subsetError ?? typesError}
            followUp={
              moreOptions.some((option) => option.value === "other")
                ? { other: <OtherField name="e7Other" defaultValue={e7?.other ?? ""} error={otherError} /> }
                : undefined
            }
          />
          <SkipBlock
            questionKey="E7"
            label={e7q.label}
            why={e7q.guidance?.why}
            examples={e7q.guidance?.examples}
            skipped={stateOf(resolved, "E7") === "skipped"}
            canSkip={stateOf(resolved, "E7") === "unanswered"}
          />
        </div>
        <div id="q-E8">
          <CheckboxGroup
            label={e8q.label}
            name="e8"
            options={[...addOptions]}
            defaultValue={e8?.codes}
            help="Only types you don’t already offer. Skip this if you’re not adding anything new."
            error={overlapError ?? typesError}
            followUp={
              addOptions.some((option) => option.value === "other")
                ? { other: <OtherField name="e8Other" defaultValue={e8?.other ?? ""} error={otherError} /> }
                : undefined
            }
          />
          <SkipBlock
            questionKey="E8"
            label={e8q.label}
            why={e8q.guidance?.why}
            examples={e8q.guidance?.examples}
            skipped={stateOf(resolved, "E8") === "skipped"}
            canSkip={stateOf(resolved, "E8") === "unanswered"}
          />
        </div>
        <div id="q-E9">
          <RadioGroup
            label={e9q.label}
            name="e9"
            options={[...FUTURE_FOCUS_OPTIONS]}
            value={e9Value}
            help="More bookings and less of your own time at events are different, and you can want both."
            error={focusError}
            onChange={setE9Value}
          />
          <SkipBlock
            questionKey="E9"
            label={e9q.label}
            why={e9q.guidance?.why}
            examples={e9q.guidance?.examples}
            skipped={stateOf(resolved, "E9") === "skipped"}
            canSkip={stateOf(resolved, "E9") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your future events
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

export function EventsGuidedForm({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  return (
    <div className="flex flex-col gap-8">
      <TodayCard resolved={resolved} />
      <StaffCard resolved={resolved} />
      <FutureCard resolved={resolved} />
    </div>
  )
}
