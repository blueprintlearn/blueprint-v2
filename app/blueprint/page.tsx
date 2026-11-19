import { findingsAreCurrent } from "@/lib/blueprint/findings"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"

import { BlueprintOverview, BlueprintShell } from "./blueprint-ui"

export default async function BlueprintOverviewPage() {
  const membership = await requireGuidedOwner()
  const { progress, context } = await loadGuidedBlueprint()

  return (
    <BlueprintShell>
      <BlueprintOverview
        companyName={membership.companyName}
        progress={progress}
        findingsReady={findingsAreCurrent(context)}
      />
    </BlueprintShell>
  )
}
