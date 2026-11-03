"use client"

import { useState } from "react"

import {
  AnswerStateNote,
  Button,
  Card,
  CheckboxGroup,
  NotSure,
  NumberField,
  RadioGroup,
  SaveStatus,
  TextField,
} from "@/components/blueprint"
import { saveAnswer, saveTeamRunsCard, saveTeamTodayCard, saveTeamWantedCard, skipQuestion } from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import { ADD_MORE_DETAIL, ALREADY_ANSWERED_MESSAGE, QUESTION_BY_KEY } from "@/lib/blueprint/questions"
import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
  OTHER_TEXT_MAX,
  T0_OPTIONS,
  T1B_FIELD_HELP,
  T1_FIELD_HELP,
  T2_FIELD_HELP,
  T2_OPTIONS,
  T4_EXCLUSIVE_NOTE,
  T4_FIELD_HELP,
  T4_OPTIONS,
  T5_FIELD_HELP,
  T5_OPTIONS,
  T6_FIELD_HELP,
  T7_OPTIONS,
  T7_OTHER_MESSAGE,
  T8_FIELD_HELP,
  T8_OPTIONS,
  TEAM_EARLIER_SAVED_NOTE,
  TEAM_RANGE_MESSAGE,
  hasStoredTeamCount,
  includesOwnerT1Note,
  isConfirmedCount,
  m2Copy,
  skippedTeamNote,
  t0Label,
  t0Shown,
  t3Help,
  reconcileT4,
  t4CodesFromAnswers,
  t6Unconfirmed,
  t6UnconfirmedLabel,
  type AnswerTeamToday,
} from "@/lib/blueprint/team-today"

import { useSaveForm } from "./use-save-form"

function stateOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.state ?? "unanswered"
}

function valueOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.value ?? null
}

function SkipBlock({
  questionKey,
  label,
  why,
  examples,
  skipped,
  canSkip,
}: {
  questionKey: "T1" | "T1b" | "T2" | "T3" | "T4" | "T5" | "T6"
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
      {showSkipped ? <AnswerStateNote state="skipped" text={skippedTeamNote()} /> : null}
      <NotSure question={label} why={why} examples={examples} canSkip={canSkip && !showSkipped} onSkip={handleSkip} />
      {skipError === ALREADY_ANSWERED_MESSAGE ? (
        <p className="bp-field__error" role="alert">
          {skipError}
        </p>
      ) : null}
    </>
  )
}

