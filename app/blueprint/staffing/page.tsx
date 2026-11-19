import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { buildStaffingAnalysis } from "@/lib/blueprint/staffing"

import { BlueprintShell } from "../blueprint-ui"
import { StaffingDemandView } from "../staffing-ui"

export default async function StaffingDemandPage() {
  const membership = await requireGuidedOwner()
  const { context, resolved } = await loadGuidedBlueprint()

  return (
    <BlueprintShell>
      <StaffingDemandView companyName={membership.companyName} view={buildStaffingAnalysis(context, resolved)} />
    </BlueprintShell>
  )
}
