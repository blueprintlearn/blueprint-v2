import Link from "next/link"

import { AnswerStateNote, Card, StatusTag } from "@/components/blueprint"
import type { FindingsGate } from "@/lib/blueprint/findings"
import { formatUsd } from "@/lib/blueprint/numbers"
import {
  STAFFING_NEEDS_APPROVAL,
  STAFFING_NOT_COLLECTED,
  STAFFING_NUMBERS_PRIVACY,
  STAFFING_OPENING,
  STAFFING_PAGE_TITLE,
  STAFFING_REVIEW_CTA,
  STAFFING_STALE,
  calculationKind,
  ownerInvolvementLabel,
  type Calculation,
  type StaffingAnalysisView,
} from "@/lib/blueprint/staffing"

const GATE_TAG: Record<FindingsGate, { status: "proven" | "progress" | "planned"; label: string }> = {
  current: { status: "proven", label: "Current" },
  stale: { status: "progress", label: "Needs a new approval" },
  needs_approval: { status: "planned", label: "Not approved yet" },
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)
}

function ResultRow({
  id,
  label,
  result,
  display,
}: {
  id: string
  label: string
  result: Calculation<unknown>
  display: string | null
}) {
  const kind = calculationKind(result)
  const empty = kind === "missing"
  return (
    <div className="bp-fact" data-staffing-calc={id} data-staffing-status={result.status}>
      <span className="bp-fact__label">{label}</span>
      <span className={`bp-fact__value${empty ? " is-empty" : ""}`}>
        {empty ? "Not available yet" : display}
      </span>
      {kind === "confirmed" ? (
        <StatusTag status="proven" label={result.formula ? "Calculated" : "Confirmed"} />
      ) : null}
      {kind === "estimated" ? <AnswerStateNote state="estimated" /> : null}
      <p className="m-0 text-[14px] text-muted">{result.explanation}</p>
      {result.formula ? <p className="m-0 text-[14px] text-muted">{result.formula}</p> : null}
      {result.assumptions.map((assumption) => (
        <p key={assumption} className="m-0 text-[14px] text-muted">
          {assumption}
        </p>
      ))}
    </div>
  )
}

function GateCard({ gate }: { gate: Exclude<FindingsGate, "current"> }) {
  return (
    <Card as="section" aria-labelledby="staffing-gate-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="staffing-gate-title" className="bp-card__title">
        {gate === "stale" ? "This is no longer the approved version" : "Approve your Blueprint first"}
      </h2>
      <p className="bp-card__body">{gate === "stale" ? STAFFING_STALE : STAFFING_NEEDS_APPROVAL}</p>
      <Link href="/blueprint/review" className="bp-btn bp-btn--primary self-start">
        {STAFFING_REVIEW_CTA}
      </Link>
    </Card>
  )
}

