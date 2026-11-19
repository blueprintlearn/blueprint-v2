import { buildRecruitingView } from "@/lib/blueprint/recruiting"
import { loadCurrentRecruitmentHandoff } from "@/lib/blueprint/recruiting-actions"
import { loadRecruitingRows } from "@/lib/blueprint/recruiting-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { createClient } from "@/lib/supabase/server"

import { BlueprintShell } from "../blueprint-ui"
import { RecruitingMaterialsView } from "../recruiting-ui"

export default async function RecruitingPage() {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const handoff = await loadCurrentRecruitmentHandoff(membership.companyId)
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, membership.companyId)

  return (
    <BlueprintShell>
      <RecruitingMaterialsView
        companyName={membership.companyName}
        view={buildRecruitingView({ companyName: membership.companyName, handoff, rows })}
      />
    </BlueprintShell>
  )
}
