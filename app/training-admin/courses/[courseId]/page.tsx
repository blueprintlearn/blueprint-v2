import Link from "next/link"
import { notFound } from "next/navigation"

import { StatusTag, TopNav } from "@/components/blueprint"
import { currentDraft, currentPublished, MASTER_VISIBILITY_LABELS, versionStatusLabel } from "@/lib/blueprint/training-library"
import { loadMasterCourse } from "@/lib/blueprint/training-master-store"
import { requireTrainingPlatformAdmin } from "@/lib/blueprint/training-platform-admin"
import { SignOutButton } from "../../../sign-out-button"
import {
  AddMasterLessonForm,
  MasterCourseEditorForm,
  MasterLessonEditor,
  MoveMasterLessonForm,
  RemoveMasterLessonForm,
} from "../../../training-admin-forms"

export default async function TrainingAdminCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const { supabase } = await requireTrainingPlatformAdmin()
  const course = await loadMasterCourse(supabase, courseId)
  if (!course) notFound()
  const editor = currentDraft(course.versions) ?? currentPublished(course.versions)
  if (!editor) notFound()

  return (
    <>
      <TopNav actions={<SignOutButton />} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-4 pb-11 md:gap-12 md:px-8 md:pb-16">
        <section className="flex flex-col gap-3 pt-7 md:pt-12">
          <Link href="/training-admin" className="bp-link self-start font-bold">
            Back to master library
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{editor.content.title}</h1>
            <StatusTag
              status={course.visibility === "starter" ? "proven" : course.visibility === "archived" ? "planned" : "progress"}
              label={MASTER_VISIBILITY_LABELS[course.visibility]}
            />
            <StatusTag
              status={editor.status === "published" && !currentDraft(course.versions) ? "proven" : "progress"}
              label={versionStatusLabel(currentDraft(course.versions)?.status ?? editor.status, "active")}
            />
          </div>
        </section>
        <MasterCourseEditorForm
          courseId={course.id}
          content={editor.content}
          visibility={course.visibility}
          hasDraft={Boolean(currentDraft(course.versions))}
        />
        <section className="grid gap-4" data-master-lessons={course.id}>
          <h2 className="bp-type-heading-m">Lessons</h2>
          <ul className="m-0 grid list-none gap-4 p-0">
            {editor.content.lessons.map((lesson, index) => (
              <li key={lesson.id} className="grid gap-4 border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 font-bold text-ink">
                    {index + 1}. {lesson.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <MoveMasterLessonForm courseId={course.id} lessonId={lesson.id} direction="up" />
                    <MoveMasterLessonForm courseId={course.id} lessonId={lesson.id} direction="down" />
                    <RemoveMasterLessonForm courseId={course.id} lessonId={lesson.id} />
                  </div>
                </div>
                <MasterLessonEditor courseId={course.id} lesson={lesson} />
              </li>
            ))}
          </ul>
          <AddMasterLessonForm courseId={course.id} />
        </section>
      </main>
    </>
  )
}