function MissingCard() {
  return (
    <Card as="section" aria-labelledby="staffing-missing-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="staffing-missing-title" className="bp-card__title">
        Missing information
      </h2>
      <p className="bp-card__body">
        Stage 1 did not ask about these. They are listed so Blueprint does not invent a number to fill the gap.
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {STAFFING_NOT_COLLECTED.map((item) => (
          <li key={item.title}>
            <p className="m-0 font-bold text-ink">{item.title}</p>
            <p className="m-0 text-[14px] text-muted">{item.note}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function AnalysisCards({
  analysis,
  baselineNote,
  averageSaleNote,
}: {
  analysis: NonNullable<StaffingAnalysisView["analysis"]>
  baselineNote: string | null
  averageSaleNote: string | null
}) {
  const owner = analysis.currentStaffing.ownerInvolvement
  const volume = analysis.currentStaffing.annualEventVolume
  const revenue = analysis.potentialAdditionalGrossRevenue
  return (
    <>
      <Card as="section" aria-labelledby="staffing-current-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="staffing-current-title" className="bp-card__title">
          Current staffing
        </h2>
        <p className="bp-card__body">Who you have today, who can lead, and how busy the year is. Assistants are not treated as independent lead DJs.</p>
        <div className="grid gap-4">
          <ResultRow
            id="team-djs"
            label="DJs (not counting you)"
            result={analysis.currentStaffing.teamDjCount}
            display={analysis.currentStaffing.teamDjCount.value === null ? null : formatNumber(analysis.currentStaffing.teamDjCount.value)}
          />
          <ResultRow
            id="leads"
            label="DJs who can lead"
            result={analysis.currentStaffing.leadCapableCount}
            display={
              analysis.currentStaffing.leadCapableCount.value === null
                ? null
                : formatNumber(analysis.currentStaffing.leadCapableCount.value)
            }
          />
          <ResultRow
            id="assistants"
            label="Assistants only"
            result={analysis.currentStaffing.assistantOnlyCount}
            display={
              analysis.currentStaffing.assistantOnlyCount.value === null
                ? null
                : formatNumber(analysis.currentStaffing.assistantOnlyCount.value)
            }
          />
          <ResultRow
            id="independent-leads"
            label="Independent lead DJs"
            result={analysis.currentStaffing.independentLeadCount}
            display={
              analysis.currentStaffing.independentLeadCount.value === null
                ? null
                : formatNumber(analysis.currentStaffing.independentLeadCount.value)
            }
          />
          <ResultRow
            id="volume"
            label="Events a year"
            result={volume}
            display={volume.value === null ? null : formatNumber(volume.value)}
          />
          <ResultRow
            id="owner"
            label="You DJ events"
            result={owner}
            display={owner.value ? ownerInvolvementLabel(owner.value) : null}
          />
        </div>
      </Card>
      <Card as="section" aria-labelledby="staffing-capacity-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="staffing-capacity-title" className="bp-card__title">
          Staffing capacity
        </h2>
        <p className="bp-card__body">Annual event capacity is the sum of each lead DJ’s available events. Blueprint does not fill in a default workload.</p>
        <div className="grid gap-4">
          <ResultRow
            id="capacity"
            label="Available annual capacity"
            result={analysis.availableAnnualCapacity}
            display={
              analysis.availableAnnualCapacity.value === null
                ? null
                : formatNumber(analysis.availableAnnualCapacity.value)
            }
          />
          <ResultRow
            id="capacity-gap"
            label="Capacity gap"
            result={analysis.capacityGap}
            display={analysis.capacityGap.value === null ? null : formatNumber(analysis.capacityGap.value)}
          />
        </div>
      </Card>
      <Card as="section" aria-labelledby="staffing-demand-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="staffing-demand-title" className="bp-card__title">
          Booking demand
        </h2>
        <p className="bp-card__body">{baselineNote}</p>
        <div className="grid gap-4">
          <ResultRow
            id="additional-bookings"
            label="Additional bookings needed"
            result={analysis.additionalBookingsNeeded}
            display={
              analysis.additionalBookingsNeeded.value === null
                ? null
                : formatNumber(analysis.additionalBookingsNeeded.value)
            }
          />
        </div>
      </Card>
      <Card as="section" aria-labelledby="staffing-leads-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="staffing-leads-title" className="bp-card__title">
          Lead requirements
        </h2>
        <p className="bp-card__body">Qualified leads are only calculated when additional bookings and a closing rate are both known.</p>
        <div className="grid gap-4">
          <ResultRow
            id="leads-annual"
            label="Additional qualified leads a year"
            result={analysis.additionalQualifiedLeadsAnnually}
            display={
              analysis.additionalQualifiedLeadsAnnually.value === null
                ? null
                : formatNumber(analysis.additionalQualifiedLeadsAnnually.value)
            }
          />
          <ResultRow
            id="leads-monthly"
            label="Additional qualified leads a month"
            result={analysis.additionalQualifiedLeadsMonthly}
            display={
              analysis.additionalQualifiedLeadsMonthly.value === null
                ? null
                : formatNumber(analysis.additionalQualifiedLeadsMonthly.value)
            }
          />
        </div>
      </Card>
      <Card as="section" aria-labelledby="staffing-revenue-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="staffing-revenue-title" className="bp-card__title">
          Revenue opportunity
        </h2>
        <p className="bp-card__body">{STAFFING_NUMBERS_PRIVACY}</p>
        {averageSaleNote ? <p className="m-0 text-[14px] text-muted">{averageSaleNote}</p> : null}
        <div className="grid gap-4">
          <ResultRow
            id="revenue"
            label="Potential additional gross revenue"
            result={revenue}
            display={revenue.value === null ? null : formatUsd(revenue.value)}
          />
        </div>
      </Card>
      <MissingCard />
    </>
  )
}

export function StaffingDemandView({
  companyName,
  view,
}: {
  companyName: string
  view: StaffingAnalysisView
}) {
  const tag = GATE_TAG[view.gate]
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-staffing-gate={view.gate}>
        <Link href="/blueprint" className="bp-link self-start font-bold">
          Back to your Blueprint
        </Link>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{STAFFING_PAGE_TITLE}</h1>
          <StatusTag status={tag.status} label={tag.label} />
        </div>
        {view.gate === "current" ? <p className="bp-type-lead max-w-[620px] text-ink-2">{STAFFING_OPENING}</p> : null}
      </section>
      {view.gate === "current" && view.analysis ? (
        <>
          <AnalysisCards
            analysis={view.analysis}
            baselineNote={view.baselineNote}
            averageSaleNote={view.averageSaleNote}
          />
          <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
            <Link href="/blueprint/findings" className="bp-btn bp-btn--plain">
              Previous: Business findings
            </Link>
            <Link href="/blueprint/growth" id="blueprint-next" className="bp-btn bp-btn--soft">
              Next: Growth planning
            </Link>
          </div>
        </>
      ) : view.gate !== "current" ? (
        <GateCard gate={view.gate} />
      ) : null}
    </>
  )
}
