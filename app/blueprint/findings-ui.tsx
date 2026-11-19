import Link from "next/link"

import { AnswerStateNote, Card, StatusTag } from "@/components/blueprint"
import {
  FINDINGS_CLARIFICATION_INTRO,
  FINDINGS_NEEDS_APPROVAL,
  FINDINGS_NOT_COLLECTED_INTRO,
  FINDINGS_OPENING,
  FINDINGS_PAGE_TITLE,
  FINDINGS_REVIEW_CTA,
  FINDINGS_STALE,
  type BusinessFindings,
  type FindingsFact,
  type FindingsGate,
  type FindingsGroup,
} from "@/lib/blueprint/findings"

const GATE_TAG: Record<FindingsGate, { status: "proven" | "progress" | "planned"; label: string }> = {
  current: { status: "proven", label: "Current" },
  stale: { status: "progress", label: "Needs a new approval" },
  needs_approval: { status: "planned", label: "Not approved yet" },
}

function FactRow({ fact }: { fact: FindingsFact }) {
  const empty = fact.kind === "skipped" || fact.kind === "missing"
  return (
    <div className="bp-fact" data-findings-key={fact.key} data-findings-kind={fact.kind}>
      <span className="bp-fact__label">{fact.label}</span>
      <span className={`bp-fact__value${empty ? " is-empty" : ""}`}>{fact.display}</span>
      {fact.kind === "confirmed" ? <StatusTag status="proven" label="Confirmed" /> : null}
      {fact.kind === "estimated" ? <AnswerStateNote state="estimated" /> : null}
      {fact.kind === "skipped" ? <AnswerStateNote state="skipped" /> : null}
    </div>
  )
}

function GroupCard({ group }: { group: FindingsGroup }) {
  return (
    <Card as="section" aria-labelledby={`findings-${group.id}-title`} className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id={`findings-${group.id}-title`} className="bp-card__title">
        {group.title}
      </h2>
      <p className="bp-card__body">{group.intro}</p>
      {group.privacyNote ? <p className="m-0 text-[14px] text-muted">{group.privacyNote}</p> : null}
      <div className="grid gap-3">
        {group.facts.map((fact) => (
          <FactRow key={fact.key} fact={fact} />
        ))}
      </div>
    </Card>
  )
}

function ClarificationCard({ facts }: { facts: FindingsFact[] }) {
  if (facts.length === 0) return null
  return (
    <Card as="section" aria-labelledby="findings-clarification-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="findings-clarification-title" className="bp-card__title">
        Needs clarification
      </h2>
      <p className="bp-card__body">{FINDINGS_CLARIFICATION_INTRO}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {facts.map((fact) => (
          <li key={fact.key} className="flex flex-col gap-1" data-findings-gap={fact.key}>
            <Link href={fact.href} className="bp-link font-bold">
              {fact.label}
            </Link>
            <p className="m-0 text-[14px] text-muted">
              {fact.kind === "skipped" ? "You skipped this for now." : "Not answered yet."} {fact.why}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function NotCollectedCard({ items }: { items: BusinessFindings["notCollected"] }) {
  return (
    <Card as="section" aria-labelledby="findings-not-collected-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="findings-not-collected-title" className="bp-card__title">
        Not collected yet
      </h2>
      <p className="bp-card__body">{FINDINGS_NOT_COLLECTED_INTRO}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.title}>
            <p className="m-0 font-bold text-ink">{item.title}</p>
            <p className="m-0 text-[14px] text-muted">{item.note}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function GateCard({ gate }: { gate: Exclude<FindingsGate, "current"> }) {
  return (
    <Card as="section" aria-labelledby="findings-gate-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="findings-gate-title" className="bp-card__title">
        {gate === "stale" ? "This is no longer the approved version" : "Approve your Blueprint first"}
      </h2>
      <p className="bp-card__body">{gate === "stale" ? FINDINGS_STALE : FINDINGS_NEEDS_APPROVAL}</p>
      <Link href="/blueprint/review" className="bp-btn bp-btn--primary self-start">
        {FINDINGS_REVIEW_CTA}
      </Link>
    </Card>
  )
}

export function BusinessFindingsView({
  companyName,
  findings,
}: {
  companyName: string
  findings: BusinessFindings
}) {
  const tag = GATE_TAG[findings.gate]
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-findings-gate={findings.gate}>
        <Link href="/blueprint" className="bp-link self-start font-bold">
          Back to your Blueprint
        </Link>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{FINDINGS_PAGE_TITLE}</h1>
          <StatusTag status={tag.status} label={tag.label} />
        </div>
        {findings.gate === "current" ? (
          <p className="bp-type-lead max-w-[620px] text-ink-2">{FINDINGS_OPENING}</p>
        ) : null}
      </section>
      {findings.gate === "current" ? (
        <>
          {findings.groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
          <ClarificationCard facts={findings.needsClarification} />
          <NotCollectedCard items={findings.notCollected} />
          <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
            <Link href="/blueprint/review" className="bp-btn bp-btn--plain">
              {FINDINGS_REVIEW_CTA}
            </Link>
            <Link href="/blueprint" className="bp-btn bp-btn--soft">
              Back to your Blueprint
            </Link>
          </div>
        </>
      ) : (
        <GateCard gate={findings.gate} />
      )}
    </>
  )
}
