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
  saveServicesGrowCard,
  saveServicesMarketCard,
  saveServicesTodayCard,
  skipQuestion,
} from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import {
  COMPETE_CODES,
  COMPETE_OPTIONS,
  MARKET_CHOICE_MAX,
  MARKET_CHOICE_MAX_MESSAGE,
  POSITIONING_OPTIONS,
  SERVICE_CODES,
  SERVICE_GOAL_OPTIONS,
  SERVICE_OPTIONS,
  SERVICE_OTHER_TEXT_MAX,
  WHY_CHOSEN_CODES,
  WHY_CHOSEN_OPTIONS,
  capChoices,
  codedListFromUnknown,
  labeledServiceOptions,
  namedOtherLabel,
  newServiceOptions,
  serviceTypesFromUnknown,
  skippedServicesNote,
  type ServiceCode,
} from "@/lib/blueprint/services"
import { ALREADY_ANSWERED_MESSAGE, QUESTION_BY_KEY } from "@/lib/blueprint/questions"

import { useSaveForm } from "./use-save-form"

function stateOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.state ?? "unanswered"
}

function valueOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.value ?? null
}

function typesValue(resolved: readonly ResolvedAnswer[], key: string) {
  return serviceTypesFromUnknown(valueOf(resolved, key))
}

function codesAttr(codes: readonly string[] | undefined) {
  return codes?.join(",") ?? ""
}

