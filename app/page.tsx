import { getCurrentOwnerGoal, getCurrentTeamToday } from "@/lib/blueprint/queries"
import { OWNER_GOAL_LABELS } from "@/lib/blueprint/goals"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import { AuthLinks } from "./auth-links"
import { CreateCompanyForm } from "./create-company-form"
import { DesiredDjCountForm } from "./desired-dj-count-form"
import { OwnerGoalCard, OwnerHomeHeader, TeamTodayCard } from "./owner-home"
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
  const ownerGoalLabel = ownerGoal ? OWNER_GOAL_LABELS[ownerGoal.ownerGoal] : "Not set"

  if (membership) {
    const canEdit = membership.role === OWNER_ADMIN_ROLE

    return (
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-10 px-4 pt-6 pb-16 md:gap-14 md:px-8 md:pt-8">
        <OwnerHomeHeader
          companyName={membership.companyName}
          role={membership.role}
          actions={<SignOutButton />}
        />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <TeamTodayCard
            currentDjCount={teamToday == null ? null : teamToday.currentDjCount}
            desiredDjCount={teamToday == null ? null : teamToday.desiredDjCount}
            editor={
              canEdit ? (
                <div
                  key={`team-today:${membership.companyId}:${teamToday == null ? "" : teamToday.currentDjCount}:${teamToday?.desiredDjCount ?? ""}`}
                  className="flex flex-col gap-6"
                >
                  <TeamTodayForm
                    currentDjCount={teamToday == null ? null : teamToday.currentDjCount}
                  />
                  <DesiredDjCountForm desiredDjCount={teamToday?.desiredDjCount ?? null} />
                </div>
              ) : undefined
            }
          />
          <OwnerGoalCard
            goalLabel={ownerGoalLabel}
            goalOther={
              ownerGoal?.ownerGoal === "other" && ownerGoal.ownerGoalOther
                ? ownerGoal.ownerGoalOther
                : null
            }
            editor={
              canEdit ? (
                <OwnerGoalForm
                  key={`owner-goal:${membership.companyId}:${ownerGoal?.ownerGoal ?? ""}:${ownerGoal?.ownerGoalOther ?? ""}`}
                  ownerGoal={ownerGoal?.ownerGoal ?? null}
                  ownerGoalOther={ownerGoal?.ownerGoalOther ?? null}
                />
              ) : undefined
            }
          />
        </div>
      </main>
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
