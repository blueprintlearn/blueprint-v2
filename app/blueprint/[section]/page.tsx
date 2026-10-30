import Link from "next/link"
import { redirect } from "next/navigation"

import { companyGoalCodes, companyGoalsOtherText } from "@/lib/blueprint/company-goals"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { blueprintSection } from "@/lib/blueprint/progress"

import { DesiredDjCountForm } from "../../desired-dj-count-form"
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

  const { companyGoals, teamToday, progress } = await loadGuidedBlueprint()
  const status = progress.statuses[slug]

  if (slug === "goals") {
    return (
      <BlueprintShell>
        <BlueprintSectionPage
          section={section}
          status={status}
          opening={GOALS_OPENING}
          footer={
            <Link href="/blueprint/team" className="bp-btn bp-btn--soft">
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
          />
        </BlueprintSectionPage>
      </BlueprintShell>
    )
  }

  const currentDjCount = teamToday == null ? null : teamToday.currentDjCount
  const desiredDjCount = teamToday?.desiredDjCount ?? null

  return (
    <BlueprintShell>
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
          <TeamTodayForm currentDjCount={currentDjCount} />
          <DesiredDjCountForm currentDjCount={currentDjCount} desiredDjCount={desiredDjCount} />
        </div>
      </BlueprintSectionPage>
    </BlueprintShell>
  )
}
