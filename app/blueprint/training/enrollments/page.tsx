import { TrainingEnrollmentView } from "@/app/blueprint/training-enrollment-ui"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { recommendTrainingLibrarySelection, publishedEnrollmentTargets } from "@/lib/blueprint/training-enrollment"
import {
  loadAwaitingHandoffs,
  loadCompanyEnrollments,
  loadCompanyStaffForTraining,
} from "@/lib/blueprint/training-enrollment-store"
import { TRAINING_HANDOFF_CONTRACT_VERSION, STAGE4_TRAINING_DESTINATION } from "@/lib/blueprint/training-preparation-handoff"
import type { TrainingApproach, TrainingExperienceLevel } from "@/lib/blueprint/training-preparation"
import { loadCompanyCourses, loadCompanyPaths } from "@/lib/blueprint/training-library-store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function TrainingEnrollmentPage() {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const [courses, paths, enrollments, staff, awaiting] = await Promise.all([
    loadCompanyCourses(supabase, membership.companyId),
    loadCompanyPaths(supabase, membership.companyId),
    loadCompanyEnrollments(supabase, membership.companyId),
    loadCompanyStaffForTraining(supabase, membership.companyId),
    loadAwaitingHandoffs(supabase, membership.companyId),
  ])
  const library = { courses, paths }
  const recommendations = Object.fromEntries(
    awaiting.map((row) => [
      row.preparationId,
      recommendTrainingLibrarySelection(
        {
          contractVersion: TRAINING_HANDOFF_CONTRACT_VERSION,
          companyId: membership.companyId,
          applicantId: row.applicantId,
          applicationId: row.applicationId,
          preparationId: row.preparationId,
          approvedVersion: row.approvedVersion,
          intendedRole: row.intendedRole,
          trainingApproach: row.trainingApproach as TrainingApproach,
          experienceLevel: "custom" as TrainingExperienceLevel,
          startingGoals: [],
          demonstratedSkills: [],
          skillsRequiringVerification: [],
          plannedStartDate: null,
          ownerApproval: { approvedBy: "", approvedAt: "" },
          nextStepDestination: STAGE4_TRAINING_DESTINATION,
        },
        library,
      ),
    ]),
  )
  return (
    <BlueprintShell>
      <TrainingEnrollmentView
        companyName={membership.companyName}
        awaiting={awaiting}
        staff={staff}
        enrollments={enrollments}
        targets={publishedEnrollmentTargets(library)}
        recommendations={recommendations}
      />
    </BlueprintShell>
  )
}
