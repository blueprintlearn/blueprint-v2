"use client"

import { useState } from "react"

import {
  AnswerStateNote,
  Button,
  Card,
  NotSure,
  RadioGroup,
  SaveStatus,
} from "@/components/blueprint"
import { saveReviewApprovalCard, skipQuestion } from "@/lib/blueprint/actions"
import type { ResolvedAnswer } from "@/lib/blueprint/answers"
import { ALREADY_ANSWERED_MESSAGE, QUESTION_BY_KEY } from "@/lib/blueprint/questions"
import {
  APPROVAL_OPTIONS,
  FUTURE_AREAS,
  FUTURE_DIRECTION_INTRO,
  FUTURE_DIRECTION_LATER,
  FUTURE_DIRECTION_NOW,
  approvalFromUnknown,
  skippedReviewNote,
  type SnapshotGroup,
} from "@/lib/blueprint/review"

import { useSaveForm } from "./use-save-form"

function stateOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.state ?? "unanswered"
}

function valueOf(resolved: readonly ResolvedAnswer[], key: string) {
  return resolved.find((row) => row.key === key)?.value ?? null
}

function SnapshotCard({ group }: { group: SnapshotGroup }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0" aria-labelledby={`snapshot-${group.slug}-title`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 id={`snapshot-${group.slug}-title`} className="m-0 text-[18px] font-bold text-ink">
          {group.name}
        </h3>
        <a href={group.href} className="bp-link text-[14px] font-bold">
          Edit
          <span className="bp-sr"> {group.name}</span>
        </a>
      </div>
      {group.privacyNote ? <p className="m-0 text-[14px] text-muted">{group.privacyNote}</p> : null}
      <dl className="m-0 grid gap-3">
        {group.rows.map((row) => (
          <div key={row.key} className="bp-fact" data-snapshot-key={row.key} data-snapshot-state={row.state}>
            <dt className="bp-fact__label">{row.label}</dt>
            <dd className={`bp-fact__value m-0 ${row.state === "unanswered" || row.state === "skipped" || row.state === "not_applicable" ? "is-empty" : ""}`}>
              {row.display}
            </dd>
            {row.isEstimate ? <AnswerStateNote state="estimated" /> : null}
            {row.state === "skipped" ? <AnswerStateNote state="skipped" text={skippedReviewNote()} /> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}

function SnapshotCardList({ groups }: { groups: SnapshotGroup[] }) {
  return (
    <Card as="section" aria-labelledby="review-snapshot-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="review-snapshot-title" className="bp-card__title">
        Your business snapshot
      </h2>
      <p className="bp-card__body">
        This is what you have already told Blueprint. Missing answers stay blank. Nothing here was invented.
      </p>
      <div className="flex flex-col gap-1">
        {groups.map((group) => (
          <SnapshotCard key={group.slug} group={group} />
        ))}
      </div>
    </Card>
  )
}

function DirectionCard() {
  return (
    <Card as="section" aria-labelledby="review-direction-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="review-direction-title" className="bp-card__title">
        Your next direction
      </h2>
      <p className="bp-card__body">{FUTURE_DIRECTION_INTRO}</p>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {FUTURE_AREAS.map((area) => (
          <li key={area.title}>
            <p className="m-0 font-bold text-ink">{area.title}</p>
            <p className="m-0 text-ink-2">{area.body}</p>
          </li>
        ))}
      </ul>
      <p className="bp-card__body">{FUTURE_DIRECTION_NOW}</p>
      <p className="bp-card__body">{FUTURE_DIRECTION_LATER}</p>
    </Card>
  )
}

function ApprovalCard({ resolved }: { resolved: readonly ResolvedAnswer[] }) {
  const { error, pending, saveState, formProps } = useSaveForm(saveReviewApprovalCard)
  const saved = approvalFromUnknown(valueOf(resolved, "R1"))
  const [value, setValue] = useState<string | null>(saved?.code ?? null)
  const r1 = QUESTION_BY_KEY.R1
  const skipped = stateOf(resolved, "R1") === "skipped"
  const canSkip = stateOf(resolved, "R1") === "unanswered"
  const [justSkipped, setJustSkipped] = useState(false)
  const [skipError, setSkipError] = useState<string | null>(null)
  const showSkipped = skipped || justSkipped

  async function handleSkip() {
    const result = await skipQuestion("R1")
    if (result.error) {
      setSkipError(result.error)
      return
    }
    setJustSkipped(true)
  }

  return (
    <Card as="section" aria-labelledby="review-approve-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <form
        {...formProps}
        className="flex flex-col gap-5"
        data-card="approve"
        data-saved-r1={saved?.code ?? ""}
      >
        <h2 id="review-approve-title" className="bp-card__title">
          Review and approve
        </h2>
        <div id="q-R1">
          <RadioGroup
            label={r1.label}
            name="r1"
            options={[...APPROVAL_OPTIONS]}
            value={value}
            help="This records the snapshot as your current Blueprint. You can still edit answers later."
            error={error}
            onChange={setValue}
          />
          {showSkipped ? <AnswerStateNote state="skipped" text={skippedReviewNote()} /> : null}
          <NotSure
            question={r1.label}
            why={r1.guidance?.why}
            examples={r1.guidance?.examples}
            canSkip={canSkip && !showSkipped}
            onSkip={handleSkip}
          />
          {skipError === ALREADY_ANSWERED_MESSAGE ? (
            <p className="bp-field__error" role="alert">
              {skipError}
            </p>
          ) : null}
        </div>
        <div className="bp-form-row">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            Save your approval
          </Button>
          <SaveStatus state={saveState} />
        </div>
      </form>
    </Card>
  )
}

export function ReviewGuidedForm({
  resolved,
  groups,
}: {
  resolved: readonly ResolvedAnswer[]
  groups: SnapshotGroup[]
}) {
  return (
    <>
      <SnapshotCardList groups={groups} />
      <DirectionCard />
      <ApprovalCard resolved={resolved} />
    </>
  )
}
