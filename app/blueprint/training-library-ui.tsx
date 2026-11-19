import Link from "next/link"

import { Card, StatusTag } from "@/components/blueprint"
import {
  COURSE_CATEGORY_LABELS,
  COURSE_EXPERIENCE_LABELS,
  currentDraft,
  currentPublished,
  MASTER_VISIBILITY_LABELS,
  PATH_FOCUS_LABELS,
  TRAINING_ENROLLMENT_CLOSED,
  TRAINING_LIBRARY_OPENING,
  TRAINING_LIBRARY_TITLE,
  TRAINING_NO_COURSES,
  TRAINING_NO_PATHS,
  TRAINING_NO_STARTER,
  TRAINING_PATH_OPENING,
  TRAINING_STARTER_HELP,
  TRAINING_UPDATE_AVAILABLE,
  updateAvailable,
  versionStatusLabel,
  type StoredCompanyCourse,
  type StoredMasterCourse,
  type StoredTrainingPath,
} from "@/lib/blueprint/training-library"
import {
  AddLessonForm,
  AdoptStarterForm,
  AdoptUpdateForm,
  CreateCourseForm,
  CreatePathForm,
  MoveLessonForm,
  RemoveLessonForm,
} from "../training-library-forms"

function minutesLabel(minutes: number) {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`
}

export function TrainingLibraryView({
  companyName,
  courses,
  starter,
  paths,
  latestMasterVersions,
}: {
  companyName: string
  courses: StoredCompanyCourse[]
  starter: StoredMasterCourse[]
  paths: StoredTrainingPath[]
  latestMasterVersions: Record<string, number>
}) {
  const active = courses.filter((course) => course.libraryStatus === "active")
  const archived = courses.filter((course) => course.libraryStatus === "archived")
  const activePaths = paths.filter((path) => path.libraryStatus === "active")
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-training-library="company">
        <div className="flex flex-wrap gap-4">
          <Link href="/blueprint" className="bp-link self-start font-bold">
            Back to your Blueprint
          </Link>
          <Link href="/blueprint/applicants" className="bp-link self-start font-bold">
            Review applicants
          </Link>
        </div>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{TRAINING_LIBRARY_TITLE}</h1>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{TRAINING_LIBRARY_OPENING}</p>
        <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_ENROLLMENT_CLOSED}</p>
      </section>

      <div data-training-section="courses">
      <Card as="section" tone="lavender" aria-labelledby="company-courses-title">
        <h2 id="company-courses-title" className="bp-card__title">
          Your courses
        </h2>
        {active.length === 0 ? <p className="bp-card__body">{TRAINING_NO_COURSES}</p> : null}
        <ul className="m-0 grid list-none gap-4 p-0">
          {active.map((course) => {
            const editor = currentDraft(course.versions) ?? currentPublished(course.versions)
            const latest = course.sourceMasterCourseId ? latestMasterVersions[course.sourceMasterCourseId] ?? null : null
            return (
              <li key={course.id} className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/blueprint/training/courses/${course.id}`} className="bp-link font-bold">
                    {course.title}
                  </Link>
                  <StatusTag
                    status={course.libraryStatus === "archived" ? "planned" : editor?.status === "published" ? "proven" : "progress"}
                    label={editor ? versionStatusLabel(editor.status, course.libraryStatus) : "Draft"}
                  />
                </div>
                <p className="m-0 text-[14px] text-muted">
                  {editor
                    ? `${COURSE_CATEGORY_LABELS[editor.content.category]} · ${COURSE_EXPERIENCE_LABELS[editor.content.experienceLevel]} · ${minutesLabel(editor.content.estimatedDurationMinutes)}`
                    : course.origin === "adopted"
                      ? "Copied from Blueprint"
                      : "Created by you"}
                </p>
                {updateAvailable(course, latest) ? (
                  <div className="grid gap-2">
                    <p className="m-0 text-[14px] text-ink-2">{TRAINING_UPDATE_AVAILABLE}</p>
                    <AdoptUpdateForm courseId={course.id} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
        <CreateCourseForm />
        {archived.length > 0 ? (
          <p className="m-0 text-[14px] text-muted">
            Archived: {archived.map((course) => course.title).join(", ")}
          </p>
        ) : null}
      </Card>
      </div>

      <div data-training-starter="catalog">
      <Card as="section" aria-labelledby="starter-library-title">
        <h2 id="starter-library-title" className="bp-card__title">
          Blueprint starter courses
        </h2>
        <p className="bp-card__body">{TRAINING_STARTER_HELP}</p>
        {starter.length === 0 ? <p className="m-0 text-[14px] text-muted">{TRAINING_NO_STARTER}</p> : null}
        <ul className="m-0 grid list-none gap-4 p-0">
          {starter.map((course) => {
            const published = currentPublished(course.versions)
            return (
              <li key={course.id} className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 font-bold text-ink">{course.title}</p>
                  <StatusTag status="proven" label={MASTER_VISIBILITY_LABELS.starter} />
                </div>
                <p className="m-0 text-[14px] text-muted">{published?.content.description || "Approved for Blueprint companies."}</p>
                <AdoptStarterForm masterCourseId={course.id} />
              </li>
            )
          })}
        </ul>
      </Card>
      </div>

      <div data-training-paths="list">
      <Card as="section" aria-labelledby="training-paths-title">
        <h2 id="training-paths-title" className="bp-card__title">
          Training paths
        </h2>
        <p className="bp-card__body">{TRAINING_PATH_OPENING}</p>
        {activePaths.length === 0 ? <p className="m-0 text-[14px] text-muted">{TRAINING_NO_PATHS}</p> : null}
        <ul className="m-0 grid list-none gap-4 p-0">
          {activePaths.map((path) => {
            const editor = currentDraft(path.versions) ?? currentPublished(path.versions)
            return (
              <li key={path.id} className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/blueprint/training/paths/${path.id}`} className="bp-link font-bold">
                    {path.title}
                  </Link>
                  <StatusTag
                    status={editor?.status === "published" ? "proven" : "progress"}
                    label={editor ? versionStatusLabel(editor.status, path.libraryStatus) : "Draft"}
                  />
                </div>
                <p className="m-0 text-[14px] text-muted">
                  {editor ? `${PATH_FOCUS_LABELS[editor.content.focus]} · ${editor.content.intendedRole}` : "Draft path"}
                </p>
              </li>
            )
          })}
        </ul>
        <CreatePathForm />
      </Card>
      </div>
    </>
  )
}

export function CourseLessonsList({
  courseId,
  lessons,
}: {
  courseId: string
  lessons: { id: string; title: string }[]
}) {
  return (
    <section className="grid gap-4" data-course-lessons={courseId}>
      <h2 className="bp-type-heading-m">Lessons</h2>
      <ul className="m-0 grid list-none gap-4 p-0">
        {lessons.map((lesson, index) => (
          <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
            <Link href={`/blueprint/training/courses/${courseId}/lessons/${lesson.id}`} className="bp-link font-bold">
              {index + 1}. {lesson.title}
            </Link>
            <div className="flex flex-wrap gap-2">
              <MoveLessonForm courseId={courseId} lessonId={lesson.id} direction="up" />
              <MoveLessonForm courseId={courseId} lessonId={lesson.id} direction="down" />
              <RemoveLessonForm courseId={courseId} lessonId={lesson.id} />
            </div>
          </li>
        ))}
      </ul>
      <AddLessonForm courseId={courseId} />
    </section>
  )
}
