import { ApplicantsBoardView } from "@/app/blueprint/applicants-ui"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { buildApplicantBoard, filterApplicantCards } from "@/lib/blueprint/applicants"
import { loadApplicantCards } from "@/lib/blueprint/applicant-store"
import { parseApplicantReviewFilters } from "@/lib/blueprint/candidate-review"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { createClient } from "@/lib/supabase/server"

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; campaign?: string; stage?: string; review?: string; followup?: string }>
}) {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const params = await searchParams
  const filters = parseApplicantReviewFilters(params)
  const supabase = await createClient()
  const cards = await loadApplicantCards(supabase, membership.companyId)
  const board = buildApplicantBoard(
    filterApplicantCards(cards, filters.query, filters.campaignId, {
      stage: filters.stage,
      review: filters.review,
      followUp: filters.followUp,
    }),
  )
  return (
    <BlueprintShell>
      <ApplicantsBoardView
        companyName={membership.companyName}
        board={{ ...board, campaigns: buildApplicantBoard(cards).campaigns }}
        query={filters.query}
        campaignId={filters.campaignId}
        stage={filters.stage}
        review={filters.review}
        followUp={filters.followUp}
      />
    </BlueprintShell>
  )
}
