import { getCurrentOwnerGoal, getCurrentTeamToday } from "@/lib/blueprint/queries"
import { OWNER_GOAL_LABELS } from "@/lib/blueprint/goals"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import { AuthLinks } from "./auth-links"
import { CreateCompanyForm } from "./create-company-form"
import { DesiredDjCountForm } from "./desired-dj-count-form"
import { OwnerGoalForm } from "./owner-goal-form"
import { TeamTodayForm } from "./team-today-form"
import { panelClassName } from "./ui"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const membership = signedIn ? await getCurrentMembership() : null
  const ownerGoal = membership ? await getCurrentOwnerGoal() : null
  const teamToday = membership ? await getCurrentTeamToday() : null
  const ownerGoalLabel = ownerGoal ? OWNER_GOAL_LABELS[ownerGoal.ownerGoal] : "Not set"

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-mute">
          Company operating system
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Blueprint</h1>
      </div>

      {!signedIn ? (
        <section className={panelClassName}>
          <p>Sign in or create an account to start a company.</p>
          <AuthLinks />
        </section>
      ) : membership ? (
        <>
          <section className={panelClassName}>
            <p>
              Company: <strong>{membership.companyName}</strong>
            </p>
            <p>
              Role: <strong>{membership.role}</strong>
            </p>
            <p>
              DJs today:{" "}
              <strong>{teamToday == null ? "Not set" : teamToday.currentDjCount}</strong>
            </p>
            <p>
              Desired DJs:{" "}
              <strong>
                {teamToday == null || teamToday.desiredDjCount == null
                  ? "Not set"
                  : teamToday.desiredDjCount}
              </strong>
            </p>
            <p>
              Owner goal: <strong>{ownerGoalLabel}</strong>
              {ownerGoal?.ownerGoal === "other" && ownerGoal.ownerGoalOther
                ? ` (${ownerGoal.ownerGoalOther})`
                : null}
            </p>
          </section>
          {membership.role === OWNER_ADMIN_ROLE ? (
            <section className={panelClassName}>
              <div
                key={`team-today:${membership.companyId}:${teamToday == null ? "" : teamToday.currentDjCount}:${teamToday?.desiredDjCount ?? ""}`}
                className="flex flex-col gap-6"
              >
                <TeamTodayForm
                  currentDjCount={teamToday == null ? null : teamToday.currentDjCount}
                />
                <DesiredDjCountForm desiredDjCount={teamToday?.desiredDjCount ?? null} />
              </div>
              <OwnerGoalForm
                key={`owner-goal:${membership.companyId}:${ownerGoal?.ownerGoal ?? ""}:${ownerGoal?.ownerGoalOther ?? ""}`}
                ownerGoal={ownerGoal?.ownerGoal ?? null}
                ownerGoalOther={ownerGoal?.ownerGoalOther ?? null}
              />
            </section>
          ) : null}
        </>
      ) : (
        <section className={panelClassName}>
          <p>You do not belong to a company yet.</p>
          <CreateCompanyForm />
        </section>
      )}
    </main>
  )
}
