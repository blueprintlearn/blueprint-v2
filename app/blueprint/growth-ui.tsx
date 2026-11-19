import Link from "next/link"

import { AnswerStateNote, Card, StatusTag } from "@/components/blueprint"
import type { FindingsGate } from "@/lib/blueprint/findings"
import {
  GROWTH_KIND_LABELS,
  GROWTH_NEEDS_APPROVAL,
  GROWTH_NOT_A_PLAN,
  GROWTH_OPENING,
  GROWTH_PAGE_TITLE,
  GROWTH_REVIEW_CTA,
  GROWTH_STALE,
  type GrowthPlanningView,
} from "@/lib/blueprint/growth"
import type { Calculation } from "@/lib/blueprint/staffing-engine"
import { GrowthInputsForm, GrowthResponseForm } from "../growth-planning-form"

const GATE_TAG: Record<FindingsGate, { status: "proven" | "progress" | "planned"; label: string }> = {
  current: { status: "proven", label: "Current" },
  stale: { status: "progress", label: "Needs a new approval" },
  needs_approval: { status: "planned", label: "Not approved yet" },
}

function formatPct(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value * 100))}%`
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
  const empty = result.status === "unavailable"
  return (
    <div className="bp-fact" data-growth-calc={id} data-growth-status={result.status}>
      <span className="bp-fact__label">{label}</span>
      <span className={`bp-fact__value${empty ? " is-empty" : ""}`}>{empty ? "Not available yet" : display}</span>
      {result.status === "calculated" ? <StatusTag status="proven" label="Calculated" /> : null}
      {result.status === "estimated" ? <AnswerStateNote state="estimated" /> : null}
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
    <Card as="section" aria-labelledby="growth-gate-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="growth-gate-title" className="bp-card__title">
        {gate === "stale" ? "This is no longer the approved version" : "Approve your Blueprint first"}
      </h2>
      <p className="bp-card__body">{gate === "stale" ? GROWTH_STALE : GROWTH_NEEDS_APPROVAL}</p>
      <Link href="/blueprint/review" className="bp-btn bp-btn--primary self-start">
        {GROWTH_REVIEW_CTA}
      </Link>
    </Card>
  )
}

export function GrowthPlanningView({
  companyName,
  view,
}: {
  companyName: string
  view: GrowthPlanningView
}) {
  const tag = GATE_TAG[view.gate]
  const analysis = view.analysis
  const rec = analysis?.recommendation
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-growth-gate={view.gate}>
        <Link href="/blueprint" className="bp-link self-start font-bold">
          Back to your Blueprint
        </Link>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{GROWTH_PAGE_TITLE}</h1>
          <StatusTag status={tag.status} label={tag.label} />
        </div>
        {view.gate === "current" ? <p className="bp-type-lead max-w-[620px] text-ink-2">{GROWTH_OPENING}</p> : null}
      </section>
      {view.gate !== "current" ? <GateCard gate={view.gate} /> : null}
      {view.gate === "current" && analysis ? (
        <>
          <Card as="section" aria-labelledby="growth-followup-title" className="max-w-[900px] max-[760px]:p-[22px]!">
            <h2 id="growth-followup-title" className="bp-card__title">
              Planning questions
            </h2>
            <p className="bp-card__body">
              Stage 1 did not ask these. Answers here are not part of the approved snapshot, and they do not replace current or historical event volume.
            </p>
            <GrowthInputsForm inputs={view.inputs} />
          </Card>
          <Card as="section" aria-labelledby="growth-eval-title" className="max-w-[900px] max-[760px]:p-[22px]!">
            <h2 id="growth-eval-title" className="bp-card__title">
              What the numbers show
            </h2>
            <div className="grid gap-4">
              <p className="m-0 text-[14px] text-muted">{analysis.areas.staffing}</p>
              <p className="m-0 text-[14px] text-muted">{analysis.areas.demand}</p>
              <p className="m-0 text-[14px] text-muted">{analysis.areas.revenue}</p>
              <p className="m-0 text-[14px] text-muted">{analysis.areas.training}</p>
              <ResultRow
                id="historical-utilization"
                label="Historical utilization (planning proxy)"
                result={analysis.historicalUtilization}
                display={
                  analysis.historicalUtilization.value === null
                    ? null
                    : formatPct(analysis.historicalUtilization.value)
                }
              />
              <ResultRow
                id="target-utilization"
                label="Target utilization"
                result={analysis.targetUtilization}
                display={analysis.targetUtilization.value === null ? null : formatPct(analysis.targetUtilization.value)}
              />
            </div>
          </Card>
          <Card as="section" aria-labelledby="growth-rec-title" className="max-w-[900px] max-[760px]:p-[22px]!">
            <h2 id="growth-rec-title" className="bp-card__title">
              Recommended next step
            </h2>
            <div
              className="grid gap-3"
              data-growth-rec={rec?.value ?? "unavailable"}
              data-growth-rec-status={rec?.status ?? "unavailable"}
            >
              <p className="m-0 font-bold text-ink">
                {rec?.value ? GROWTH_KIND_LABELS[rec.value] : "Not available yet"}
              </p>
              {rec?.status === "estimated" ? <AnswerStateNote state="estimated" /> : null}
              <p className="m-0 text-[14px] text-muted">{rec?.explanation}</p>
              {rec?.evidence.map((item) => (
                <p key={item} className="m-0 text-[14px] text-muted">
                  {item}
                </p>
              ))}
              {rec?.hireProfileNote ? <p className="m-0 text-[14px] text-muted">{rec.hireProfileNote}</p> : null}
              {rec?.assumptions.map((item) => (
                <p key={item} className="m-0 text-[14px] text-muted">
                  {item}
                </p>
              ))}
            </div>
            {analysis.conflicts.map((conflict) => (
              <div key={conflict.title} className="mt-4 grid gap-2" data-growth-warning="">
                <p className="m-0 font-bold text-ink">{conflict.title}</p>
                <p className="m-0 text-[14px] text-muted">{conflict.explanation}</p>
              </div>
            ))}
            {rec?.value ? (
              <>
                <p className="bp-card__body">{GROWTH_NOT_A_PLAN}</p>
                {view.response ? (
                  <p className="m-0 text-[14px] text-muted" data-growth-owner-response={view.response.status}>
                    You {view.response.status === "accepted" ? "accepted" : view.response.status === "modified" ? "modified" : "rejected"} this
                    {view.response.status === "modified" && view.response.selectedKind
                      ? ` to ${GROWTH_KIND_LABELS[view.response.selectedKind]}`
                      : ""}
                    . Saved goals were not changed.
                  </p>
                ) : null}
                <GrowthResponseForm response={view.response} recommendedKind={rec.value} />
              </>
            ) : null}
          </Card>
          <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
            <Link href="/blueprint/staffing" className="bp-btn bp-btn--plain">
              Previous: Staffing and demand
            </Link>
            <Link href="/blueprint/growth-plan" id="blueprint-next" className="bp-btn bp-btn--soft">
              Next: Growth plan
            </Link>
          </div>
        </>
      ) : null}
    </>
  )
}
