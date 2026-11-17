import type { ReactNode } from "react"
import Link from "next/link"

import { Card, StatusTag, TopNav } from "@/components/blueprint"
import { sectionHref } from "@/lib/blueprint/answers"
import {
  BLUEPRINT_SECTIONS,
  TOTAL_SECTIONS,
  type BlueprintProgress,
  type BlueprintSection,
  type SectionStatus,
} from "@/lib/blueprint/progress"

import { SignOutButton } from "../sign-out-button"

export const OVERVIEW_LEAD =
  "Eight short sections. Blueprint saves each answer when you press Save, so you can stop and pick up any time."
export const ALL_READY_DONE_TEXT = "You’ve finished the sections that are ready. More are coming soon."
export const GOALS_OPENING =
  "Let’s start with where you want to go. Everything Blueprint suggests ties back to this."
export const TEAM_OPENING = "Now your team: how many DJs you have, and how many you’d like."
export { TEAM_OPENING_V2 } from "@/lib/blueprint/team-today"
export const TEAM_FOOTER_NOTE = "The next sections are coming soon."
export { EVENTS_OPENING, EVENTS_FOOTER_NOTE } from "@/lib/blueprint/events"
export { SERVICES_OPENING, SERVICES_FOOTER_NOTE } from "@/lib/blueprint/services"
export { NUMBERS_OPENING, NUMBERS_FOOTER_NOTE } from "@/lib/blueprint/numbers"
export { DEVELOPMENT_OPENING, DEVELOPMENT_FOOTER_NOTE } from "@/lib/blueprint/development"

const STATUS_TAGS: Record<SectionStatus, { status: "planned" | "progress" | "proven"; label: string }> = {
  not_started: { status: "planned", label: "Not started" },
  needs_attention: { status: "progress", label: "Needs attention" },
  complete: { status: "proven", label: "Complete" },
  coming_soon: { status: "planned", label: "Coming soon" },
}

export function SectionStatusTag({ status }: { status: SectionStatus }) {
  const tag = STATUS_TAGS[status]
  return <StatusTag status={tag.status} label={tag.label} />
}

export function sectionsCompleteText(progress: BlueprintProgress) {
  const started =
    progress.startedCount > 0 ? ` · ${progress.startedCount} started` : ""
  return `${progress.completeCount} of ${TOTAL_SECTIONS} sections complete${started}`
}

const PRIMARY_LABELS = { start: "Start your Blueprint", continue: "Continue your Blueprint" } as const

/** The one primary action: start or continue at the first unfinished live section. Nothing when none is left. */
export function BlueprintPrimaryLink({ progress }: { progress: BlueprintProgress }) {
  if (progress.action === "review" || progress.next === null) return null
  return (
    <Link href={sectionHref(progress.next, progress.focusQuestionKey)} className="bp-btn bp-btn--primary self-start">
      {PRIMARY_LABELS[progress.action]}
    </Link>
  )
}

export function BlueprintShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav actions={<SignOutButton />} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-4 pb-11 md:gap-12 md:px-8 md:pb-16">
        {children}
      </main>
    </>
  )
}

function SectionRow({
  section,
  status,
  skipped,
  toAnswer,
  revisitKey,
  skippedKey,
}: {
  section: BlueprintSection
  status: SectionStatus
  skipped: number
  toAnswer: number
  revisitKey: string | null
  skippedKey: string | null
}) {
  const href = sectionHref(section.slug, status === "needs_attention" ? revisitKey : null)
  const skippedHref = skippedKey ? sectionHref(section.slug, skippedKey) : null
  const skippedLabel = skipped === 1 ? "1 skipped" : `${skipped} skipped`
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 basis-[260px] items-baseline gap-3">
        <span aria-hidden="true" className="bp-type-small w-5 shrink-0 font-bold! text-muted">
          {section.number}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          {section.live ? (
            <Link href={href} className="bp-link font-bold">
              {section.name}
            </Link>
          ) : (
            <span className="font-bold text-ink">{section.name}</span>
          )}
          <span className="text-[14px] text-muted">{section.description}</span>
          {skipped > 0 && skippedHref ? (
            <Link href={skippedHref} className="bp-link text-[14px]">
              {skippedLabel}
            </Link>
          ) : skipped > 0 ? (
            <span className="text-[14px] text-muted">{skippedLabel}</span>
          ) : null}
          {status === "needs_attention" && toAnswer > 0 ? (
            <span className="text-[14px] text-muted">{toAnswer === 1 ? "1 to answer" : `${toAnswer} to answer`}</span>
          ) : null}
        </div>
      </div>
      <SectionStatusTag status={status} />
    </li>
  )
}

