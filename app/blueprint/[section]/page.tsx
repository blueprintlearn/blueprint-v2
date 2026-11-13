import Link from "next/link"
import { redirect } from "next/navigation"

import { companyGoalCodes, companyGoalsOtherText } from "@/lib/blueprint/company-goals"
import { EVENTS_OPENING } from "@/lib/blueprint/events"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { blueprintSection } from "@/lib/blueprint/progress"
import { SERVICES_FOOTER_NOTE, SERVICES_OPENING } from "@/lib/blueprint/services"

import { EventsGuidedForm } from "../../events-guided-form"
import { FocusQuestion } from "../../focus-question"
import { OwnerGoalsForm } from "../../owner-goals-form"
import { ServicesGuidedForm } from "../../services-guided-form"
import { TeamTodayGuidedForm } from "../../team-today-guided-form"
import {
  BlueprintSectionPage,
  BlueprintShell,
  GOALS_OPENING,
  TEAM_OPENING_V2,
} from "../blueprint-ui"

export default async function BlueprintSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const membership = await requireGuidedOwner()
  const { section: slug } = await params

  if (slug !== "goals" && slug !== "team" && slug !== "events" && slug !== "services") {
    redirect("/blueprint")
  }

  const section = blueprintSection(slug)
  if (!section) {
    redirect("/blueprint")
  }

  const { companyGoals, teamToday, progress, resolved, answers } = await loadGuidedBlueprint()
  const status = progress.statuses[slug]
  const g1Skipped = resolved.some((row) => row.key === "G1" && row.state === "skipped")
  const g3Value = resolved.find((row) => row.key === "G3" && (row.state === "answered" || row.state === "estimated"))
  const focusId = progress.next === slug && progress.focusQuestionKey ? `q-${progress.focusQuestionKey}` : null

  if (slug === "goals") {
    return (
      <BlueprintShell>
        <FocusQuestion questionId={focusId} />
        <BlueprintSectionPage
          section={section}
          status={status}
          opening={GOALS_OPENING}
          footer={
            <Link href="/blueprint/team" id="blueprint-next" className="bp-btn bp-btn--soft">
              Next: Your team today
            </Link>
          }
        >
          <OwnerGoalsForm
            key={membership.companyId}
            companyId={membership.companyId}
            goals={companyGoalCodes(companyGoals)}
            primary={companyGoals?.primary.goal ?? null}
            otherText={companyGoalsOtherText(companyGoals)}
            g1Skipped={g1Skipped}
            g3Value={typeof g3Value?.value === "string" ? g3Value.value : null}
          />
        </BlueprintSectionPage>
      </BlueprintShell>
    )
  }

  if (slug === "events") {
    return (
      <BlueprintShell>
        <FocusQuestion questionId={focusId} />
        <BlueprintSectionPage
          section={section}
          status={status}
          opening={EVENTS_OPENING}
          framed={false}
          footer={
            <>
              <Link href="/blueprint/team" className="bp-btn bp-btn--plain">
                Previous: Your team today
              </Link>
              <Link href="/blueprint/services" id="blueprint-next" className="bp-btn bp-btn--soft">
                Next: Your services and market
              </Link>
            </>
          }
        >
          <EventsGuidedForm resolved={resolved} />
        </BlueprintSectionPage>
      </BlueprintShell>
    )
  }

  if (slug === "services") {
    return (
      <BlueprintShell>
        <FocusQuestion questionId={focusId} />
        <BlueprintSectionPage
          section={section}
          status={status}
          opening={SERVICES_OPENING}
          framed={false}
          footer={
            <>
              <Link href="/blueprint/events" className="bp-btn bp-btn--plain">
                Previous: Your events
              </Link>
              <Link href="/blueprint" className="bp-btn bp-btn--soft">
                Back to your Blueprint
              </Link>
              <p className="m-0 text-ink-2">{SERVICES_FOOTER_NOTE}</p>
            </>
          }
        >
          <ServicesGuidedForm resolved={resolved} />
        </BlueprintSectionPage>
      </BlueprintShell>
    )
  }

  return (
    <BlueprintShell>
      <FocusQuestion questionId={focusId} />
      <BlueprintSectionPage
        section={section}
        status={status}
        opening={TEAM_OPENING_V2}
        framed={false}
        footer={
          <>
            <Link href="/blueprint/goals" className="bp-btn bp-btn--plain">
              Previous: Your goals
            </Link>
            <Link href="/blueprint/events" id="blueprint-next" className="bp-btn bp-btn--soft">
              Next: Your events
            </Link>
          </>
        }
      >
        <TeamTodayGuidedForm
          key={`team-today:${membership.companyId}`}
          team={teamToday}
          resolved={resolved}
          answers={answers}
          goals={companyGoalCodes(companyGoals)}
          sectionComplete={status === "complete"}
        />
      </BlueprintSectionPage>
    </BlueprintShell>
  )
}
