import Link from "next/link"
import { notFound } from "next/navigation"

import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { currentDraft, currentPublished } from "@/lib/blueprint/training-library"
import { loadCompanyCourse } from "@/lib/blueprint/training-library-store"
import { createClient } from "@/lib/supabase/server"
import { AddBlockForm, LessonEditorForm, MoveBlockForm, RemoveBlockForm } from "../../../../../../training-library-forms"
import { BlueprintShell } from "../../../../../blueprint-ui"

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const course = await loadCompanyCourse(supabase, membership.companyId, courseId)
  if (!course) notFound()
  const editor = currentDraft(course.versions) ?? currentPublished(course.versions)
  const lesson = editor?.content.lessons.find((item) => item.id === lessonId)
  if (!lesson) notFound()

  return (
    <BlueprintShell>
      <section className="flex flex-col gap-3 pt-7 md:pt-12">
        <Link href={`/blueprint/training/courses/${course.id}`} className="bp-link self-start font-bold">
          Back to course
        </Link>
        <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{lesson.title}</h1>
        <p className="m-0 max-w-[620px] text-[14px] text-muted">
          Add text, video, images, downloads, quizzes, or assignments in any order. Grading and submissions come later.
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        {lesson.blocks.map((block) => (
          <div key={block.id} className="flex flex-wrap gap-2">
            <MoveBlockForm courseId={course.id} lessonId={lesson.id} blockId={block.id} direction="up" />
            <MoveBlockForm courseId={course.id} lessonId={lesson.id} blockId={block.id} direction="down" />
            <RemoveBlockForm courseId={course.id} lessonId={lesson.id} blockId={block.id} />
          </div>
        ))}
      </div>
      <LessonEditorForm courseId={course.id} lesson={lesson} />
      <AddBlockForm courseId={course.id} lessonId={lesson.id} />
    </BlueprintShell>
  )
}
