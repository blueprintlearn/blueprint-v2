import { buildBusinessFindings } from "@/lib/blueprint/findings"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"

import { BusinessFindingsView } from "../findings-ui"
import { BlueprintShell } from "../blueprint-ui"

export default async function BusinessFindingsPage() {
  const membership = await requireGuidedOwner()
  const { context, resolved } = await loadGuidedBlueprint()

  return (
    <BlueprintShell>
      <BusinessFindingsView
        companyName={membership.companyName}
        findings={buildBusinessFindings(context, resolved)}
      />
    </BlueprintShell>
  )
}
