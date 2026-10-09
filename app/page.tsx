import { getCurrentOwnerGoal } from "@/lib/blueprint/queries"
import { OWNER_GOAL_LABELS } from "@/lib/blueprint/goals"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import { AuthLinks } from "./auth-links"
import { CreateCompanyForm } from "./create-company-form"
import { OwnerGoalForm } from "./owner-goal-form"
import { SignOutButton } from "./sign-out-button"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const membership = signedIn ? await getCurrentMembership() : null
  const ownerGoal = membership ? await getCurrentOwnerGoal() : null
  const ownerGoalLabel = ownerGoal ? OWNER_GOAL_LABELS[ownerGoal.ownerGoal] : "Not set"

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Blueprint</h1>

      {!signedIn ? (
        <>
          <p>Sign in or create an account to start a company.</p>
          <AuthLinks />
        </>
      ) : membership ? (
        <>
          <p>
            Company: <strong>{membership.companyName}</strong>
          </p>
          <p>
            Role: <strong>{membership.role}</strong>
          </p>
          <p>
            Owner goal: <strong>{ownerGoalLabel}</strong>
            {ownerGoal?.ownerGoal === "other" && ownerGoal.ownerGoalOther
              ? ` (${ownerGoal.ownerGoalOther})`
              : null}
          </p>
          {membership.role === OWNER_ADMIN_ROLE ? (
            <OwnerGoalForm
              ownerGoal={ownerGoal?.ownerGoal ?? null}
              ownerGoalOther={ownerGoal?.ownerGoalOther ?? null}
            />
          ) : null}
          <SignOutButton />
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