function OtherField({ name, defaultValue, error }: { name: string; defaultValue: string; error: string | null }) {
  return (
    <TextField
      label="Other service"
      name={name}
      defaultValue={defaultValue}
      maxLength={SERVICE_OTHER_TEXT_MAX}
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
}: {
  questionKey: "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9"
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
      {showSkipped ? <AnswerStateNote state="skipped" text={skippedServicesNote()} /> : null}
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
  const { error, pending, saveState, formProps } = useSaveForm(saveServicesTodayCard)
  const s1 = typesValue(resolved, "S1")
  const s2 = typesValue(resolved, "S2")
  const s3 = typesValue(resolved, "S3")
  const [s1Codes, setS1Codes] = useState<string[]>([...(s1?.codes ?? [])])
  const [s1Other, setS1Other] = useState(s1?.other ?? "")
  const s1q = QUESTION_BY_KEY.S1
  const s2q = QUESTION_BY_KEY.S2
  const s3q = QUESTION_BY_KEY.S3
  const otherError = error && error.includes("few words") ? error : null
  const typesError = error && error.includes("service") && !error.includes("already") ? error : null
  const subsetError = error && error.includes("already offer") ? error : null
  const namedOther = s1Codes.includes("other") && s1Other.trim() ? s1Other.trim() : null
  const offeredOptions = labeledServiceOptions(
    s1Codes.length ? (s1Codes.filter((code): code is ServiceCode => (SERVICE_CODES as readonly string[]).includes(code))) : null,
    namedOther,
  )
  const namedFollowUp = namedOther || !offeredOptions.some((option) => option.value === "other")

  return (
    <Card as="section" aria-labelledby="services-today-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="today"
        data-saved-s1={codesAttr(s1?.codes)}
        data-saved-s1-other={s1?.other ?? ""}
        data-saved-s2={codesAttr(s2?.codes)}
        data-saved-s2-other={s2?.other ?? ""}
        data-saved-s3={codesAttr(s3?.codes)}
        data-saved-s3-other={s3?.other ?? ""}
      >
        <h2 id="services-today-card-title" className="bp-card__title">
          Your services today
        </h2>
        <div id="q-S1">
          <CheckboxGroup
            label={s1q.label}
            name="s1"
            options={[...SERVICE_OPTIONS]}
            value={s1Codes}
            help="Choose every service you currently offer. Add a custom service under Other if you need one."
            error={typesError && !subsetError ? typesError : null}
            onChange={setS1Codes}
            followUp={{
              other: (
                <TextField
                  label="Other service"
                  name="s1Other"
                  value={s1Other}
                  maxLength={SERVICE_OTHER_TEXT_MAX}
                  error={otherError}
                  onChange={(event) => setS1Other(event.currentTarget.value)}
                />
              ),
            }}
          />
          <SkipBlock
            questionKey="S1"
            label={s1q.label}
            why={s1q.guidance?.why}
            examples={s1q.guidance?.examples}
            skipped={stateOf(resolved, "S1") === "skipped"}
            canSkip={stateOf(resolved, "S1") === "unanswered"}
          />
        </div>
        <div id="q-S2">
          <CheckboxGroup
            label={s2q.label}
            name="s2"
            options={[...offeredOptions]}
            defaultValue={s2?.codes}
            help="Choose from the services you already offer. This is extra training, not basic DJ skills."
            error={subsetError}
            followUp={
              namedFollowUp
                ? undefined
                : { other: <OtherField name="s2Other" defaultValue={s2?.other ?? ""} error={otherError} /> }
            }
          />
          <SkipBlock
            questionKey="S2"
            label={s2q.label}
            why={s2q.guidance?.why}
            examples={s2q.guidance?.examples}
            skipped={stateOf(resolved, "S2") === "skipped"}
            canSkip={stateOf(resolved, "S2") === "unanswered"}
          />
        </div>
        <div id="q-S3">
          <CheckboxGroup
            label={s3q.label}
            name="s3"
            options={[...offeredOptions]}
            defaultValue={s3?.codes}
            help="Do not assume every DJ can deliver every service. Pick what they can already do without you."
            error={subsetError}
            followUp={
              namedFollowUp
                ? undefined
                : { other: <OtherField name="s3Other" defaultValue={s3?.other ?? ""} error={otherError} /> }
            }
          />
          <SkipBlock
            questionKey="S3"
            label={s3q.label}
            why={s3q.guidance?.why}
            examples={s3q.guidance?.examples}
            skipped={stateOf(resolved, "S3") === "skipped"}
            canSkip={stateOf(resolved, "S3") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your services today
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function MarketCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveServicesMarketCard)
  const s4Saved = typeof valueOf(resolved, "S4") === "string" ? String(valueOf(resolved, "S4")) : null
  const s5Saved = codedListFromUnknown(valueOf(resolved, "S5"), WHY_CHOSEN_CODES)
  const s6Saved = codedListFromUnknown(valueOf(resolved, "S6"), COMPETE_CODES)
  const [s4Value, setS4Value] = useState(s4Saved)
  const [s5Value, setS5Value] = useState<string[]>(s5Saved ?? [])
  const [s6Value, setS6Value] = useState<string[]>(s6Saved ?? [])
  const s4q = QUESTION_BY_KEY.S4
  const s5q = QUESTION_BY_KEY.S5
  const s6q = QUESTION_BY_KEY.S6
  const choiceError = error && error.includes("up to three") ? error : null
  const typesError = error && error.includes("option") && !choiceError ? error : null
  const chooseError = error && error.includes("at least one") ? error : null

  return (
    <Card as="section" aria-labelledby="services-market-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="market"
        data-saved-s4={s4Saved ?? ""}
        data-saved-s5={codesAttr(s5Saved ?? undefined)}
        data-saved-s6={codesAttr(s6Saved ?? undefined)}
      >
        <h2 id="services-market-card-title" className="bp-card__title">
          Your place in the market
        </h2>
        <div id="q-S4">
          <RadioGroup
            label={s4q.label}
            name="s4"
            options={[...POSITIONING_OPTIONS]}
            value={s4Value}
            help="This is how you see the company, not a ranking against others."
            error={typesError}
            onChange={setS4Value}
          />
          <SkipBlock
            questionKey="S4"
            label={s4q.label}
            why={s4q.guidance?.why}
            examples={s4q.guidance?.examples}
            skipped={stateOf(resolved, "S4") === "skipped"}
            canSkip={stateOf(resolved, "S4") === "unanswered"}
          />
        </div>
        <div id="q-S5">
          <CheckboxGroup
            label={s5q.label}
            name="s5"
            options={[...WHY_CHOSEN_OPTIONS]}
            value={s5Value}
            help="Pick up to three reasons clients give you. This is your view, not a survey."
            note={s5Value.length >= MARKET_CHOICE_MAX ? MARKET_CHOICE_MAX_MESSAGE : "Choose up to three."}
            error={choiceError ?? chooseError}
            onChange={(next) => setS5Value(capChoices(next))}
          />
          <SkipBlock
            questionKey="S5"
            label={s5q.label}
            why={s5q.guidance?.why}
            examples={s5q.guidance?.examples}
            skipped={stateOf(resolved, "S5") === "skipped"}
            canSkip={stateOf(resolved, "S5") === "unanswered"}
          />
        </div>
        <div id="q-S6">
          <CheckboxGroup
            label={s6q.label}
            name="s6"
            options={[...COMPETE_OPTIONS]}
            value={s6Value}
            help="Pick up to three. Blueprint will not turn this into competitor rankings."
            note={s6Value.length >= MARKET_CHOICE_MAX ? MARKET_CHOICE_MAX_MESSAGE : "Choose up to three."}
            error={choiceError ?? chooseError}
            onChange={(next) => setS6Value(capChoices(next))}
          />
          <SkipBlock
            questionKey="S6"
            label={s6q.label}
            why={s6q.guidance?.why}
            examples={s6q.guidance?.examples}
            skipped={stateOf(resolved, "S6") === "skipped"}
            canSkip={stateOf(resolved, "S6") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your place in the market
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function GrowCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveServicesGrowCard)
  const offered = typesValue(resolved, "S1")
  const namedOther = namedOtherLabel(offered)
  const s7 = typesValue(resolved, "S7")
  const s8 = typesValue(resolved, "S8")
  const s9Saved = typeof valueOf(resolved, "S9") === "string" ? String(valueOf(resolved, "S9")) : null
  const [s9Value, setS9Value] = useState(s9Saved)
  const s7q = QUESTION_BY_KEY.S7
  const s8q = QUESTION_BY_KEY.S8
  const s9q = QUESTION_BY_KEY.S9
  const otherError = error && error.includes("few words") ? error : null
  const subsetError = error && error.includes("already offer") ? error : null
  const overlapError = error && error.includes("don’t already offer") ? error : null
  const typesError = error && error.includes("service") && !subsetError && !overlapError ? error : null
  const goalError = error && error.includes("options") ? error : null
  const moreOptions = labeledServiceOptions(offered?.codes ?? null, namedOther)
  const addOptions = newServiceOptions(offered?.codes ?? null)
  const s8FollowUp =
    namedOther || !moreOptions.some((option) => option.value === "other")
      ? undefined
      : { other: <OtherField name="s8Other" defaultValue={s8?.other ?? ""} error={otherError} /> }

  return (
    <Card as="section" aria-labelledby="services-grow-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="grow"
        data-saved-s7={codesAttr(s7?.codes)}
        data-saved-s7-other={s7?.other ?? ""}
        data-saved-s8={codesAttr(s8?.codes)}
        data-saved-s8-other={s8?.other ?? ""}
        data-saved-s9={s9Saved ?? ""}
      >
        <h2 id="services-grow-card-title" className="bp-card__title">
          Where you want to grow
        </h2>
        <div id="q-S7">
          <CheckboxGroup
            label={s7q.label}
            name="s7"
            options={[...addOptions]}
            defaultValue={s7?.codes}
            help="Only services you don’t already offer. Skip this if you’re not adding anything new."
            error={overlapError ?? typesError}
            followUp={
              addOptions.some((option) => option.value === "other")
                ? { other: <OtherField name="s7Other" defaultValue={s7?.other ?? ""} error={otherError} /> }
                : undefined
            }
          />
          <SkipBlock
            questionKey="S7"
            label={s7q.label}
            why={s7q.guidance?.why}
            examples={s7q.guidance?.examples}
            skipped={stateOf(resolved, "S7") === "skipped"}
            canSkip={stateOf(resolved, "S7") === "unanswered"}
          />
        </div>
        <div id="q-S8">
          <CheckboxGroup
            label={s8q.label}
            name="s8"
            options={[...moreOptions]}
            defaultValue={s8?.codes}
            help="These are services you already offer and want to sell more often."
            error={subsetError ?? typesError}
            followUp={s8FollowUp}
          />
          <SkipBlock
            questionKey="S8"
            label={s8q.label}
            why={s8q.guidance?.why}
            examples={s8q.guidance?.examples}
            skipped={stateOf(resolved, "S8") === "skipped"}
            canSkip={stateOf(resolved, "S8") === "unanswered"}
          />
        </div>
        <div id="q-S9">
          <RadioGroup
            label={s9q.label}
            name="s9"
            options={[...SERVICE_GOAL_OPTIONS]}
            value={s9Value}
            help="One goal is enough. Blueprint will not recommend training from this yet."
            error={goalError}
            onChange={setS9Value}
          />
          <SkipBlock
            questionKey="S9"
            label={s9q.label}
            why={s9q.guidance?.why}
            examples={s9q.guidance?.examples}
            skipped={stateOf(resolved, "S9") === "skipped"}
            canSkip={stateOf(resolved, "S9") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save where you want to grow
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

export function ServicesGuidedForm({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  return (
    <>
      <TodayCard resolved={resolved} />
      <MarketCard resolved={resolved} />
      <GrowCard resolved={resolved} />
    </>
  )
}
