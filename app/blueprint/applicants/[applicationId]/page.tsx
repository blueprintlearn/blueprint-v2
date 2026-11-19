import { notFound } from "next/navigation"

import { ApplicantProfileView } from "@/app/blueprint/applicant-profile-ui"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { loadApplicantProfile } from "@/lib/blueprint/applicant-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { createClient } from "@/lib/supabase/server"

export default async function ApplicantProfilePage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const { applicationId } = await params
  const supabase = await createClient()
  const profile = await loadApplicantProfile(supabase, membership.companyId, applicationId)
  if (!profile) notFound()
  return (
    <BlueprintShell>
      <ApplicantProfileView companyName={membership.companyName} profile={profile} />
    </BlueprintShell>
  )
}
