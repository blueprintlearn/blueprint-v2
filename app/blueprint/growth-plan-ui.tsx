import Link from "next/link"

import { AnswerStateNote, Card, StatusTag } from "@/components/blueprint"
import {
  GROWTH_KIND_LABELS,
  GROWTH_PLAN_APPROVED,
  GROWTH_PLAN_NEEDS_APPROVAL,
  GROWTH_PLAN_NEEDS_REVIEW,
  GROWTH_PLAN_OPENING,
  GROWTH_PLAN_PAGE_TITLE,
  GROWTH_PLAN_REVIEW_CTA,
  GROWTH_PLAN_STALE,
  type GrowthPlanView,
  type StoredGrowthPlan,
} from "@/lib/blueprint/growth-plan"
import { applyOwnerDecisions, HIRE_PROFILE_LABELS } from "@/lib/blueprint/growth-plan-engine"
import { GrowthPlanApproveForm, GrowthPlanDraftForm, GrowthPlanReviseForm } from "../growth-plan-form"
import type { FindingsGate } from "@/lib/blueprint/findings"

const GATE_TAG: Record<FindingsGate, { status: "proven" | "progress" | "planned"; label: string }> = {
  current: { status: "proven", label: "Current" },
  stale: { status: "progress", label: "Needs a new approval" },
  needs_approval: { status: "planned", label: "Not approved yet" },
}

const PLAN_TAG: Record<GrowthPlanView["planStatus"], { status: "proven" | "progress" | "planned"; label: string }> = {
  approved: { status: "proven", label: "Approved" },
  needs_review: { status: "progress", label: "Needs review" },
  draft: { status: "progress", label: "Draft" },
  none: { status: "planned", label: "Not approved" },
}

function GateCard({ gate }: { gate: Exclude<FindingsGate, "current"> }) {
  return (
    <Card as="section" aria-labelledby="growth-plan-gate-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="growth-plan-gate-title" className="bp-card__title">
        {gate === "stale" ? "This is no longer the approved version" : "Approve your Blueprint first"}
      </h2>
      <p className="bp-card__body">{gate === "stale" ? GROWTH_PLAN_STALE : GROWTH_PLAN_NEEDS_APPROVAL}</p>
      <Link href="/blueprint/review" className="bp-btn bp-btn--primary self-start">
        {GROWTH_PLAN_REVIEW_CTA}
      </Link>
    </Card>
  )
}

function FrozenPlan({
  title,
  plan,
}: {
  title: string
  plan: StoredGrowthPlan
}) {
  const recommendedHiring = plan.recommended.hiring.recommendedTarget
  const approved = applyOwnerDecisions(plan.recommended, plan.decisions, [])
  return (
    <Card as="section" aria-labelledby="growth-plan-previous-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="growth-plan-previous-title" className="bp-card__title">
        {title}
      </h2>
      <p className="bp-card__body">
        Version {plan.version}
        {plan.approvedAt ? `, approved ${new Date(plan.approvedAt).toLocaleString("en-US")}` : ""}. These decisions were
        not changed.
      </p>
      <div className="grid gap-3" data-growth-plan-previous={plan.version}>
        <p className="m-0 font-bold text-ink">{plan.recommended.summary.primaryObstacle.label}</p>
        <p className="m-0 text-[14px] text-muted">
          Recommended hiring target:{" "}
          {recommendedHiring.value === null ? "Not available" : `${recommendedHiring.value} additional DJs`}
        </p>
        <p className="m-0 text-[14px] text-muted">
          Approved hiring target:{" "}
          {approved.hiringTarget.value === null ? "Not available" : `${approved.hiringTarget.value} additional DJs`}
        </p>
        <p className="m-0 text-[14px] text-muted">
          Approved hire profile:{" "}
          {approved.hireProfile ? HIRE_PROFILE_LABELS[approved.hireProfile] : "Not available"}
        </p>
        <p className="m-0 text-[14px] text-muted">
          Approved recruiting direction:{" "}
          {approved.recruitingKind ? GROWTH_KIND_LABELS[approved.recruitingKind] : "Not available"}
        </p>
        {plan.decisions.stance === "modify" ? (
          <p className="m-0 text-[14px] text-muted">You had modified this plan. Saved goals were not changed.</p>
        ) : null}
      </div>
    </Card>
  )
}