export function BlueprintSectionList({ progress }: { progress: BlueprintProgress }) {
  return (
    <Card as="section" aria-labelledby="blueprint-sections-title">
      <h2 id="blueprint-sections-title" className="bp-sr">
        The eight sections
      </h2>
      <ol className="m-0 flex list-none flex-col p-0">
        {BLUEPRINT_SECTIONS.map((section) => (
          <SectionRow
            key={section.slug}
            section={section}
            status={progress.statuses[section.slug]}
            skipped={progress.skippedCounts[section.slug]}
            toAnswer={progress.toAnswerCounts[section.slug]}
            revisitKey={progress.revisitKeys[section.slug]}
            skippedKey={progress.skippedKeys[section.slug]}
          />
        ))}
      </ol>
    </Card>
  )
}

export function BlueprintOverview({
  companyName,
  progress,
}: {
  companyName: string
  progress: BlueprintProgress
}) {
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12">
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">Your Company Blueprint</h1>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{OVERVIEW_LEAD}</p>
        <p className="bp-type-small font-bold! text-ink-2">{sectionsCompleteText(progress)}</p>
        <BlueprintPrimaryLink progress={progress} />
        {progress.action === "review" ? <p className="m-0 text-ink-2">{ALL_READY_DONE_TEXT}</p> : null}
      </section>
      <BlueprintSectionList progress={progress} />
    </>
  )
}

/** The Owner Home summary card shown when the guided Blueprint is on for the owner's company. */
export function BlueprintHomeCard({ progress }: { progress: BlueprintProgress }) {
  const touched = progress.action !== "start"
  return (
    <Card as="section" aria-labelledby="company-blueprint-title" className="max-[760px]:p-[22px]!">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="company-blueprint-title" className="bp-card__title">
          Your Company Blueprint
        </h2>
        <StatusTag
          status={touched ? "progress" : "planned"}
          label={touched ? "In progress" : "Not started"}
        />
      </div>
      <p className="bp-card__body">{sectionsCompleteText(progress)}</p>
      {progress.action === "review" ? (
        <Link href="/blueprint" className="bp-btn bp-btn--soft self-start">
          Review your Blueprint
        </Link>
      ) : (
        <BlueprintPrimaryLink progress={progress} />
      )}
    </Card>
  )
}

export function BlueprintSectionPage({
  section,
  status,
  opening,
  children,
  footer,
  framed = true,
}: {
  section: BlueprintSection
  status: SectionStatus
  opening: string
  children: ReactNode
  footer: ReactNode
  framed?: boolean
}) {
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12">
        <Link href="/blueprint" className="bp-link self-start font-bold">
          Back to your Blueprint
        </Link>
        <p className="bp-type-small font-bold! text-muted">
          Section {section.number} of {TOTAL_SECTIONS}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 id="section-title" className="bp-type-display-xl max-[760px]:text-[46px]!">
            {section.name}
          </h1>
          <SectionStatusTag status={status} />
        </div>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{opening}</p>
      </section>
      {framed ? (
        <Card as="section" aria-labelledby="section-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          {children}
        </Card>
      ) : (
        children
      )}
      <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
        {footer}
      </div>
    </>
  )
}

