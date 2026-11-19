import { storedGrowthFromRow } from "@/lib/blueprint/growth"
import { buildGrowthPlanView, composeProposedPlan, storedPlanFromRow } from "@/lib/blueprint/growth-plan"
import { syncApprovedPlansToFingerprint } from "@/lib/blueprint/growth-plan-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { getCurrentGrowthPlanning, getCurrentGrowthPlans } from "@/lib/blueprint/queries"
import { createClient } from "@/lib/supabase/server"

import { BlueprintShell } from "../blueprint-ui"
import { GrowthPlanView } from "../growth-plan-ui"

export default async function GrowthPlanPage() {
  const membership = await requireGuidedOwner()
  const { context, resolved } = await loadGuidedBlueprint()
  const storedPlanning = storedGrowthFromRow(await getCurrentGrowthPlanning())
  const composed = composeProposedPlan(context, resolved, storedPlanning)
  if (composed) {
    const supabase = await createClient()
    await syncApprovedPlansToFingerprint(supabase, membership.companyId, composed.fingerprint)
  }
  const rows = (await getCurrentGrowthPlans())
    .map((row) => storedPlanFromRow(row))
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return (
    <BlueprintShell>
      <GrowthPlanView
        companyName={membership.companyName}
        view={buildGrowthPlanView(context, resolved, storedPlanning, rows)}
      />
    </BlueprintShell>
  )
}
