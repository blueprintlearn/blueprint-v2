import Link from "next/link"

import { Card, Chip, Fact } from "@/components/blueprint"
import {
  ENROLLMENT_SOURCE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  TRAINING_OPEN_ASSIGNMENT,
  type StoredTrainingEnrollment,
} from "@/lib/blueprint/training-enrollment"
import {
  assignedLessonHref,
  assignedTrainingHref,
  TRAINING_ASSIGNMENT_READONLY,
  TRAINING_BLOCK_LABELS,
  TRAINING_LESSONS_OPEN,
  TRAINING_OPEN_LESSON,
  TRAINING_PATH_FOCUS_LABELS,
  TRAINING_QUIZ_KIND_LABELS,
  TRAINING_QUIZ_READONLY,
  TRAINING_VIEWER_NO_BLOCKS,
  TRAINING_VIEWER_NO_LESSONS,
  TRAINING_VIEWER_PATH_HELP,
  TRAINING_VIEWER_READONLY,
  visibleLessonText,
  type TraineeAssignedView,
  type TraineeContentBlock,
  type TraineeCourseView,
  type TraineeLessonView,
  type TraineePathView,
} from "@/lib/blueprint/training-viewer"

function minutesLabel(minutes: number) {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`
}

function coursesLabel(count: number) {
  return count === 1 ? "1 course" : `${count} courses`
}

function TraineeBlock({ block }: { block: TraineeContentBlock }) {
  return (
    <article className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0" data-training-block={block.type}>
      <Chip tone="lavender">{TRAINING_BLOCK_LABELS[block.type]}</Chip>
      {block.type === "text" ? (
        <p className="m-0 whitespace-pre-wrap text-ink">{visibleLessonText(block.body, block.format)}</p>
      ) : null}
      {block.type === "video" ? (
        <p className="m-0">
          {block.caption ? <span className="block text-ink">{block.caption}</span> : null}
          <a href={block.url} className="bp-link font-bold" rel="noreferrer">
            Open video
          </a>
        </p>
      ) : null}
      {block.type === "image" ? (
        <p className="m-0">
          <span className="block text-ink">{block.alt}</span>
          <a href={block.url} className="bp-link font-bold" rel="noreferrer">
            Open image
          </a>
        </p>
      ) : null}
      {block.type === "resource" ? (
        <p className="m-0">
          <a href={block.url} className="bp-link font-bold" rel="noreferrer">
            {block.label}
          </a>
        </p>
      ) : null}
      {block.type === "quiz" ? (
        <div className="grid gap-3">
          <h3 className="m-0 text-[18px] font-bold text-ink">{block.title}</h3>
          <p className="m-0 text-[14px] text-muted">{TRAINING_QUIZ_READONLY}</p>
          {block.questions.map((question) => (
            <div key={question.id} className="grid gap-2" data-quiz-question={question.id}>
              <p className="m-0 font-bold text-ink">{question.prompt}</p>
              <p className="m-0 text-[13px] text-muted">{TRAINING_QUIZ_KIND_LABELS[question.kind]}</p>
              {question.options.length > 0 ? (
                <ul className="m-0 grid list-none gap-1 p-0">
                  {question.options.map((option) => (
                    <li key={option.id} className="text-ink" data-quiz-option={option.id}>
                      {option.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[14px] text-muted">Written answers cannot be submitted yet.</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {block.type === "assignment" ? (
        <div className="grid gap-2">
          <h3 className="m-0 text-[18px] font-bold text-ink">{block.title}</h3>
          <p className="m-0 whitespace-pre-wrap text-ink">{block.instructions}</p>
          <p className="m-0 text-[14px] text-muted">
            {block.verification === "in_person" ? "Verified in person later." : "Verified online later."}
          </p>
          <p className="m-0 text-[14px] text-muted">{TRAINING_ASSIGNMENT_READONLY}</p>
        </div>
      ) : null}
    </article>
  )
}

export function TraineeAssignmentList({ enrollments }: { enrollments: StoredTrainingEnrollment[] }) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0">
      {enrollments.map((row) => (
        <li key={row.id} className="grid gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0" data-trainee-enrollment={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 font-bold text-ink">{row.contentTitle}</p>
            <Chip tone="mint">{ENROLLMENT_STATUS_LABELS[row.status]}</Chip>
          </div>
          <p className="m-0 text-[14px] text-muted">
            {row.targetKind === "path" ? "Path" : "Course"} v{row.contentVersion} · {ENROLLMENT_SOURCE_LABELS[row.source]}
          </p>
          <p className="m-0">
            <Link href={assignedTrainingHref(row.id)} className="bp-link font-bold">
              {TRAINING_OPEN_ASSIGNMENT}
            </Link>
          </p>
        </li>
      ))}
    </ul>
  )
}

export function TraineeCourseOutline({ view }: { view: TraineeCourseView }) {
  return (
    <>
      <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_VIEWER_READONLY}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Fact label="Assigned version" value={`v${view.version}`} />
        <Fact label="Intended role" value={view.intendedRole} />
        <Fact label="Estimated duration" value={minutesLabel(view.estimatedDurationMinutes)} />
      </div>
      {view.description ? <p className="m-0 max-w-[620px] text-ink-2">{view.description}</p> : null}
      <p className="m-0 text-[14px] text-muted">{TRAINING_LESSONS_OPEN}</p>
      <Card as="section" aria-labelledby="assigned-lessons-title">
        <h2 id="assigned-lessons-title" className="bp-card__title">
          Lessons
        </h2>
        <div data-training-lessons="">
          {view.lessons.length === 0 ? <p className="bp-card__body">{TRAINING_VIEWER_NO_LESSONS}</p> : null}
          <ul className="m-0 grid list-none gap-4 p-0">
            {view.lessons.map((lesson) => (
              <li key={lesson.id} className="grid gap-1 border-t border-line pt-4 first:border-t-0 first:pt-0" data-training-lesson={lesson.id}>
                <p className="m-0 font-bold text-ink">{lesson.title}</p>
                {lesson.description ? <p className="m-0 text-[14px] text-muted">{lesson.description}</p> : null}
                <p className="m-0">
                  <Link href={assignedLessonHref(view.enrollmentId, lesson.id)} className="bp-link font-bold">
                    {TRAINING_OPEN_LESSON}: {lesson.title}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </>
  )
}

export function TraineePathOutline({ view }: { view: TraineePathView }) {
  return (
    <>
      <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_VIEWER_READONLY}</p>
      <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_VIEWER_PATH_HELP}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Fact label="Assigned version" value={`v${view.version}`} />
        <Fact label="Intended role" value={view.intendedRole} />
        <Fact label="Focus" value={TRAINING_PATH_FOCUS_LABELS[view.focus]} />
      </div>
      {view.description ? <p className="m-0 max-w-[620px] text-ink-2">{view.description}</p> : null}
      <Fact label="Courses in this path" value={coursesLabel(view.courseCount)} />
    </>
  )
}

export function TraineeAssignedView({ view }: { view: TraineeAssignedView }) {
  return (
    <div data-training-viewer={view.kind} data-training-version={view.version}>
      {view.kind === "course" ? <TraineeCourseOutline view={view} /> : <TraineePathOutline view={view} />}
    </div>
  )
}

export function TraineeLessonView({
  course,
  lesson,
}: {
  course: TraineeCourseView
  lesson: TraineeLessonView
}) {
  return (
    <div data-training-lesson-view={lesson.id}>
      <p className="m-0 max-w-[620px] text-[14px] text-muted">{TRAINING_VIEWER_READONLY}</p>
      {lesson.description ? <p className="m-0 max-w-[620px] text-ink-2">{lesson.description}</p> : null}
      <Card as="section" aria-labelledby="lesson-blocks-title">
        <h2 id="lesson-blocks-title" className="bp-card__title">
          Lesson content
        </h2>
        <div data-training-blocks="">
          {lesson.blocks.length === 0 ? <p className="bp-card__body">{TRAINING_VIEWER_NO_BLOCKS}</p> : null}
          <div className="grid gap-4">
            {lesson.blocks.map((block) => (
              <TraineeBlock key={block.id} block={block} />
            ))}
          </div>
        </div>
      </Card>
      <p className="m-0">
        <Link href={assignedTrainingHref(course.enrollmentId)} className="bp-link font-bold">
          Back to {course.title}
        </Link>
      </p>
    </div>
  )
}
