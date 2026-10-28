import type { ReactNode } from "react"

import { Card, Fact, StatusTag } from "@/components/blueprint"
import { OWNER_GOAL_LABELS, type OwnerGoalCode } from "@/lib/blueprint/goals"
import { systemRoleLabel } from "@/lib/rules/system-role"

const OWNER_LEAD = "Start your Company Blueprint. These answers shape what Blueprint recommends."
const VIEWER_LEAD = "Here’s what your company has shared so far."

export function OwnerHomeHero({
  companyName,
  role,
  isOwner,
}: {
  companyName: string
  role: string
  isOwner: boolean
}) {
  const roleLabel = systemRoleLabel(role)
  return (
    <section className="flex flex-col gap-3 pt-7 md:pt-12">
      <p className="bp-type-small font-bold text-muted">{companyName}</p>
      <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">Welcome back.</h1>
      <p className="bp-type-lead max-w-[620px] text-ink-2">{isOwner ? OWNER_LEAD : VIEWER_LEAD}</p>
      {roleLabel ? <p className="bp-type-small text-muted">Signed in as {roleLabel}</p> : null}
    </section>
  )
}

function OwnerOnlyNote() {
  return <p className="m-0 text-[14px] text-muted">Only the company owner can change these.</p>
}

function CardHead({ id, title, status }: { id: string; title: string; status: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="bp-card__title">
        {title}
      </h2>
      {status}
    </div>
  )
}

const cardClass = "max-[760px]:p-[22px]"

/** Derived only from saved values. 0 counts as answered; only NULL is unanswered. */
export function TeamTodayCard({
  currentDjCount,
  desiredDjCount,
  editor,
}: {
  currentDjCount: number | null
  desiredDjCount: number | null
  editor?: ReactNode
}) {
  const saved = [currentDjCount, desiredDjCount].filter((value) => value !== null).length
  const status =
    saved === 0 ? (
      <StatusTag status="planned" label="Not answered yet" />
    ) : saved === 1 ? (
      <StatusTag status="progress" label="Partly answered" />
    ) : (
      <StatusTag status="proven" label="Answered" />
    )

  return (
    <Card as="section" aria-labelledby="team-today-title" className={cardClass}>
      <CardHead id="team-today-title" title="Team today" status={status} />
      {editor ? (
        <>
          <p className="bp-card__body">
            Blueprint will use these to recommend whether recruiting makes sense for you.
          </p>
          {editor}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5">
            <Fact label="Current DJ count" value={currentDjCount} />
            <Fact label="Desired DJ count" value={desiredDjCount} />
          </div>
          <OwnerOnlyNote />
        </>
      )}
    </Card>
  )
}

function goalFactValue(goal: OwnerGoalCode | null, goalOther: string | null): string | null {
  if (goal === null) return null
  if (goal === "other") return goalOther?.trim() ? goalOther : OWNER_GOAL_LABELS.other
  return OWNER_GOAL_LABELS[goal]
}

export function OwnerGoalCard({
  goal,
  goalOther,
  editor,
  isOwner,
}: {
  goal: OwnerGoalCode | null
  goalOther: string | null
  editor?: ReactNode
  isOwner: boolean
}) {
  return (
    <Card as="section" aria-labelledby="owner-goal-title" className={cardClass}>
      <CardHead
        id="owner-goal-title"
        title={isOwner ? "Your goal" : "Company goal"}
        status={
          goal === null ? (
            <StatusTag status="planned" label="Not answered yet" />
          ) : (
            <StatusTag status="proven" label="Answered" />
          )
        }
      />
      {editor ?? (
        <>
          <Fact label="Goal" value={goalFactValue(goal, goalOther)} emptyText="No goal chosen yet" />
          <OwnerOnlyNote />
        </>
      )}
    </Card>
  )
}