function PlanBody({ view, readOnly }: { view: GrowthPlanView; readOnly: boolean }) {
  const proposed = view.proposed
  const effective = view.effective
  if (!proposed || !effective) return null
  const hiring = effective.hiringTarget
  const obstacle = proposed.summary.primaryObstacle
  const ownerSetHiring =
    view.decisions.stance === "modify" &&
    view.decisions.hiringTarget !== null &&
    view.decisions.hiringTarget !== proposed.hiring.recommendedTarget.value
  return (
    <>
      <Card as="section" aria-labelledby="growth-plan-summary-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="growth-plan-summary-title" className="bp-card__title">
          Business summary
        </h2>
        <div className="grid gap-3">
          <p className="m-0 text-[14px] text-muted">{proposed.summary.staffing}</p>
          <p className="m-0 text-[14px] text-muted">{proposed.summary.demand}</p>
          <p className="m-0 text-[14px] text-muted">{proposed.summary.training}</p>
          <div className="bp-fact" data-growth-plan-obstacle={obstacle.kind ?? "unavailable"}>
            <span className="bp-fact__label">Primary obstacle to growth</span>
            <span className={`bp-fact__value${obstacle.kind ? "" : " is-empty"}`}>{obstacle.label}</span>
            {obstacle.status === "estimated" ? <AnswerStateNote state="estimated" /> : null}
            <p className="m-0 text-[14px] text-muted">{obstacle.explanation}</p>
          </div>
        </div>
      </Card>
      <Card as="section" aria-labelledby="growth-plan-hiring-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="growth-plan-hiring-title" className="bp-card__title">
          Hiring recommendation
        </h2>
        <div
          className="grid gap-3"
          data-growth-plan-hiring={hiring.value === null ? "unavailable" : String(hiring.value)}
          data-growth-plan-hiring-status={hiring.status}
          data-growth-plan-hiring-source={ownerSetHiring ? "owner" : "recommended"}
          data-growth-plan-profile={effective.hireProfile ?? "unavailable"}
        >
          <div className="bp-fact">
            <span className="bp-fact__label">Hiring target</span>
            <span className={`bp-fact__value${hiring.value === null ? " is-empty" : ""}`}>
              {hiring.value === null ? "Not available yet" : `${hiring.value} additional DJs`}
            </span>
            {hiring.status === "estimated" && !ownerSetHiring ? <AnswerStateNote state="estimated" /> : null}
          </div>
          <div className="bp-fact">
            <span className="bp-fact__label">Beginner or experienced</span>
            <span className={`bp-fact__value${effective.hireProfile ? "" : " is-empty"}`}>
              {effective.hireProfile ? HIRE_PROFILE_LABELS[effective.hireProfile] : "Not available yet"}
            </span>
          </div>
          <p className="m-0 text-[14px] text-muted">{proposed.hiring.explanation}</p>
          {ownerSetHiring ? <p className="m-0 text-[14px] text-muted">{hiring.explanation}</p> : null}
          {proposed.hiring.recommendedTarget.missing.map((item) => (
            <p key={item} className="m-0 text-[14px] text-muted">
              Missing: {item}.
            </p>
          ))}
        </div>
      </Card>
      <Card as="section" aria-labelledby="growth-plan-recruiting-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="growth-plan-recruiting-title" className="bp-card__title">
          Recruiting approach
        </h2>
        <p className="m-0 font-bold text-ink">
          {effective.recruitingKind ? GROWTH_KIND_LABELS[effective.recruitingKind] : "Not available yet"}
        </p>
        <p className="m-0 text-[14px] text-muted">{effective.recruitingApproach}</p>
        {proposed.recruiting.notes.map((note) => (
          <p key={note} className="m-0 text-[14px] text-muted">
            {note}
          </p>
        ))}
      </Card>
      <Card as="section" aria-labelledby="growth-plan-training-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="growth-plan-training-title" className="bp-card__title">
          Training considerations
        </h2>
        <p className="m-0 text-[14px] text-muted">{proposed.training.limitations}</p>
        <p className="m-0 text-[14px] text-muted">{proposed.training.preparation}</p>
      </Card>
      <Card as="section" aria-labelledby="growth-plan-steps-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="growth-plan-steps-title" className="bp-card__title">
          Prioritized next steps
        </h2>
        <ol className="m-0 flex list-decimal flex-col gap-2 pl-5">
          {effective.nextSteps.map((step) => (
            <li key={step.text} className="text-[14px] text-muted" data-growth-plan-step={step.source}>
              {step.text} {step.source === "owner" ? "(your decision)" : "(recommendation)"}
            </li>
          ))}
        </ol>
      </Card>
      {effective.modifications.length > 0 ? (
        <Card as="section" aria-labelledby="growth-plan-modified-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="growth-plan-modified-title" className="bp-card__title">
            Your modifications
          </h2>
          <div className="grid gap-2" data-growth-plan-modified="">
            {effective.modifications.map((item) => (
              <p key={item} className="m-0 text-[14px] text-muted">
                {item}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
      {effective.warnings.length > 0 ? (
        <Card as="section" aria-labelledby="growth-plan-warnings-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="growth-plan-warnings-title" className="bp-card__title">
            Warnings
          </h2>
          <p className="bp-card__body">These do not block you from saving or approving.</p>
          {effective.warnings.map((warning) => (
            <div key={warning.title} className="mt-3 grid gap-2" data-growth-plan-warning="">
              <p className="m-0 font-bold text-ink">{warning.title}</p>
              <p className="m-0 text-[14px] text-muted">{warning.explanation}</p>
            </div>
          ))}
        </Card>
      ) : null}
      {readOnly ? null : (
        <Card as="section" aria-labelledby="growth-plan-decide-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="growth-plan-decide-title" className="bp-card__title">
            Review and approve
          </h2>
          <p className="bp-card__body">
            Save a draft any time. Approving records your name and the time. Saved goals stay as they are.
          </p>
          <GrowthPlanDraftForm view={view} />
          <GrowthPlanApproveForm view={view} />
        </Card>
      )}
    </>
  )
}

export function GrowthPlanView({
  companyName,
  view,
}: {
  companyName: string
  view: GrowthPlanView
}) {
  const tag = GATE_TAG[view.gate]
  const planTag = PLAN_TAG[view.planStatus]
  const readOnly = view.planStatus === "approved" && !view.draft
  return (
    <>
      <section
        className="flex flex-col gap-3 pt-7 md:pt-12"
        data-growth-plan-gate={view.gate}
        data-growth-plan-status={view.planStatus}
        data-growth-plan-version={view.currentApproved?.version ?? view.previousApproved?.version ?? ""}
      >
        <Link href="/blueprint" className="bp-link self-start font-bold">
          Back to your Blueprint
        </Link>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{GROWTH_PLAN_PAGE_TITLE}</h1>
          <StatusTag status={tag.status} label={tag.label} />
          {view.gate === "current" ? <StatusTag status={planTag.status} label={planTag.label} /> : null}
        </div>
        {view.gate === "current" ? <p className="bp-type-lead max-w-[620px] text-ink-2">{GROWTH_PLAN_OPENING}</p> : null}
        {view.planStatus === "approved" ? <p className="m-0 text-[14px] text-muted">{GROWTH_PLAN_APPROVED}</p> : null}
        {view.planStatus === "needs_review" ? (
          <p className="m-0 text-[14px] text-muted" data-growth-plan-needs-review="">
            {GROWTH_PLAN_NEEDS_REVIEW}
          </p>
        ) : null}
      </section>
      {view.gate !== "current" ? <GateCard gate={view.gate} /> : null}
      {view.gate === "current" && view.previousApproved ? (
        <FrozenPlan title="Previously approved version" plan={view.previousApproved} />
      ) : null}
      {view.gate === "current" && view.proposed ? (
        <>
          {view.currentApproved && view.draft ? (
            <p className="m-0 max-w-[900px] text-[14px] text-muted">
              You are editing a draft. The approved plan stays current until you approve this revision.
            </p>
          ) : null}
          <PlanBody view={view} readOnly={readOnly} />
          {readOnly ? <GrowthPlanReviseForm /> : null}
          <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
            <Link href="/blueprint/growth" className="bp-btn bp-btn--plain">
              Previous: Growth planning
            </Link>
            <Link href="/blueprint/recruit" className="bp-btn bp-btn--soft">
              Next: Recruiting
            </Link>
            <Link href="/blueprint" className="bp-btn bp-btn--plain">
              Back to your Blueprint
            </Link>
          </div>
        </>
      ) : null}
    </>
  )
}
