import Link from "next/link"
import { notFound } from "next/navigation"

import { Card, StatusTag } from "@/components/blueprint"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import {
  currentDraft,
  currentPublished,
  TRAINING_ENROLLMENT_CLOSED,
  TRAINING_UPDATE_AVAILABLE,
  updateAvailable,
  versionStatusLabel,
} from "@/lib/blueprint/training-library"
import { loadCompanyCourse, loadStarterCatalog } from "@/lib/blueprint/training-library-store"
import { createClient } from "@/lib/supabase/server"
import { AdoptUpdateForm, CourseEditorForm } from "../../../../training-library-forms"
import { BlueprintShell } from "../../../blueprint-ui"
import { CourseLessonsList } from "../../../training-library-ui"

export default async function CourseEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const course = await loadCompanyCourse(supabase, membership.companyId, courseId)
  if (!course) notFound()
  const editor = currentDraft(course.versions) ?? currentPublished(course.versions)
  if (!editor) notFound()
  const starter = await loadStarterCatalog(supabase)
  const latest = course.sourceMasterCourseId
    ? currentPublished(starter.find((item) => item.id === course.sourceMasterCourseId)?.versions ?? [])?.version ?? null
    : null

  return (
    <BlueprintShell>
      <section className="flex flex-col gap-3 pt-7 md:pt-12">
        <Link href="/blueprint/training" className="bp-link self-start font-bold">
          Back to training library
        </Link>
        <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{editor.content.title}</h1>
          <StatusTag
            status={course.libraryStatus === "archived" ? "planned" : editor.status === "published" && !currentDraft(course.versions) ? "proven" : "progress"}
            label={versionStatusLabel(currentDraft(course.versions)?.status ?? editor.status, course.libraryStatus)}
          />
        </div>
        <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_ENROLLMENT_CLOSED}</p>
        {updateAvailable(course, latest) ? (
          <Card as="section" tone="butter" aria-labelledby="course-update-title">
            <h2 id="course-update-title" className="bp-card__title">
              Update available
            </h2>
            <p className="bp-card__body">{TRAINING_UPDATE_AVAILABLE}</p>
            <AdoptUpdateForm courseId={course.id} />
          </Card>
        ) : null}
      </section>
      <CourseEditorForm courseId={course.id} content={editor.content} hasDraft={Boolean(currentDraft(course.versions))} />
      <CourseLessonsList
        courseId={course.id}
        lessons={editor.content.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title }))}
      />
    </BlueprintShell>
  )
}
