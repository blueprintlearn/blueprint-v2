import Link from "next/link"

import { Card, StatusTag, TopNav } from "@/components/blueprint"
import {
  currentDraft,
  currentPublished,
  MASTER_VISIBILITY_LABELS,
  TRAINING_MASTER_OPENING,
  TRAINING_MASTER_TITLE,
  versionStatusLabel,
} from "@/lib/blueprint/training-library"
import { loadMasterCourses } from "@/lib/blueprint/training-master-store"
import { requireTrainingPlatformAdmin } from "@/lib/blueprint/training-platform-admin"
import { SignOutButton } from "../sign-out-button"
import { CreateMasterCourseForm } from "../training-admin-forms"

export default async function TrainingAdminPage() {
  const { supabase } = await requireTrainingPlatformAdmin()
  const courses = await loadMasterCourses(supabase)

  return (
    <>
      <TopNav actions={<SignOutButton />} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-4 pb-11 md:gap-12 md:px-8 md:pb-16">
        <section className="flex flex-col gap-3 pt-7 md:pt-12" data-master-library="admin">
          <Link href="/" className="bp-link self-start font-bold">
            Back home
          </Link>
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{TRAINING_MASTER_TITLE}</h1>
          <p className="bp-type-lead max-w-[620px] text-ink-2">{TRAINING_MASTER_OPENING}</p>
        </section>
        <Card as="section" tone="lavender" aria-labelledby="master-courses-title">
          <h2 id="master-courses-title" className="bp-card__title">
            Master courses
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0">
            {courses.map((course) => {
              const editor = currentDraft(course.versions) ?? currentPublished(course.versions)
              return (
                <li key={course.id} className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0" data-master-visibility={course.visibility}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/training-admin/courses/${course.id}`} className="bp-link font-bold">
                      {course.title}
                    </Link>
                    <StatusTag
                      status={course.visibility === "starter" ? "proven" : course.visibility === "archived" ? "planned" : "progress"}
                      label={MASTER_VISIBILITY_LABELS[course.visibility]}
                    />
                  </div>
                  <p className="m-0 text-[14px] text-muted">
                    {editor ? versionStatusLabel(editor.status, "active") : "No version yet"}
                    {course.legacy.sourceId ? ` · Legacy ${course.legacy.sourceId}` : ""}
                  </p>
                </li>
              )
            })}
          </ul>
          <CreateMasterCourseForm />
        </Card>
      </main>
    </>
  )
}
