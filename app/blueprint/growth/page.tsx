import { buildGrowthPlanning, storedGrowthFromRow } from "@/lib/blueprint/growth"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { getCurrentGrowthPlanning } from "@/lib/blueprint/queries"

import { BlueprintShell } from "../blueprint-ui"
import { GrowthPlanningView } from "../growth-ui"

export default async function GrowthPlanningPage() {
  const membership = await requireGuidedOwner()
  const { context, resolved } = await loadGuidedBlueprint()
  const stored = storedGrowthFromRow(await getCurrentGrowthPlanning())

  return (
    <BlueprintShell>
      <GrowthPlanningView
        companyName={membership.companyName}
        view={buildGrowthPlanning(context, resolved, stored)}
      />
    </BlueprintShell>
  )
}
