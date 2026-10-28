import type { ReactNode } from "react"

import { Card, Chip } from "@/components/blueprint"

/** NULL means "never saved" and must stay distinct from a saved 0. */
export function formatCount(value: number | null): string {
  return value === null ? "Not set" : String(value)
}

export function OwnerHomeHeader({
  companyName,
  role,
  actions,
}: {
  companyName: string
  role: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-8 md:gap-12">
      <div className="flex items-center justify-between gap-4">
        <p className="bp-type-wordmark">Blueprint</p>
        {actions}
      </div>
      <div className="flex flex-col gap-4">
        <p className="bp-type-small text-muted">
          Company: <strong className="text-ink">{companyName}</strong>
        </p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">Welcome back.</h1>
        <p className="bp-type-lead max-w-[620px] text-ink-2">Here’s where your team stands today.</p>
        <Chip>
          Role: <strong>{role}</strong>
        </Chip>
      </div>
    </header>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-col gap-1 rounded-bp-lg bg-surface-soft px-4 py-3">
      <span className="bp-type-small text-muted">{label}</span>{" "}
      <strong className="bp-type-heading-l">{value}</strong>
    </p>
  )
}

function OwnerOnlyNote() {
  return <p className="bp-card__body">Only the company owner can change these.</p>
}

export function TeamTodayCard({
  currentDjCount,
  desiredDjCount,
  editor,
}: {
  currentDjCount: number | null
  desiredDjCount: number | null
  editor?: ReactNode
}) {
  return (
    <Card as="section">
      <h2 className="bp-card__title">Team today</h2>
      <div className="grid grid-cols-2 gap-3">
        <Fact label="DJs today:" value={formatCount(currentDjCount)} />
        <Fact label="Desired DJs:" value={formatCount(desiredDjCount)} />
      </div>
      {editor ?? <OwnerOnlyNote />}
    </Card>
  )
}

export function OwnerGoalCard({
  goalLabel,
  goalOther,
  editor,
}: {
  goalLabel: string
  goalOther: string | null
  editor?: ReactNode
}) {
  return (
    <Card as="section">
      <h2 className="bp-card__title">Your goal</h2>
      <p className="bp-card__body">
        Owner goal: <strong className="text-ink">{goalLabel}</strong>
        {goalOther ? ` (${goalOther})` : null}
      </p>
      {editor ?? <OwnerOnlyNote />}
    </Card>
  )
}
