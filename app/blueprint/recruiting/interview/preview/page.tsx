import { InterviewApplicantView } from "@/app/interview-page-ui"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { DEFAULT_INTERVIEW_QUESTIONS } from "@/lib/blueprint/interviews"
import { loadInterviewTemplate } from "@/lib/blueprint/interview-store"
import { loadRecruitingRows } from "@/lib/blueprint/recruiting-store"
import { createClient } from "@/lib/supabase/server"

export default async function InterviewPreviewPage() {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, membership.companyId)
  const published = rows.find((row) => row.status === "published") ?? rows.find((row) => row.status === "unpublished")
  const slug = published?.slug ?? "company-campaign"
  const saved = await loadInterviewTemplate(supabase, membership.companyId, slug)
  const questions = saved?.questions ?? DEFAULT_INTERVIEW_QUESTIONS
  return (
    <InterviewApplicantView
      preview
      session={{
        interviewId: "preview",
        tokenHash: "preview",
        status: "opened",
        companyName: membership.companyName,
        roleTitle: "DJ",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        submittedAt: null,
        questions,
        acceptedIndexes: [],
      }}
    />
  )
}
