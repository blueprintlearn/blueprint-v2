import { notFound } from "next/navigation"

import { JoinRecruitingPage } from "@/app/join-page-ui"
import { buildRecruitingView, materialsFromEditor } from "@/lib/blueprint/recruiting"
import { loadCurrentRecruitmentHandoff } from "@/lib/blueprint/recruiting-actions"
import { loadRecruitingRows } from "@/lib/blueprint/recruiting-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { createClient } from "@/lib/supabase/server"

export default async function RecruitingPreviewPage() {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const handoff = await loadCurrentRecruitmentHandoff(membership.companyId)
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, membership.companyId)
  const view = buildRecruitingView({ companyName: membership.companyName, handoff, rows })
  if (!view.editor) notFound()
  const materials = materialsFromEditor(view.editor)
  return <JoinRecruitingPage page={materials.page} preview />
}
