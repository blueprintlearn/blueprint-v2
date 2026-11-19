import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { currentPublished } from "@/lib/blueprint/training-library"
import { loadCompanyCourses, loadCompanyPaths, loadStarterCatalog } from "@/lib/blueprint/training-library-store"
import { createClient } from "@/lib/supabase/server"

import { BlueprintShell } from "../blueprint-ui"
import { TrainingLibraryView } from "../training-library-ui"

export default async function TrainingLibraryPage() {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const [courses, starter, paths] = await Promise.all([
    loadCompanyCourses(supabase, membership.companyId),
    loadStarterCatalog(supabase),
    loadCompanyPaths(supabase, membership.companyId),
  ])
  const latestMasterVersions = Object.fromEntries(
    starter.map((course) => [course.id, currentPublished(course.versions)?.version ?? 0]),
  )

  return (
    <BlueprintShell>
      <TrainingLibraryView
        companyName={membership.companyName}
        courses={courses}
        starter={starter}
        paths={paths}
        latestMasterVersions={latestMasterVersions}
      />
    </BlueprintShell>
  )
}
