import type { Metadata } from "next"

export const dynamic = "force-dynamic"

import { InterviewApplicantView, InterviewUnavailable } from "@/app/interview-page-ui"
import { loadPublicInterview } from "@/lib/blueprint/interview-actions"

type InterviewParams = { token: string }

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Video interview" }
}

export default async function PublicInterviewPage({ params }: { params: Promise<InterviewParams> }) {
  const { token } = await params
  const loaded = await loadPublicInterview(token)
  if (!loaded.ok) {
    return (
      <InterviewUnavailable
        reason={loaded.error === "expired" ? "expired" : loaded.error === "unavailable" ? "unavailable" : "invalid"}
      />
    )
  }
  return <InterviewApplicantView token={token} session={loaded.session} />
}