function TodayCard({
  team,
  resolved,
}: {
  team: AnswerTeamToday | null
  resolved: readonly ResolvedAnswer[]
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveTeamTodayCard)
  const showT0 = t0Shown(team)
  const confirmedT1 = team && isConfirmedCount(team.currentDjCount, team.countBasis) ? team.currentDjCount : null
  const t1Default = confirmedT1
  const t1Source = `${team?.countBasis ?? "unknown"}:${t1Default ?? "none"}`
  const savedT1 = t1Default === null ? "" : String(t1Default)
  const [t1Draft, setT1Draft] = useState<{ source: string; value: string } | null>(null)
  const [t2Value, setT2Value] = useState<string | null>(team?.ownerDjFrequency ?? null)
  const t1 = t1Draft?.source === t1Source ? t1Draft.value : savedT1
  const t1Number = t1 === "" ? null : Number(t1)
  const showT3 = t1Number !== null && t1Number > 0
  const t0 = QUESTION_BY_KEY.T0
  const t1q = QUESTION_BY_KEY.T1
  const t1b = QUESTION_BY_KEY.T1b
  const t2 = QUESTION_BY_KEY.T2
  const t3 = QUESTION_BY_KEY.T3
  const storedN = team?.currentDjCount ?? null
  const rangeError = error === TEAM_RANGE_MESSAGE ? error : error
  const t1Error =
    error && (error === TEAM_RANGE_MESSAGE || error.startsWith("You said") || error.startsWith("Enter a whole number from 0 to"))
      ? error
      : null
  const t3Error = error && (error.startsWith("That’s more") || (error.startsWith("Enter a whole number from 0 to") && showT3))
    ? error
    : error === TEAM_RANGE_MESSAGE && showT3
      ? error
      : null

  return (
    <Card as="section" aria-labelledby="team-today-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="today"
        data-saved-t1={confirmedT1 === null ? "" : String(confirmedT1)}
        data-saved-t1b={team?.assistantOnlyCount ?? ""}
        data-saved-t2={team?.ownerDjFrequency ?? ""}
        data-saved-t3={team?.leadCapableCount ?? ""}
        data-saved-basis={team?.countBasis ?? "unknown"}
      >
        <h2 id="team-today-card-title" className="bp-card__title">
          Your team today
        </h2>
        {showT0 && storedN !== null ? (
          <div id="q-T0">
            <RadioGroup
              id="t0"
              label={t0Label(storedN)}
              name="t0"
              options={[...T0_OPTIONS]}
              help={t0.whyNeeded}
            />
          </div>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <div id="q-T1">
            <NumberField
              key={`t1:${team?.countBasis ?? "none"}:${t1Default ?? "none"}`}
              label={t1q.label}
              name="t1"
              defaultValue={t1Default}
              min={CURRENT_DJ_COUNT_MIN}
              max={CURRENT_DJ_COUNT_MAX}
              optional
              placeholder="e.g. 6"
              help={
                team?.countBasis === "includes_owner" && storedN !== null
                  ? includesOwnerT1Note(storedN)
                  : T1_FIELD_HELP
              }
              error={t1Error}
              onChange={(event) => setT1Draft({ source: t1Source, value: event.currentTarget.value })}
            />
            <SkipBlock
              questionKey="T1"
              label={t1q.label}
              why={t1q.guidance?.why}
              examples={t1q.guidance?.examples}
              skipped={stateOf(resolved, "T1") === "skipped"}
              canSkip={stateOf(resolved, "T1") === "unanswered"}
            />
          </div>
          <div id="q-T1b">
            <NumberField
              label={t1b.label}
              name="t1b"
              defaultValue={team?.assistantOnlyCount ?? null}
              min={CURRENT_DJ_COUNT_MIN}
              max={CURRENT_DJ_COUNT_MAX}
              optional
              help={T1B_FIELD_HELP}
              error={error === TEAM_RANGE_MESSAGE && !t1Error ? rangeError : null}
            />
            <SkipBlock
              questionKey="T1b"
              label={t1b.label}
              why={t1b.guidance?.why}
              examples={t1b.guidance?.examples}
              skipped={stateOf(resolved, "T1b") === "skipped"}
              canSkip={stateOf(resolved, "T1b") === "unanswered"}
            />
          </div>
        </div>
        <div id="q-T2">
          <RadioGroup
            id="t2"
            label={t2.label}
            name="t2"
            options={[...T2_OPTIONS]}
            value={t2Value}
            help={T2_FIELD_HELP}
            onChange={setT2Value}
          />
          <SkipBlock
            questionKey="T2"
            label={t2.label}
            why={t2.guidance?.why}
            examples={t2.guidance?.examples}
            skipped={stateOf(resolved, "T2") === "skipped"}
            canSkip={stateOf(resolved, "T2") === "unanswered"}
          />
        </div>
        {showT3 ? (
          <div id="q-T3">
            <NumberField
              label={t3.label}
              name="t3"
              defaultValue={team?.leadCapableCount ?? null}
              min={0}
              max={t1Number ?? undefined}
              optional
              help={t3Help(t1Number ?? 0)}
              error={t3Error}
            />
            <SkipBlock
              questionKey="T3"
              label={t3.label}
              why={t3.guidance?.why}
              examples={t3.guidance?.examples}
              skipped={stateOf(resolved, "T3") === "skipped"}
              canSkip={stateOf(resolved, "T3") === "unanswered"}
            />
          </div>
        ) : null}
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your team today
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function RunsCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveTeamRunsCard)
  const savedT4 = valueOf(resolved, "T4")
  const savedT5 = valueOf(resolved, "T5")
  const t4Saved = Array.isArray(savedT4) ? savedT4.map(String) : []
  const t5Saved = savedT5 && typeof savedT5 === "object" && Array.isArray((savedT5 as { codes?: unknown }).codes)
    ? ((savedT5 as { codes: string[] }).codes)
    : []
  const t5OtherSaved =
    savedT5 && typeof savedT5 === "object" && typeof (savedT5 as { other?: unknown }).other === "string"
      ? (savedT5 as { other: string }).other
      : ""
  const [t4Value, setT4Value] = useState(t4Saved)
  const [t4Note, setT4Note] = useState<string | null>(null)
  const t4q = QUESTION_BY_KEY.T4
  const t5q = QUESTION_BY_KEY.T5

  return (
    <Card as="section" aria-labelledby="team-runs-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="runs"
        data-saved-t4={t4Saved.join(",")}
        data-saved-t5={t5Saved.join(",")}
      >
        <h2 id="team-runs-card-title" className="bp-card__title">
          How your team runs
        </h2>
        <div id="q-T4">
          <CheckboxGroup
            label={t4q.label}
            name="t4"
            options={[...T4_OPTIONS]}
            value={t4Value}
            help={T4_FIELD_HELP}
            note={t4Note}
            error={error && error.includes("Nobody") ? error : null}
            onChange={(next) => {
              const reconciled = reconcileT4(next)
              setT4Value(reconciled)
              setT4Note(next.includes("nobody") && next.length > 1 ? T4_EXCLUSIVE_NOTE : null)
            }}
          />
          <SkipBlock
            questionKey="T4"
            label={t4q.label}
            why={t4q.guidance?.why}
            examples={t4q.guidance?.examples}
            skipped={stateOf(resolved, "T4") === "skipped"}
            canSkip={stateOf(resolved, "T4") === "unanswered"}
          />
        </div>
        <div id="q-T5">
          <CheckboxGroup
            label={t5q.label}
            name="t5"
            options={[...T5_OPTIONS]}
            defaultValue={t5Saved}
            help={T5_FIELD_HELP}
            error={error && (error === "Choose up to three." || error.includes("challenge") || error.includes("hardest")) ? error : null}
            followUp={{
              other: (
                <TextField
                  label="Other challenge"
                  name="t5Other"
                  defaultValue={t5OtherSaved}
                  maxLength={OTHER_TEXT_MAX}
                  error={error && error.includes("challenge") ? error : null}
                />
              ),
            }}
          />
          <SkipBlock
            questionKey="T5"
            label={t5q.label}
            why={t5q.guidance?.why}
            examples={t5q.guidance?.examples}
            skipped={stateOf(resolved, "T5") === "skipped"}
            canSkip={stateOf(resolved, "T5") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save how your team runs
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function WantedCard({
  team,
  resolved,
}: {
  team: AnswerTeamToday | null
  resolved: readonly ResolvedAnswer[]
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveTeamWantedCard)
  const confirmed = team && isConfirmedCount(team.desiredDjCount, team.desiredCountBasis) ? team.desiredDjCount : null
  const unconfirmed = t6Unconfirmed(team)
  const t6q = QUESTION_BY_KEY.T6
  const prefill = confirmed ?? (unconfirmed ? team?.desiredDjCount ?? null : null)

  return (
    <Card as="section" aria-labelledby="team-wanted-card-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="wanted"
        data-saved-t6={confirmed === null ? "" : String(confirmed)}
        data-saved-desired-basis={team?.desiredCountBasis ?? "unknown"}
      >
        <h2 id="team-wanted-card-title" className="bp-card__title">
          The team you want
        </h2>
        <div id="q-T6">
          <NumberField
            key={`t6:${team?.desiredCountBasis ?? "none"}:${prefill ?? "none"}`}
            label={unconfirmed && team && team.desiredDjCount != null ? t6UnconfirmedLabel(team.desiredDjCount) : t6q.label}
            name="t6"
            defaultValue={prefill}
            min={CURRENT_DJ_COUNT_MIN}
            max={CURRENT_DJ_COUNT_MAX}
            optional
            placeholder="e.g. 8"
            help={T6_FIELD_HELP}
            error={error}
          />
          <SkipBlock
            questionKey="T6"
            label={t6q.label}
            why={t6q.guidance?.why}
            examples={t6q.guidance?.examples}
            skipped={stateOf(resolved, "T6") === "skipped"}
            canSkip={stateOf(resolved, "T6") === "unanswered"}
          />
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save the team you want
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

function DetailCard({
  resolved,
  showT7,
}: {
  resolved: readonly ResolvedAnswer[]
  showT7: boolean
}) {
  const t7Value = valueOf(resolved, "T7")
  const t8Value = valueOf(resolved, "T8")
  const t7Code =
    t7Value && typeof t7Value === "object" && typeof (t7Value as { code?: unknown }).code === "string"
      ? (t7Value as { code: string }).code
      : null
  const t7Other =
    t7Value && typeof t7Value === "object" && typeof (t7Value as { other?: unknown }).other === "string"
      ? (t7Value as { other: string }).other
      : ""
  const t8Code = typeof t8Value === "string" ? t8Value : null

  return (
    <details className="bp-more-detail max-w-[900px]" open={Boolean(t7Code || t8Code)}>
      <summary>{ADD_MORE_DETAIL}</summary>
      <div className="flex flex-col gap-8">
        {showT7 ? <ReasonForm savedCode={t7Code} savedOther={t7Other} /> : null}
        <FrequencyForm savedCode={t8Code} />
      </div>
    </details>
  )
}

function ReasonForm({ savedCode, savedOther }: { savedCode: string | null; savedOther: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveAnswer)
  const [value, setValue] = useState<string | null>(savedCode)
  const [other, setOther] = useState(savedOther)
  const t7 = QUESTION_BY_KEY.T7

  return (
    <form {...formProps} className="flex flex-col gap-4" data-saved-t7={savedCode ?? ""}>
      <input type="hidden" name="questionKey" value="T7" />
      {value ? <input type="hidden" name="value" value={JSON.stringify({ code: value, other: value === "other" ? other.trim() || null : null })} /> : null}
      <div id="q-T7">
        <RadioGroup
          id="t7"
          label={t7.label}
          name="t7-display"
          options={[...T7_OPTIONS]}
          value={value}
          optional
          error={error}
          followUp={{
            other: (
              <TextField
                label="Other reason"
                name="t7Other-display"
                defaultValue={savedOther}
                maxLength={OTHER_TEXT_MAX}
                error={error === T7_OTHER_MESSAGE ? error : null}
                onChange={(event) => setOther(event.currentTarget.value)}
              />
            ),
          }}
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

function FrequencyForm({ savedCode }: { savedCode: string | null }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveAnswer)
  const [value, setValue] = useState<string | null>(savedCode)
  const t8 = QUESTION_BY_KEY.T8

  return (
    <form {...formProps} className="flex flex-col gap-4" data-saved-t8={savedCode ?? ""}>
      <input type="hidden" name="questionKey" value="T8" />
      {value ? <input type="hidden" name="value" value={value} /> : null}
      <div id="q-T8">
        <RadioGroup
          id="t8"
          label={t8.label}
          name="t8-display"
          options={[...T8_OPTIONS]}
          value={value}
          help={T8_FIELD_HELP}
          optional
          error={error}
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

function TeamGlance({
  team,
  trainers,
  goals,
}: {
  team: AnswerTeamToday
  trainers: readonly string[] | null
  goals: readonly string[]
}) {
  if (!isConfirmedCount(team.currentDjCount, team.countBasis)) return null
  const copy = m2Copy({
    currentDjCount: team.currentDjCount,
    leadCapableCount: team.leadCapableCount,
    assistantOnlyCount: team.assistantOnlyCount,
    ownerDjFrequency: team.ownerDjFrequency,
    desiredDjCount: isConfirmedCount(team.desiredDjCount, team.desiredCountBasis) ? team.desiredDjCount : null,
    trainers,
    goals,
  })

  return (
    <section
      role="region"
      aria-labelledby="m2-title"
      className="bp-card max-w-[900px] max-[760px]:p-[22px]!"
      data-m2="true"
    >
      <h2 id="m2-title" className="bp-card__title">
        Your team at a glance
      </h2>
      {copy.sentences.map((sentence) => (
        <p key={sentence} className="m-0 text-ink-2">
          {sentence}
        </p>
      ))}
      {copy.headsUp ? <p className="m-0 text-ink-2">{copy.headsUp}</p> : null}
    </section>
  )
}

export function TeamTodayGuidedForm({
  team,
  resolved,
  answers,
  goals,
  sectionComplete,
}: {
  team: AnswerTeamToday | null
  resolved: readonly ResolvedAnswer[]
  answers: readonly { questionKey: string; state: string; value: unknown }[]
  goals: readonly string[]
  sectionComplete: boolean
}) {
  const showEarlierNote = hasStoredTeamCount(team) && !sectionComplete
  const showT7 =
    Boolean(team) &&
    isConfirmedCount(team?.currentDjCount ?? null, team?.countBasis ?? "unknown") &&
    isConfirmedCount(team?.desiredDjCount ?? null, team?.desiredCountBasis ?? "unknown") &&
    (team?.desiredDjCount ?? 0) > (team?.currentDjCount ?? 0)

  return (
    <div className="flex flex-col gap-5">
      {showEarlierNote ? (
        <p className="m-0 max-w-[900px] rounded-bp-lg bg-sky p-4 text-base text-ink-2">
          <strong>{TEAM_EARLIER_SAVED_NOTE.split(". ")[0]}.</strong> {TEAM_EARLIER_SAVED_NOTE.split(". ").slice(1).join(". ")}
        </p>
      ) : null}
      <TodayCard team={team} resolved={resolved} />
      <RunsCard resolved={resolved} />
      <WantedCard team={team} resolved={resolved} />
      <DetailCard resolved={resolved} showT7={showT7} />
      {team ? (
        <TeamGlance team={team} trainers={t4CodesFromAnswers(answers)} goals={goals} />
      ) : null}
    </div>
  )
}
