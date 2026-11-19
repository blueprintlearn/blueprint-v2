import { notFound } from "next/navigation"

import { ApplicantProfileView } from "@/app/blueprint/applicant-profile-ui"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { loadApplicantProfile } from "@/lib/blueprint/applicant-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { interviewTranscribeMode } from "@/lib/blueprint/interview-process"
import { processOwnerInterview, shouldProcessInterview } from "@/lib/blueprint/interview-store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function ApplicantProfilePage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const { applicationId } = await params
  const supabase = await createClient()
  let profile = await loadApplicantProfile(supabase, membership.companyId, applicationId)
  if (!profile) notFound()
  if (profile.interview && shouldProcessInterview(profile.interview)) {
    const processed = await processOwnerInterview(
      supabase,
      membership.companyId,
      profile.interview.id,
      interviewTranscribeMode(),
    )
    if (processed.error) console.error("interview process", processed.error)
    profile = (await loadApplicantProfile(supabase, membership.companyId, applicationId)) ?? profile
  }
  return (
    <BlueprintShell>
      <ApplicantProfileView companyName={membership.companyName} profile={profile} />
    </BlueprintShell>
  )
}
