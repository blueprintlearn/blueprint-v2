import { ApplicantsBoardView } from "@/app/blueprint/applicants-ui"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { buildApplicantBoard, filterApplicantCards } from "@/lib/blueprint/applicants"
import { loadApplicantCards } from "@/lib/blueprint/applicant-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { createClient } from "@/lib/supabase/server"

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; campaign?: string }>
}) {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const params = await searchParams
  const query = typeof params.q === "string" ? params.q : ""
  const campaignId = typeof params.campaign === "string" ? params.campaign : ""
  const supabase = await createClient()
  const cards = await loadApplicantCards(supabase, membership.companyId)
  const board = buildApplicantBoard(filterApplicantCards(cards, query, campaignId))
  return (
    <BlueprintShell>
      <ApplicantsBoardView
        companyName={membership.companyName}
        board={{ ...board, campaigns: buildApplicantBoard(cards).campaigns }}
        query={query}
        campaignId={campaignId}
      />
    </BlueprintShell>
  )
}
