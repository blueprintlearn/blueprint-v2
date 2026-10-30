import { TopNav } from "@/components/blueprint"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { getBlueprintProgress } from "@/lib/blueprint/progress"
import { companyGoalsAlsoLine, getCurrentCompanyGoals, getCurrentOwnerGoal, getCurrentTeamToday } from "@/lib/blueprint/queries"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import { AuthLinks } from "./auth-links"
import { BlueprintHomeCard } from "./blueprint/blueprint-ui"
import { CreateCompanyForm } from "./create-company-form"
import { DesiredDjCountForm } from "./desired-dj-count-form"
import { OwnerGoalCard, OwnerHomeHero, TeamTodayCard } from "./owner-home"
import { OwnerGoalForm } from "./owner-goal-form"
import { SignOutButton } from "./sign-out-button"
import { TeamTodayForm } from "./team-today-form"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const membership = signedIn ? await getCurrentMembership() : null
  const ownerGoal = membership ? await getCurrentOwnerGoal() : null
  const teamToday = membership ? await getCurrentTeamToday() : null
  const isOwner = membership?.role === OWNER_ADMIN_ROLE
  const guided = Boolean(membership && isOwner && isGuidedBlueprintEnabled(membership.companyId))
  const companyGoals = guided ? await getCurrentCompanyGoals() : null

  if (membership) {
    const canEdit = isOwner && !guided
    const currentDjCount = teamToday == null ? null : teamToday.currentDjCount
    const desiredDjCount = teamToday?.desiredDjCount ?? null

    return (
      <>
        <TopNav actions={<SignOutButton />} />
        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-4 pb-11 md:gap-12 md:px-8 md:pb-16">
          <OwnerHomeHero companyName={membership.companyName} role={membership.role} isOwner={isOwner} />
          {guided ? <BlueprintHomeCard progress={getBlueprintProgress(companyGoals, teamToday)} /> : null}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <TeamTodayCard
              currentDjCount={currentDjCount}
              desiredDjCount={desiredDjCount}
              editHref={guided ? "/blueprint/team" : undefined}
              editor={
                canEdit ? (
                  <div key={`team-today:${membership.companyId}`} className="grid gap-5 md:grid-cols-2">
                    <TeamTodayForm currentDjCount={currentDjCount} />
                    <DesiredDjCountForm currentDjCount={currentDjCount} desiredDjCount={desiredDjCount} />
                  </div>
                ) : undefined
              }
            />
            <OwnerGoalCard
              goal={ownerGoal?.ownerGoal ?? null}
              goalOther={ownerGoal?.ownerGoalOther ?? null}
              isOwner={isOwner}
              editHref={guided ? "/blueprint/goals" : undefined}
              alsoLine={guided ? companyGoalsAlsoLine(companyGoals) : undefined}
              editor={
                canEdit ? (
                  <OwnerGoalForm
                    key={`owner-goal:${membership.companyId}`}
                    ownerGoal={ownerGoal?.ownerGoal ?? null}
                    ownerGoalOther={ownerGoal?.ownerGoalOther ?? null}
                  />
                ) : undefined
              }
            />
          </div>
        </main>
      </>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Blueprint</h1>

      {!signedIn ? (
        <>
          <p>Sign in or create an account to start a company.</p>
          <AuthLinks />
        </>
      ) : (
        <>
          <p>You do not belong to a company yet.</p>
          <CreateCompanyForm />
          <SignOutButton />
        </>
      )}
    </main>
  )
}
