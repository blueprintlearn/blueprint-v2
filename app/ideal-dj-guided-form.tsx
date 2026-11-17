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
  TextField,
} from "@/components/blueprint"
import {
  saveIdealDjExperienceCard,
  saveIdealDjFitCard,
  saveIdealDjHiringCard,
  skipQuestion,
} from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import {
  ARRANGEMENT_HELP,
  ARRANGEMENT_OPTIONS,
  AVAILABILITY_CODES,
  AVAILABILITY_OPTIONS,
  BEGINNER_OPTIONS,
  CORE_VALUE_MAX,
  CORE_VALUE_MAX_LENGTH,
  HIRING_WEIGHT_OPTIONS,
  PERSON_OPTIONS,
  POOR_FIT_CODES,
  POOR_FIT_MAX,
  POOR_FIT_OPTIONS,
  PRIORITY_MAX,
  QUALITY_MAX,
  QUALITY_OPTIONS,
  SKILL_OPTIONS,
  SKILL_RATING_OPTIONS,
  TRAVEL_OPTIONS,
  capChoices,
  codedListFromUnknown,
  coreValuesFromUnknown,
  exclusiveList,
  qualityLabel,
  qualitiesFromUnknown,
  skillRatingsFromUnknown,
  skippedIdealDjNote,
  IDEAL_DJ_PRIORITY_MAX_MESSAGE,
  IDEAL_DJ_QUALITY_MAX_MESSAGE,
} from "@/lib/blueprint/ideal-dj"
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
  questionKey: "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "I7" | "I8" | "I9" | "I10" | "I11"
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
      {showSkipped ? <AnswerStateNote state="skipped" text={skippedIdealDjNote()} /> : null}
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

function FitCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveIdealDjFitCard)
  const i1Saved = savedChoice(resolved, "I1")
  const i2Saved = qualitiesFromUnknown(valueOf(resolved, "I2"))
  const i3Saved = qualitiesFromUnknown(valueOf(resolved, "I3"))
  const i4Saved = coreValuesFromUnknown(valueOf(resolved, "I4"))
  const [i1Value, setI1Value] = useState(i1Saved)
  const [i2Value, setI2Value] = useState<string[]>(i2Saved ?? [])
  const [i3Value, setI3Value] = useState<string[]>(i3Saved ?? [])
  const [i4None, setI4None] = useState(i4Saved?.defined === false)
  const [i4Values, setI4Values] = useState<string[]>(
    i4Saved?.defined ? [...i4Saved.values, "", ""].slice(0, CORE_VALUE_MAX) : ["", "", ""],
  )
  const i1q = QUESTION_BY_KEY.I1
  const i2q = QUESTION_BY_KEY.I2
  const i3q = QUESTION_BY_KEY.I3
  const i4q = QUESTION_BY_KEY.I4
  const i2Label = qualityLabel(i1Value)
  const i3Options = QUALITY_OPTIONS.filter((option) => i2Value.includes(option.value))
  const subsetError = error && error.includes("qualities you picked") ? error : null
  const maxError = error && error.includes("up to") ? error : null
  const choiceError = error && error.includes("options") && !maxError && !subsetError ? error : null
  const listError = error && error.includes("at least one") ? error : null
  const valuesError = error && (error.includes("short value") || error.includes("40 characters")) ? error : null

  function changeQualities(next: string[]) {
    const limited = capChoices(next, QUALITY_MAX)
    setI2Value(limited)
    setI3Value((current) => current.filter((code) => limited.includes(code)))
  }

  return (
    <Card as="section" aria-labelledby="ideal-dj-fit-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="fit"
        data-saved-i1={i1Saved ?? ""}
        data-saved-i2={codesAttr(i2Saved ?? undefined)}
        data-saved-i3={codesAttr(i3Saved ?? undefined)}
        data-saved-i4={i4Saved ? (i4Saved.defined ? i4Saved.values.join(",") : "none") : ""}
      >
        <h2 id="ideal-dj-fit-card-title" className="bp-card__title">
          Who fits your company?
        </h2>
        <div id="q-I1">
          <RadioGroup
            label={i1q.label}
            name="i1"
            options={[...PERSON_OPTIONS]}
            value={i1Value}
            help="You do not need to name anyone."
            error={choiceError}
            onChange={setI1Value}
          />
          <SkipBlock
            questionKey="I1"
            label={i1q.label}
            why={i1q.guidance?.why}
            examples={i1q.guidance?.examples}
            skipped={stateOf(resolved, "I1") === "skipped"}
            canSkip={stateOf(resolved, "I1") === "unanswered"}
          />
        </div>
        <div id="q-I2">
          <CheckboxGroup
            label={i2Label}
            name="i2"
            options={[...QUALITY_OPTIONS]}
            value={i2Value}
            help="If you have someone in mind, describe them. If not, pick what you would want."
            note={i2Value.length >= QUALITY_MAX ? IDEAL_DJ_QUALITY_MAX_MESSAGE : "Choose up to five."}
            error={maxError ?? listError}
            onChange={changeQualities}
          />
          <SkipBlock
            questionKey="I2"
            label={i2Label}
            why={i2q.guidance?.why}
            examples={i2q.guidance?.examples}
            skipped={stateOf(resolved, "I2") === "skipped"}
            canSkip={stateOf(resolved, "I2") === "unanswered"}
          />
        </div>
        <div id="q-I3">
          <CheckboxGroup
            label={i3q.label}
            name="i3"
            options={i3Options}
            value={i3Value.filter((code) => i2Value.includes(code))}
            help={
              i2Value.length === 0
                ? "Choose qualities above first."
                : "These become your first hiring priorities."
            }
            note={i3Value.length >= PRIORITY_MAX ? IDEAL_DJ_PRIORITY_MAX_MESSAGE : "Choose up to three."}
            error={subsetError ?? maxError ?? listError}
            onChange={(next) => setI3Value(capChoices(next, PRIORITY_MAX))}
          />
          <SkipBlock
            questionKey="I3"
            label={i3q.label}
            why={i3q.guidance?.why}
            examples={i3q.guidance?.examples}
            skipped={stateOf(resolved, "I3") === "skipped"}
            canSkip={stateOf(resolved, "I3") === "unanswered"}
          />
        </div>
        <div id="q-I4">
          <p className="bp-field__label">{i4q.label}</p>
          <p className="bp-field__help">
            A few short words each is enough. You do not need a mission statement.
          </p>
          <CheckboxGroup
            label="If you haven’t written values yet"
            name="i4None"
            options={[{ value: "none", label: "I haven’t defined these yet" }]}
            value={i4None ? ["none"] : []}
            onChange={(next) => setI4None(next.includes("none"))}
          />
          {i4None ? null : (
            <div className="flex flex-col gap-3">
              {i4Values.map((value, index) => (
                <TextField
                  key={index}
                  label={`Value ${index + 1}`}
                  name={`i4v${index + 1}`}
                  value={value}
                  optional
                  maxLength={CORE_VALUE_MAX_LENGTH}
                  error={index === 0 ? valuesError : null}
                  onChange={(event) => {
                    const next = [...i4Values]
                    next[index] = event.target.value
                    setI4Values(next)
                    if (event.target.value.trim()) setI4None(false)
                  }}
                />
              ))}
            </div>
          )}
          <SkipBlock
            questionKey="I4"
            label={i4q.label}
            why={i4q.guidance?.why}
            examples={i4q.guidance?.examples}
            skipped={stateOf(resolved, "I4") === "skipped"}
            canSkip={stateOf(resolved, "I4") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save who fits
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function ExperienceCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveIdealDjExperienceCard)
  const i5Saved = skillRatingsFromUnknown(valueOf(resolved, "I5"))
  const i6Saved = savedChoice(resolved, "I6")
  const i7Saved = savedChoice(resolved, "I7")
  const [i5Value, setI5Value] = useState<Record<string, string>>(i5Saved ?? {})
  const [i6Value, setI6Value] = useState(i6Saved)
  const [i7Value, setI7Value] = useState(i7Saved)
  const i5q = QUESTION_BY_KEY.I5
  const i6q = QUESTION_BY_KEY.I6
  const i7q = QUESTION_BY_KEY.I7
  const skillError = error && error.includes("each skill") ? error : null
  const choiceError = error && error.includes("options") && !skillError ? error : null

  return (
    <Card as="section" aria-labelledby="ideal-dj-experience-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="experience"
        data-saved-i5={
          i5Saved
            ? SKILL_OPTIONS.map((skill) => `${skill.value}:${i5Saved[skill.value]}`).join(",")
            : ""
        }
        data-saved-i6={i6Saved ?? ""}
        data-saved-i7={i7Saved ?? ""}
      >
        <h2 id="ideal-dj-experience-card-title" className="bp-card__title">
          What experience matters?
        </h2>
        <div id="q-I5" className="flex flex-col gap-4">
          <p className="bp-field__label">{i5q.label}</p>
          <p className="bp-field__help">For each skill, say whether they must already have it, it can be taught, or it is not important.</p>
          {SKILL_OPTIONS.map((skill) => (
            <RadioGroup
              key={skill.value}
              label={skill.label}
              name={`i5_${skill.value}`}
              options={[...SKILL_RATING_OPTIONS]}
              value={i5Value[skill.value] ?? null}
              error={skillError}
              onChange={(next) => setI5Value((current) => ({ ...current, [skill.value]: next }))}
            />
          ))}
          <SkipBlock
            questionKey="I5"
            label={i5q.label}
            why={i5q.guidance?.why}
            examples={i5q.guidance?.examples}
            skipped={stateOf(resolved, "I5") === "skipped"}
            canSkip={stateOf(resolved, "I5") === "unanswered"}
          />
        </div>
        <div id="q-I6">
          <RadioGroup
            label={i6q.label}
            name="i6"
            options={[...BEGINNER_OPTIONS]}
            value={i6Value}
            help="Beginners and experienced DJs do not have to follow the same path."
            error={choiceError}
            onChange={setI6Value}
          />
          <SkipBlock
            questionKey="I6"
            label={i6q.label}
            why={i6q.guidance?.why}
            examples={i6q.guidance?.examples}
            skipped={stateOf(resolved, "I6") === "skipped"}
            canSkip={stateOf(resolved, "I6") === "unanswered"}
          />
        </div>
        <div id="q-I7">
          <RadioGroup
            label={i7q.label}
            name="i7"
            options={[...HIRING_WEIGHT_OPTIONS]}
            value={i7Value}
            help="This is a preference, not a hiring decision."
            error={choiceError}
            onChange={setI7Value}
          />
          <SkipBlock
            questionKey="I7"
            label={i7q.label}
            why={i7q.guidance?.why}
            examples={i7q.guidance?.examples}
            skipped={stateOf(resolved, "I7") === "skipped"}
            canSkip={stateOf(resolved, "I7") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save what experience matters
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function HiringCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveIdealDjHiringCard)
  const i8Saved = codedListFromUnknown(valueOf(resolved, "I8"), AVAILABILITY_CODES)
  const i9Saved = savedChoice(resolved, "I9")
  const i10Saved = savedChoice(resolved, "I10")
  const i11Saved = codedListFromUnknown(valueOf(resolved, "I11"), POOR_FIT_CODES)
  const [i8Value, setI8Value] = useState<string[]>(i8Saved ?? [])
  const [i9Value, setI9Value] = useState(i9Saved)
  const [i10Value, setI10Value] = useState(i10Saved)
  const [i11Value, setI11Value] = useState<string[]>(i11Saved ?? [])
  const i8q = QUESTION_BY_KEY.I8
  const i9q = QUESTION_BY_KEY.I9
  const i10q = QUESTION_BY_KEY.I10
  const i11q = QUESTION_BY_KEY.I11
  const exclusiveError = error && error.includes("on its own") ? error : null
  const maxError = error && error.includes("up to three") ? error : null
  const choiceError = error && error.includes("options") && !maxError ? error : null
  const listError = error && error.includes("at least one") ? error : null

  return (
    <Card as="section" aria-labelledby="ideal-dj-hiring-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="hiring"
        data-saved-i8={codesAttr(i8Saved ?? undefined)}
        data-saved-i9={i9Saved ?? ""}
        data-saved-i10={i10Saved ?? ""}
        data-saved-i11={codesAttr(i11Saved ?? undefined)}
      >
        <h2 id="ideal-dj-hiring-card-title" className="bp-card__title">
          Your hiring preferences
        </h2>
        <div id="q-I8">
          <CheckboxGroup
            label={i8q.label}
            name="i8"
            options={[...AVAILABILITY_OPTIONS]}
            value={i8Value}
            help="Availability varies stands on its own."
            error={exclusiveError ?? listError}
            onChange={(next) => setI8Value(exclusiveList(next, "varies"))}
          />
          <SkipBlock
            questionKey="I8"
            label={i8q.label}
            why={i8q.guidance?.why}
            examples={i8q.guidance?.examples}
            skipped={stateOf(resolved, "I8") === "skipped"}
            canSkip={stateOf(resolved, "I8") === "unanswered"}
          />
        </div>
        <div id="q-I9">
          <RadioGroup
            label={i9q.label}
            name="i9"
            options={[...TRAVEL_OPTIONS]}
            value={i9Value}
            help="A typical range is enough."
            error={choiceError}
            onChange={setI9Value}
          />
          <SkipBlock
            questionKey="I9"
            label={i9q.label}
            why={i9q.guidance?.why}
            examples={i9q.guidance?.examples}
            skipped={stateOf(resolved, "I9") === "skipped"}
            canSkip={stateOf(resolved, "I9") === "unanswered"}
          />
        </div>
        <div id="q-I10">
          <RadioGroup
            label={i10q.label}
            name="i10"
            options={[...ARRANGEMENT_OPTIONS]}
            value={i10Value}
            help={ARRANGEMENT_HELP}
            error={choiceError}
            onChange={setI10Value}
          />
          <SkipBlock
            questionKey="I10"
            label={i10q.label}
            why={i10q.guidance?.why}
            examples={i10q.guidance?.examples}
            skipped={stateOf(resolved, "I10") === "skipped"}
            canSkip={stateOf(resolved, "I10") === "unanswered"}
          />
        </div>
        <div id="q-I11">
          <CheckboxGroup
            label={i11q.label}
            name="i11"
            options={[...POOR_FIT_OPTIONS]}
            value={i11Value}
            help="Keep this about the work, not personal characteristics."
            note={i11Value.length >= POOR_FIT_MAX ? IDEAL_DJ_PRIORITY_MAX_MESSAGE : "Choose up to three."}
            error={maxError ?? listError}
            onChange={(next) => setI11Value(capChoices(next, POOR_FIT_MAX))}
          />
          <SkipBlock
            questionKey="I11"
            label={i11q.label}
            why={i11q.guidance?.why}
            examples={i11q.guidance?.examples}
            skipped={stateOf(resolved, "I11") === "skipped"}
            canSkip={stateOf(resolved, "I11") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your hiring preferences
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

export function IdealDjGuidedForm({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  return (
    <>
      <FitCard resolved={resolved} />
      <ExperienceCard resolved={resolved} />
      <HiringCard resolved={resolved} />
    </>
  )
}
