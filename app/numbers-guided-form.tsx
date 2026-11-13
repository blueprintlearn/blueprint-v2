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
} from "@/components/blueprint"
import {
  saveNumbersCostsCard,
  saveNumbersGoalsCard,
  saveNumbersTodayCard,
  skipQuestion,
} from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import { ANNUAL_EVENT_COUNT_MAX, ANNUAL_EVENT_COUNT_MIN, E2_ESTIMATE_UNIT, estimateAnnualVolume } from "@/lib/blueprint/events"
import {
  DIRECT_COST_OPTIONS,
  FINANCIAL_PRIORITY_OPTIONS,
  MONEY_MAX,
  MONEY_MIN,
  N1_FIELD_HELP,
  N2_CONFIRM_HELP,
  N3_FIELD_HELP,
  N5_DOLLAR_HELP,
  N5_PERCENT_HELP,
  N5_VARIES_HELP,
  N7_FIELD_HELP,
  N9_FIELD_HELP,
  PAY_METHOD_OPTIONS,
  PERCENT_MAX,
  PERCENT_MIN,
  PRECISION_OPTIONS,
  REVENUE_PERIOD_OPTIONS,
  compensationUnitForMethod,
  djCostFromUnknown,
  directCostsFromUnknown,
  estimateAnnualRevenue,
  estimateTypicalBooking,
  exclusiveDirectCosts,
  financialPriorityFromUnknown,
  formatUsd,
  moneyAmountFromUnknown,
  noneDirectCosts,
  payMethodFromUnknown,
  revenueFromUnknown,
  skippedNumbersNote,
  volumeFromUnknown,
  type DirectCostCode,
  type PayMethodCode,
} from "@/lib/blueprint/numbers"
import { ALREADY_ANSWERED_MESSAGE, QUESTION_BY_KEY } from "@/lib/blueprint/questions"

import { useSaveForm } from "./use-save-form"

function stateOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.state ?? "unanswered"
}

function valueOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.value ?? null
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
  helper,
}: {
  questionKey: "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7" | "N8" | "N9"
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
      {showSkipped ? <AnswerStateNote state="skipped" text={skippedNumbersNote()} /> : null}
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

function PrecisionField({
  name,
  estimated,
  onChange,
}: {
  name: string
  estimated: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <>
      <RadioGroup
        label="Is this an estimate or exact?"
        name={`${name}Precision`}
        options={PRECISION_OPTIONS}
        value={estimated ? "estimated" : "exact"}
        help="Exact means you reported it as exact. Blueprint does not verify it."
        onChange={(next) => onChange(next === "estimated")}
      />
      {estimated ? <input type="hidden" name={`${name}Estimated`} value="1" /> : null}
    </>
  )
}

function TodayCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveNumbersTodayCard)
  const n1 = revenueFromUnknown(valueOf(resolved, "N1"))
  const n1State = stateOf(resolved, "N1")
  const n2State = stateOf(resolved, "N2")
  const n2Saved = volumeFromUnknown(valueOf(resolved, "N2"))
  const n3 = moneyAmountFromUnknown(valueOf(resolved, "N3"))
  const n3State = stateOf(resolved, "N3")
  const [n1Amount, setN1Amount] = useState(n1?.amount ?? null)
  const [n1Estimated, setN1Estimated] = useState(n1State === "estimated")
  const [volume, setVolume] = useState(n2Saved)
  const [n2Estimated, setN2Estimated] = useState(n2State === "estimated")
  const [n3Amount, setN3Amount] = useState(n3?.amount ?? null)
  const [n3Estimated, setN3Estimated] = useState(n3State === "estimated")
  const n1q = QUESTION_BY_KEY.N1
  const n2q = QUESTION_BY_KEY.N2
  const n3q = QUESTION_BY_KEY.N3
  const amountError = error && error.includes("whole-dollar") ? error : null
  const periodError = error && error.includes("last year or this year") ? error : null
  const volumeError = error && error.includes("0 to 9,999") ? error : null
  const n2Answered = n2State === "answered" || n2State === "estimated"

  return (
    <Card as="section" aria-labelledby="numbers-today-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="today"
        data-saved-n1={n1 ? String(n1.amount) : ""}
        data-saved-n1-period={n1?.period ?? ""}
        data-saved-n1-state={n1State === "estimated" ? "estimated" : n1State === "answered" ? "answered" : ""}
        data-saved-n2={n2Saved === null ? "" : String(n2Saved)}
        data-saved-n2-state={n2State === "estimated" ? "estimated" : n2State === "answered" ? "answered" : ""}
        data-saved-n3={n3 ? String(n3.amount) : ""}
        data-saved-n3-state={n3State === "estimated" ? "estimated" : n3State === "answered" ? "answered" : ""}
      >
        <h2 id="numbers-today-card-title" className="bp-card__title">
          Your business today
        </h2>
        <div id="q-N1">
          {n1Estimated ? <AnswerStateNote state="estimated" /> : null}
          <NumberField
            key={`n1:${n1Amount ?? "none"}:${n1Estimated ? "est" : "ans"}`}
            label={n1q.label}
            name="n1"
            defaultValue={n1Amount}
            min={MONEY_MIN}
            max={MONEY_MAX}
            optional
            placeholder="e.g. 250000"
            help={N1_FIELD_HELP}
            error={amountError && !volumeError ? amountError : null}
            onChange={(event) => {
              const next = event.currentTarget.value
              setN1Amount(next === "" ? null : Number(next))
              setN1Estimated(false)
            }}
          />
          {n1Amount !== null ? <p className="m-0 text-ink-2">{formatUsd(n1Amount)}</p> : null}
          <RadioGroup
            label="Which period is this?"
            name="n1Period"
            options={[...REVENUE_PERIOD_OPTIONS]}
            defaultValue={n1?.period ?? null}
            help="Last year’s books, or this year from typical monthly sales."
            error={periodError}
          />
          <PrecisionField name="n1" estimated={n1Estimated} onChange={setN1Estimated} />
          <SkipBlock
            questionKey="N1"
            label={n1q.label}
            why={n1q.guidance?.why}
            examples={n1q.guidance?.examples}
            skipped={n1State === "skipped"}
            canSkip={n1State === "unanswered"}
            helper={
              <EstimateHelper
                inputs={[
                  {
                    name: "typicalMonth",
                    label: "Typical monthly sales",
                    min: MONEY_MIN,
                    max: MONEY_MAX,
                    placeholder: "e.g. 20000",
                  },
                ]}
                compute={estimateAnnualRevenue}
                max={MONEY_MAX}
                format={formatUsd}
                onUse={(result) => {
                  setN1Amount(result)
                  setN1Estimated(true)
                }}
              />
            }
          />
        </div>
        <div id="q-N2">
          {n2Estimated ? <AnswerStateNote state="estimated" /> : null}
          <NumberField
            key={`n2:${volume ?? "none"}:${n2Estimated ? "est" : "ans"}`}
            label={n2q.label}
            name="n2"
            defaultValue={volume}
            min={ANNUAL_EVENT_COUNT_MIN}
            max={ANNUAL_EVENT_COUNT_MAX}
            optional
            placeholder="e.g. 80"
            help={n2Answered ? N2_CONFIRM_HELP : n2q.guidance?.why}
            error={volumeError}
            onChange={(event) => {
              const next = event.currentTarget.value
              setVolume(next === "" ? null : Number(next))
              setN2Estimated(false)
            }}
          />
          {n2Estimated ? <input type="hidden" name="n2Estimated" value="1" /> : null}
          <SkipBlock
            questionKey="N2"
            label={n2q.label}
            why={n2q.guidance?.why}
            examples={n2q.guidance?.examples}
            skipped={n2State === "skipped"}
            canSkip={n2State === "unanswered"}
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
                  setN2Estimated(true)
                }}
              />
            }
          />
        </div>
        <div id="q-N3">
          {n3Estimated ? <AnswerStateNote state="estimated" /> : null}
          <NumberField
            key={`n3:${n3Amount ?? "none"}:${n3Estimated ? "est" : "ans"}`}
            label={n3q.label}
            name="n3"
            defaultValue={n3Amount}
            min={MONEY_MIN}
            max={MONEY_MAX}
            optional
            placeholder="e.g. 1800"
            help={N3_FIELD_HELP}
            error={amountError}
            onChange={(event) => {
              const next = event.currentTarget.value
              setN3Amount(next === "" ? null : Number(next))
              setN3Estimated(false)
            }}
          />
          {n3Amount !== null ? <p className="m-0 text-ink-2">{formatUsd(n3Amount)}</p> : null}
          <PrecisionField name="n3" estimated={n3Estimated} onChange={setN3Estimated} />
          <SkipBlock
            questionKey="N3"
            label={n3q.label}
            why={n3q.guidance?.why}
            examples={n3q.guidance?.examples}
            skipped={n3State === "skipped"}
            canSkip={n3State === "unanswered"}
            helper={
              <EstimateHelper
                inputs={[
                  {
                    name: "eventRevenue",
                    label: "Yearly DJ-event revenue",
                    min: MONEY_MIN,
                    max: MONEY_MAX,
                    placeholder: "e.g. 144000",
                    help: "Only DJ-event revenue, not company-wide revenue.",
                  },
                  {
                    name: "bookings",
                    label: "Number of bookings",
                    min: 1,
                    max: ANNUAL_EVENT_COUNT_MAX,
                    placeholder: "e.g. 80",
                  },
                ]}
                compute={estimateTypicalBooking}
                max={MONEY_MAX}
                format={formatUsd}
                onUse={(result) => {
                  setN3Amount(result)
                  setN3Estimated(true)
                }}
              />
            }
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" variant="primary" disabled={pending}>
            Save your business today
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function CostsCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveNumbersCostsCard)
  const n4 = payMethodFromUnknown(valueOf(resolved, "N4"))
  const n4State = stateOf(resolved, "N4")
  const n5 = djCostFromUnknown(valueOf(resolved, "N5"))
  const n5State = stateOf(resolved, "N5")
  const n6 = directCostsFromUnknown(valueOf(resolved, "N6"))
  const n6State = stateOf(resolved, "N6")
  const n7 = moneyAmountFromUnknown(valueOf(resolved, "N7"))
  const n7State = stateOf(resolved, "N7")
  const [method, setMethod] = useState<string>(n4 ?? "")
  const [n5Amount, setN5Amount] = useState(n5?.amount ?? null)
  const [n5Estimated, setN5Estimated] = useState(n5State === "estimated" || n4 === "varies")
  const [n6Codes, setN6Codes] = useState<string[]>([...(n6?.codes ?? [])])
  const [n7Amount, setN7Amount] = useState(n7?.amount ?? null)
  const [n7Estimated, setN7Estimated] = useState(n7State === "estimated")
  const n4q = QUESTION_BY_KEY.N4
  const n5q = QUESTION_BY_KEY.N5
  const n6q = QUESTION_BY_KEY.N6
  const n7q = QUESTION_BY_KEY.N7
  const unit = compensationUnitForMethod((method || n4) as PayMethodCode | null)
  const percent = unit === "percent"
  const showN7 = !noneDirectCosts(n6Codes.length ? { codes: n6Codes as DirectCostCode[] } : null)
  const amountError = error && error.includes("whole-dollar") ? error : null
  const percentError = error && error.includes("0 to 100") ? error : null
  const choiceError = error && error.includes("options") ? error : null
  const costsError = error && (error.includes("direct costs") || error.includes("None and Not sure")) ? error : null
  const n5Help = method === "varies" ? N5_VARIES_HELP : percent ? N5_PERCENT_HELP : N5_DOLLAR_HELP
  const n5Label = percent
    ? "Approximately what percent of the booking does a typical lead DJ cost you?"
    : n5q.label

  return (
    <Card as="section" aria-labelledby="numbers-costs-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="costs"
        data-saved-n4={n4 ?? ""}
        data-saved-n5={n5 ? String(n5.amount) : ""}
        data-saved-n5-unit={n5?.unit ?? ""}
        data-saved-n5-state={n5State === "estimated" ? "estimated" : n5State === "answered" ? "answered" : ""}
        data-saved-n6={codesAttr(n6?.codes)}
        data-saved-n7={n7 ? String(n7.amount) : ""}
        data-saved-n7-state={n7State === "estimated" ? "estimated" : n7State === "answered" ? "answered" : ""}
      >
        <h2 id="numbers-costs-card-title" className="bp-card__title">
          What events cost you
        </h2>
        <div id="q-N4">
          <RadioGroup
            label={n4q.label}
            name="n4"
            options={[...PAY_METHOD_OPTIONS]}
            value={method || null}
            help="If it varies, you can still enter a representative amount next."
            error={choiceError && !costsError ? choiceError : null}
            onChange={(next) => {
              const previousUnit = compensationUnitForMethod((method || n4) as PayMethodCode | null)
              const nextUnit = compensationUnitForMethod(next as PayMethodCode)
              setMethod(next)
              if (nextUnit !== previousUnit) setN5Amount(null)
              if (next === "varies") setN5Estimated(true)
            }}
          />
          <SkipBlock
            questionKey="N4"
            label={n4q.label}
            why={n4q.guidance?.why}
            examples={n4q.guidance?.examples}
            skipped={n4State === "skipped"}
            canSkip={n4State === "unanswered"}
          />
        </div>
        <div id="q-N5">
          {n5Estimated ? <AnswerStateNote state="estimated" /> : null}
          <NumberField
            key={`n5:${n5Amount ?? "none"}:${percent ? "pct" : "usd"}:${n5Estimated ? "est" : "ans"}`}
            label={n5Label}
            name={percent ? "n5Percent" : "n5"}
            defaultValue={n5Amount}
            min={percent ? PERCENT_MIN : MONEY_MIN}
            max={percent ? PERCENT_MAX : MONEY_MAX}
            optional
            placeholder={percent ? "e.g. 30" : "e.g. 400"}
            help={n5Help}
            error={percent ? percentError : amountError}
            onChange={(event) => {
              const next = event.currentTarget.value
              setN5Amount(next === "" ? null : Number(next))
              setN5Estimated(false)
            }}
          />
          {!percent && n5Amount !== null ? <p className="m-0 text-ink-2">{formatUsd(n5Amount)}</p> : null}
          {percent && n5Amount !== null ? <p className="m-0 text-ink-2">{`${n5Amount}%`}</p> : null}
          <PrecisionField name="n5" estimated={n5Estimated} onChange={setN5Estimated} />
          <SkipBlock
            questionKey="N5"
            label={n5Label}
            why={n5q.guidance?.why}
            examples={n5q.guidance?.examples}
            skipped={n5State === "skipped"}
            canSkip={n5State === "unanswered"}
          />
        </div>
        <div id="q-N6">
          <CheckboxGroup
            label={n6q.label}
            name="n6"
            options={[...DIRECT_COST_OPTIONS]}
            value={n6Codes}
            help="Direct event costs only. None and Not sure replace the other choices."
            error={costsError}
            onChange={(next) => {
              const codes = exclusiveDirectCosts(next)
              setN6Codes(codes)
              if (noneDirectCosts({ codes: codes as DirectCostCode[] })) {
                setN7Amount(null)
                setN7Estimated(false)
              }
            }}
          />
          <SkipBlock
            questionKey="N6"
            label={n6q.label}
            why={n6q.guidance?.why}
            examples={n6q.guidance?.examples}
            skipped={n6State === "skipped"}
            canSkip={n6State === "unanswered"}
          />
        </div>
        {showN7 ? (
          <div id="q-N7">
            {n7Estimated ? <AnswerStateNote state="estimated" /> : null}
            <NumberField
              key={`n7:${n7Amount ?? "none"}:${n7Estimated ? "est" : "ans"}`}
              label={n7q.label}
              name="n7"
              defaultValue={n7Amount}
              min={MONEY_MIN}
              max={MONEY_MAX}
              optional
              placeholder="e.g. 150"
              help={N7_FIELD_HELP}
              error={amountError}
              onChange={(event) => {
                const next = event.currentTarget.value
                setN7Amount(next === "" ? null : Number(next))
                setN7Estimated(false)
              }}
            />
            {n7Amount !== null ? <p className="m-0 text-ink-2">{formatUsd(n7Amount)}</p> : null}
            <PrecisionField name="n7" estimated={n7Estimated} onChange={setN7Estimated} />
            <SkipBlock
              questionKey="N7"
              label={n7q.label}
              why={n7q.guidance?.why}
              examples={n7q.guidance?.examples}
              skipped={n7State === "skipped"}
              canSkip={n7State === "unanswered"}
            />
          </div>
        ) : (
          <p className="m-0 text-ink-2">No other direct costs, so there’s nothing to add besides lead DJ pay.</p>
        )}
        <div className="bp-form-row">
          <Button type="submit" variant="primary" disabled={pending}>
            Save what events cost you
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function GoalsCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveNumbersGoalsCard)
  const n8 = financialPriorityFromUnknown(valueOf(resolved, "N8"))
  const n8State = stateOf(resolved, "N8")
  const n9 = moneyAmountFromUnknown(valueOf(resolved, "N9"))
  const n9State = stateOf(resolved, "N9")
  const [n9Amount, setN9Amount] = useState(n9?.amount ?? null)
  const [n9Estimated, setN9Estimated] = useState(n9State === "estimated")
  const n8q = QUESTION_BY_KEY.N8
  const n9q = QUESTION_BY_KEY.N9
  const amountError = error && error.includes("whole-dollar") ? error : null
  const choiceError = error && error.includes("options") ? error : null

  return (
    <Card as="section" aria-labelledby="numbers-goals-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="goals"
        data-saved-n8={n8 ?? ""}
        data-saved-n9={n9 ? String(n9.amount) : ""}
        data-saved-n9-state={n9State === "estimated" ? "estimated" : n9State === "answered" ? "answered" : ""}
      >
        <h2 id="numbers-goals-card-title" className="bp-card__title">
          Your financial goals
        </h2>
        <div id="q-N8">
          <RadioGroup
            label={n8q.label}
            name="n8"
            options={[...FINANCIAL_PRIORITY_OPTIONS]}
            defaultValue={n8}
            help="One priority is enough. This is not a score of how healthy the company is."
            error={choiceError}
          />
          <SkipBlock
            questionKey="N8"
            label={n8q.label}
            why={n8q.guidance?.why}
            examples={n8q.guidance?.examples}
            skipped={n8State === "skipped"}
            canSkip={n8State === "unanswered"}
          />
        </div>
        <div id="q-N9">
          {n9Estimated ? <AnswerStateNote state="estimated" /> : null}
          <NumberField
            key={`n9:${n9Amount ?? "none"}:${n9Estimated ? "est" : "ans"}`}
            label={n9q.label}
            name="n9"
            defaultValue={n9Amount}
            min={MONEY_MIN}
            max={MONEY_MAX}
            optional
            placeholder="e.g. 400000"
            help={N9_FIELD_HELP}
            error={amountError}
            onChange={(event) => {
              const next = event.currentTarget.value
              setN9Amount(next === "" ? null : Number(next))
              setN9Estimated(false)
            }}
          />
          {n9Amount !== null ? <p className="m-0 text-ink-2">{formatUsd(n9Amount)}</p> : null}
          <PrecisionField name="n9" estimated={n9Estimated} onChange={setN9Estimated} />
          <SkipBlock
            questionKey="N9"
            label={n9q.label}
            why={n9q.guidance?.why}
            examples={n9q.guidance?.examples}
            skipped={n9State === "skipped"}
            canSkip={n9State === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" variant="primary" disabled={pending}>
            Save your financial goals
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

export function NumbersGuidedForm({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  return (
    <div className="flex flex-col gap-8">
      <TodayCard resolved={resolved} />
      <CostsCard resolved={resolved} />
      <GoalsCard resolved={resolved} />
    </div>
  )
}
