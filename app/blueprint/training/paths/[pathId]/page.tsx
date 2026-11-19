import Link from "next/link"
import { notFound } from "next/navigation"

import { StatusTag } from "@/components/blueprint"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { currentDraft, currentPublished, versionStatusLabel } from "@/lib/blueprint/training-library"
import { loadCompanyCourses, loadCompanyPath } from "@/lib/blueprint/training-library-store"
import { createClient } from "@/lib/supabase/server"
import { PathEditorForm } from "../../../../training-library-forms"
import { BlueprintShell } from "../../../blueprint-ui"

export default async function PathEditorPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const [path, courses] = await Promise.all([
    loadCompanyPath(supabase, membership.companyId, pathId),
    loadCompanyCourses(supabase, membership.companyId),
  ])
  if (!path) notFound()
  const editor = currentDraft(path.versions) ?? currentPublished(path.versions)
  if (!editor) notFound()

  return (
    <BlueprintShell>
      <section className="flex flex-col gap-3 pt-7 md:pt-12">
        <Link href="/blueprint/training" className="bp-link self-start font-bold">
          Back to training library
        </Link>
        <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
          data-path-status={currentDraft(path.versions)?.status ?? editor.status}
          data-path-role={editor.content.intendedRole}
        >
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{editor.content.title}</h1>
          <StatusTag
            status={path.libraryStatus === "archived" ? "planned" : editor.status === "published" && !currentDraft(path.versions) ? "proven" : "progress"}
            label={versionStatusLabel(currentDraft(path.versions)?.status ?? editor.status, path.libraryStatus)}
          />
        </div>
      </section>
      <PathEditorForm
        pathId={path.id}
        content={editor.content}
        courses={courses}
        hasDraft={Boolean(currentDraft(path.versions))}
      />
    </BlueprintShell>
  )
}
