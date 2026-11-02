import Link from "next/link"
import { redirect } from "next/navigation"

import { companyGoalCodes, companyGoalsOtherText } from "@/lib/blueprint/company-goals"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { blueprintSection } from "@/lib/blueprint/progress"

import { DesiredDjCountForm } from "../../desired-dj-count-form"
import { FocusQuestion } from "../../focus-question"
import { OwnerGoalsForm } from "../../owner-goals-form"
import { TeamTodayForm } from "../../team-today-form"
import {
  BlueprintSectionPage,
  BlueprintShell,
  GOALS_OPENING,
  TEAM_FOOTER_NOTE,
  TEAM_OPENING,
} from "../blueprint-ui"

export default async function BlueprintSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const membership = await requireGuidedOwner()
  const { section: slug } = await params

  if (slug !== "goals" && slug !== "team") {
    redirect("/blueprint")
  }

  const section = blueprintSection(slug)
  if (!section) {
    redirect("/blueprint")
  }

  const { companyGoals, teamToday, progress, resolved } = await loadGuidedBlueprint()
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

  const currentDjCount = teamToday == null ? null : teamToday.currentDjCount
  const desiredDjCount = teamToday?.desiredDjCount ?? null

  return (
    <BlueprintShell>
      <FocusQuestion questionId={focusId} />
      <BlueprintSectionPage
        section={section}
        status={status}
        opening={TEAM_OPENING}
        footer={
          <>
            <Link href="/blueprint/goals" className="bp-btn bp-btn--plain">
              Previous: Your goals
            </Link>
            <Link href="/blueprint" className="bp-btn bp-btn--soft">
              Back to your Blueprint
            </Link>
            <p className="m-0 text-ink-2">{TEAM_FOOTER_NOTE}</p>
          </>
        }
      >
        <div key={`team-today:${membership.companyId}`} className="grid gap-5 md:grid-cols-2">
          <div id="q-TL1">
            <TeamTodayForm currentDjCount={currentDjCount} />
          </div>
          <div id="q-TL6">
            <DesiredDjCountForm currentDjCount={currentDjCount} desiredDjCount={desiredDjCount} />
          </div>
        </div>
      </BlueprintSectionPage>
    </BlueprintShell>
  )
}
