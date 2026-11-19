import { buildRecruitView, currentGrowthForRecruitment } from "@/lib/blueprint/recruitment"
import { loadRecruitmentRows, syncApprovedStrategiesToFingerprint } from "@/lib/blueprint/recruitment-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { getCurrentGrowthPlanning, getCurrentGrowthPlans } from "@/lib/blueprint/queries"
import { createClient } from "@/lib/supabase/server"

import { BlueprintShell } from "../blueprint-ui"
import { RecruitStrategyView } from "../recruit-ui"

export default async function RecruitPage() {
  const membership = await requireGuidedOwner()
  const { context, resolved } = await loadGuidedBlueprint()
  const { growth, stale } = currentGrowthForRecruitment(
    membership.companyId,
    context,
    resolved,
    await getCurrentGrowthPlanning(),
    await getCurrentGrowthPlans(),
  )
  const supabase = await createClient()
  const previewRows = await loadRecruitmentRows(supabase, membership.companyId)
  const preview = buildRecruitView(context, resolved, growth, previewRows, { growthStale: stale })
  await syncApprovedStrategiesToFingerprint(supabase, membership.companyId, preview.fingerprint)
  const rows = await loadRecruitmentRows(supabase, membership.companyId)

  return (
    <BlueprintShell>
      <RecruitStrategyView
        companyName={membership.companyName}
        view={buildRecruitView(context, resolved, growth, rows, { growthStale: stale })}
      />
    </BlueprintShell>
  )
}
