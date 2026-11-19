import Link from "next/link"

import { Card, StatusTag } from "@/components/blueprint"
import {
  RECRUIT_APPROVED,
  RECRUIT_GROWTH_NONE,
  RECRUIT_GROWTH_OFFER,
  RECRUIT_NEEDS_REVIEW,
  RECRUIT_OPENING,
  RECRUIT_PAGE_TITLE,
  RECRUIT_STALE_GROWTH,
  type RecruitView,
  type StoredRecruitStrategy,
} from "@/lib/blueprint/recruitment"
import {
  RECRUIT_CHANNEL_LABELS,
  RECRUIT_EMPLOYMENT_LABELS,
  RECRUIT_PROFILE_LABELS,
  RECRUIT_REASON_LABELS,
  applyRecruitDecisions,
} from "@/lib/blueprint/recruitment-engine"
import { RecruitApproveForm, RecruitDraftForm, RecruitNeedForm, RecruitReviseForm } from "../recruit-form"

const PLAN_TAG: Record<RecruitView["planStatus"], { status: "proven" | "progress" | "planned"; label: string }> = {
  approved: { status: "proven", label: "Approved" },
  needs_review: { status: "progress", label: "Needs review" },
  draft: { status: "progress", label: "Draft" },
  none: { status: "planned", label: "Not approved" },
}

function FrozenStrategy({ title, strategy }: { title: string; strategy: StoredRecruitStrategy }) {
  const approved = applyRecruitDecisions(strategy.recommended, strategy.decisions, [])
  return (
    <Card as="section" aria-labelledby="recruit-previous-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="recruit-previous-title" className="bp-card__title">
        {title}
      </h2>
      <p className="bp-card__body">
        Version {strategy.version}
        {strategy.approvedAt ? `, approved ${new Date(strategy.approvedAt).toLocaleString("en-US")}` : ""}. These
        decisions were not changed.
      </p>
      <div className="grid gap-3" data-recruit-previous={strategy.version}>
        <p className="m-0 font-bold text-ink">
          {strategy.recommended.why.reason ? RECRUIT_REASON_LABELS[strategy.recommended.why.reason] : "Reason not set"}
        </p>
        <p className="m-0 text-[14px] text-muted">
          Approved hiring target:{" "}
          {approved.hiringTarget === null ? "Not available" : `${approved.hiringTarget} people`}
        </p>
        <p className="m-0 text-[14px] text-muted">
          Approved hire profile:{" "}
          {approved.hireProfile ? RECRUIT_PROFILE_LABELS[approved.hireProfile] : "Not available"}
        </p>
        <p className="m-0 text-[14px] text-muted">
          Approved channels:{" "}
          {approved.channels
            .filter((row) => row.recommended)
            .map((row) => row.label)
            .join(", ") || "None selected"}
        </p>
      </div>
    </Card>
  )
}

function StrategyBody({ view, readOnly }: { view: RecruitView; readOnly: boolean }) {
  const proposed = view.proposed
  const effective = view.effective
  if (!proposed || !effective) return null
  return (
    <>
      <Card as="section" aria-labelledby="recruit-why-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-why-title" className="bp-card__title">
          Why you are recruiting
        </h2>
        <p className="m-0 font-bold text-ink" data-recruit-reason={proposed.why.reason ?? "none"}>
          {proposed.why.reason ? RECRUIT_REASON_LABELS[proposed.why.reason] : "Not chosen yet"}
        </p>
        <p className="m-0 text-[14px] text-muted">{proposed.why.explanation}</p>
      </Card>
      <Card as="section" aria-labelledby="recruit-hiring-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-hiring-title" className="bp-card__title">
          Hiring target
        </h2>
        <div
          className="grid gap-3"
          data-recruit-hiring={effective.hiringTarget === null ? "unavailable" : String(effective.hiringTarget)}
          data-recruit-hiring-status={proposed.hiring.status}
          data-recruit-profile={effective.hireProfile ?? "unavailable"}
        >
          <div className="bp-fact">
            <span className="bp-fact__label">People to recruit</span>
            <span className={`bp-fact__value${effective.hiringTarget === null ? " is-empty" : ""}`}>
              {effective.hiringTarget === null ? "Not available yet" : String(effective.hiringTarget)}
            </span>
          </div>
          <div className="bp-fact">
            <span className="bp-fact__label">Beginner or experienced</span>
            <span className={`bp-fact__value${effective.hireProfile ? "" : " is-empty"}`}>
              {effective.hireProfile ? RECRUIT_PROFILE_LABELS[effective.hireProfile] : "Not available yet"}
            </span>
          </div>
          <p className="m-0 text-[14px] text-muted">
            {view.decisions.stance === "modify" && view.decisions.hiringTarget !== null
              ? `You set the hiring need to ${view.decisions.hiringTarget}.`
              : proposed.hiring.explanation}
          </p>
        </div>
      </Card>
      <Card as="section" aria-labelledby="recruit-profile-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-profile-title" className="bp-card__title">
          Ideal candidate
        </h2>
        <h3 className="m-0 text-[16px] font-bold text-ink">Required qualifications</h3>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
          {proposed.profile.required.map((item) => (
            <li key={item.text} className="text-[14px] text-muted" data-recruit-required={item.source}>
              {item.text}
            </li>
          ))}
        </ul>
        <h3 className="m-0 mt-3 text-[16px] font-bold text-ink">Preferred qualifications</h3>
        {proposed.profile.preferred.length > 0 ? (
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
            {proposed.profile.preferred.map((item) => (
              <li key={item.text} className="text-[14px] text-muted" data-recruit-preferred={item.source}>
                {item.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[14px] text-muted">
            No preferred qualifications yet. Add skills in Your ideal DJ if they matter for this role.
          </p>
        )}
        {proposed.profile.values.length > 0 ? (
          <>
            <h3 className="m-0 mt-3 text-[16px] font-bold text-ink">Core values in this role</h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {proposed.profile.values.map((row) => (
                <li key={row.value} className="grid gap-1" data-recruit-value="">
                  <p className="m-0 font-bold text-ink">{row.value}</p>
                  <p className="m-0 text-[14px] text-muted">{row.behavior}</p>
                  <p className="m-0 text-[14px] text-muted">Interview: {row.interviewQuestion}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="m-0 mt-3 text-[14px] text-muted">
            Core values were not defined in onboarding, so none are added here.
          </p>
        )}
      </Card>
      <Card as="section" aria-labelledby="recruit-employment-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-employment-title" className="bp-card__title">
          Compensation and arrangement
        </h2>
        <p className="m-0 font-bold text-ink">
          {effective.employment.arrangement
            ? RECRUIT_EMPLOYMENT_LABELS[effective.employment.arrangement]
            : "Not set"}
        </p>
        <p className="m-0 text-[14px] text-muted" data-recruit-pay="">
          {effective.employment.compensation}
        </p>
        <p className="m-0 text-[14px] text-muted">{effective.employment.explanation}</p>
      </Card>
      <Card as="section" aria-labelledby="recruit-channels-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-channels-title" className="bp-card__title">
          Recommended recruiting channels
        </h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {effective.channels.map((row) => (
            <li
              key={row.id}
              className="grid gap-1"
              data-recruit-channel={row.id}
              data-recruit-channel-recommended={row.recommended ? "yes" : "no"}
            >
              <p className="m-0 font-bold text-ink">
                {RECRUIT_CHANNEL_LABELS[row.id]}
                {row.recommended ? "" : " (optional)"}
              </p>
              <p className="m-0 text-[14px] text-muted">{row.why}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card as="section" aria-labelledby="recruit-budget-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-budget-title" className="bp-card__title">
          Budget approach
        </h2>
        <p className="m-0 text-[14px] text-muted" data-recruit-budget={proposed.budget.estimated ? "estimated" : "owner"}>
          {effective.budget.approach}
        </p>
      </Card>
      <Card as="section" aria-labelledby="recruit-steps-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="recruit-steps-title" className="bp-card__title">
          Prioritized next steps
        </h2>
        <ol className="m-0 flex list-decimal flex-col gap-2 pl-5">
          {effective.nextSteps.map((step) => (
            <li key={step.text} className="text-[14px] text-muted" data-recruit-step={step.source}>
              {step.text} {step.source === "owner" ? "(your decision)" : "(recommendation)"}
            </li>
          ))}
        </ol>
      </Card>
      {effective.modifications.length > 0 ? (
        <Card as="section" aria-labelledby="recruit-modified-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="recruit-modified-title" className="bp-card__title">
            Your modifications
          </h2>
          <div className="grid gap-2" data-recruit-modified="">
            {effective.modifications.map((item) => (
              <p key={item} className="m-0 text-[14px] text-muted">
                {item}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
      {effective.warnings.length > 0 ? (
        <Card as="section" aria-labelledby="recruit-warnings-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="recruit-warnings-title" className="bp-card__title">
            Warnings
          </h2>
          <p className="bp-card__body">These do not block you from saving or approving.</p>
          {effective.warnings.map((warning) => (
            <div key={warning.title} className="mt-3 grid gap-2" data-recruit-warning="">
              <p className="m-0 font-bold text-ink">{warning.title}</p>
              <p className="m-0 text-[14px] text-muted">{warning.explanation}</p>
            </div>
          ))}
        </Card>
      ) : null}
      {readOnly ? null : (
        <Card as="section" aria-labelledby="recruit-decide-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="recruit-decide-title" className="bp-card__title">
            Review and approve
          </h2>
          <p className="bp-card__body">
            Save a draft any time. Approving records your name and the time. It does not publish a job.
          </p>
          <RecruitDraftForm view={view} />
          <RecruitApproveForm view={view} />
        </Card>
      )}
    </>
  )
}

export function RecruitStrategyView({
  companyName,
  view,
}: {
  companyName: string
  view: RecruitView
}) {
  const planTag = PLAN_TAG[view.planStatus]
  const readOnly = view.planStatus === "approved" && !view.draft
  const growthState = view.growthAvailable ? "available" : view.growthStale ? "stale" : "none"
  return (
    <>
      <section
        className="flex flex-col gap-3 pt-7 md:pt-12"
        data-recruit-status={view.planStatus}
        data-recruit-version={view.currentApproved?.version ?? view.previousApproved?.version ?? ""}
        data-recruit-growth={growthState}
      >
        <Link href="/blueprint" className="bp-link self-start font-bold">
          Back to your Blueprint
        </Link>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{RECRUIT_PAGE_TITLE}</h1>
          <StatusTag status={planTag.status} label={planTag.label} />
        </div>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{RECRUIT_OPENING}</p>
        {view.planStatus === "approved" ? <p className="m-0 text-[14px] text-muted">{RECRUIT_APPROVED}</p> : null}
        {view.planStatus === "needs_review" ? (
          <p className="m-0 text-[14px] text-muted" data-recruit-needs-review="">
            {RECRUIT_NEEDS_REVIEW}
          </p>
        ) : null}
        {view.growthAvailable ? <p className="m-0 text-[14px] text-muted">{RECRUIT_GROWTH_OFFER}</p> : null}
        {view.growthStale ? <p className="m-0 text-[14px] text-muted">{RECRUIT_STALE_GROWTH}</p> : null}
        {!view.growthAvailable && !view.growthStale ? (
          <p className="m-0 text-[14px] text-muted">{RECRUIT_GROWTH_NONE}</p>
        ) : null}
      </section>
      {view.previousApproved ? <FrozenStrategy title="Previously approved version" strategy={view.previousApproved} /> : null}
      {readOnly ? null : (
        <Card as="section" aria-labelledby="recruit-need-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="recruit-need-title" className="bp-card__title">
            Hiring need
          </h2>
          <p className="bp-card__body">
            Ask only what this search still needs. Saved answers from onboarding are reused when they apply.
          </p>
          <RecruitNeedForm view={view} />
        </Card>
      )}
      {view.currentApproved && view.draft ? (
        <p className="m-0 max-w-[900px] text-[14px] text-muted">
          You are editing a draft. The approved strategy stays current until you approve this revision.
        </p>
      ) : null}
      {view.inputs.reason ? <StrategyBody view={view} readOnly={readOnly} /> : null}
      {readOnly ? <RecruitReviseForm /> : null}
      <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
        <Link href="/blueprint/growth-plan" className="bp-btn bp-btn--plain">
          Previous: Growth plan
        </Link>
        <Link href="/blueprint/recruiting" className="bp-btn bp-btn--soft">
          Next: Job ads
        </Link>
        <Link href="/blueprint/applicants" className="bp-btn bp-btn--plain">
          Applicants
        </Link>
        <Link href="/blueprint" className="bp-btn bp-btn--plain">
          Back to your Blueprint
        </Link>
      </div>
    </>
  )
}
