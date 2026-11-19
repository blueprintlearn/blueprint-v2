"use client"

import { useEffect, useRef } from "react"

import { Button, NumberField, SaveStatus, Select, TextArea, TextField } from "@/components/blueprint"
import {
  addCourseLessonAction,
  addLessonBlockAction,
  addPathCourseAction,
  adoptMasterUpdateAction,
  adoptStarterCourseAction,
  archiveCompanyCourseAction,
  archiveTrainingPathAction,
  createCompanyCourseAction,
  createTrainingPathAction,
  moveCourseLessonAction,
  moveLessonBlockAction,
  publishCompanyCourseAction,
  publishTrainingPathAction,
  removeCourseLessonAction,
  removeLessonBlockAction,
  saveCompanyCourseAction,
  saveCourseLessonAction,
  saveTrainingPathAction,
} from "@/lib/blueprint/training-library-actions"
import {
  ASSIGNMENT_APPROVAL_MODES,
  CERTIFICATION_LABELS,
  CERTIFICATION_REQUIREMENTS,
  CONTENT_BLOCK_LABELS,
  CONTENT_BLOCK_TYPES,
  COURSE_CATEGORIES,
  COURSE_CATEGORY_LABELS,
  COURSE_EXPERIENCE_LABELS,
  COURSE_EXPERIENCE_LEVELS,
  LESSON_ACCESS_LABELS,
  LESSON_ACCESS_MODES,
  PATH_FOCUS_LABELS,
  PATH_FOCUS_VALUES,
  QUIZ_QUESTION_LABELS,
  QUIZ_QUESTION_KINDS,
  SUBMISSION_MODES,
  TRAINING_ADOPT_STARTER,
  TRAINING_ADOPT_UPDATE,
  TRAINING_ARCHIVE_HELP,
  TRAINING_CREATE_COURSE,
  TRAINING_CREATE_PATH,
  TRAINING_PATH_PUBLISH_CONFIRM_LABEL,
  TRAINING_PUBLISH_CONFIRM_LABEL,
  TRAINING_PUBLISH_HELP,
  WRITTEN_FEEDBACK_MODES,
  type ContentBlock,
  type CourseContent,
  type LessonContent,
  type PathContent,
  type QuizBlock,
  type StoredCompanyCourse,
} from "@/lib/blueprint/training-library"
import { useSaveForm } from "./use-save-form"

function useReloadWhenSaved(saveState: string) {
  const reloaded = useRef(false)
  useEffect(() => {
    if (saveState === "saved" && !reloaded.current) {
      reloaded.current = true
      window.location.reload()
    }
    if (saveState !== "saved") reloaded.current = false
  }, [saveState])
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p className="m-0 text-[14px] text-danger" role="alert">
      {error}
    </p>
  )
}

export function CreateCourseForm() {
  const { error, pending, saveState, formProps } = useSaveForm(createCompanyCourseAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="grid gap-3" data-training-form="create-course">
      <TextField id="new-course-title" name="title" label="New course title" defaultValue="Untitled course" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {TRAINING_CREATE_COURSE}
        </Button>
        <SaveStatus state={saveState} />
      </div>
      <ErrorText error={error} />
    </form>
  )
}

export function AdoptStarterForm({ masterCourseId }: { masterCourseId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(adoptStarterCourseAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="grid gap-2" data-training-form="adopt-starter">
      <input type="hidden" name="masterCourseId" value={masterCourseId} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {TRAINING_ADOPT_STARTER}
        </Button>
        <SaveStatus state={saveState} />
      </div>
      <ErrorText error={error} />
    </form>
  )
}

export function AdoptUpdateForm({ courseId }: { courseId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(adoptMasterUpdateAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="grid gap-2" data-training-form="adopt-update">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {TRAINING_ADOPT_UPDATE}
        </Button>
        <SaveStatus state={saveState} />
      </div>
      <ErrorText error={error} />
    </form>
  )
}

export function CourseMetadataFields({ content }: { content: CourseContent }) {
  return (
    <div className="grid gap-5">
      <TextField id="title" name="title" label="Course title" defaultValue={content.title} />
      <TextArea id="description" name="description" label="Description" optional rows={4} defaultValue={content.description} />
      <Select
        id="category"
        name="category"
        label="Category"
        options={COURSE_CATEGORIES.map((value) => ({ value, label: COURSE_CATEGORY_LABELS[value] }))}
        defaultValue={content.category}
      />
      <TextField id="intendedRole" name="intendedRole" label="Intended role" defaultValue={content.intendedRole} />
      <Select
        id="experienceLevel"
        name="experienceLevel"
        label="Experience level"
        options={COURSE_EXPERIENCE_LEVELS.map((value) => ({ value, label: COURSE_EXPERIENCE_LABELS[value] }))}
        defaultValue={content.experienceLevel}
      />
      <NumberField
        id="estimatedDurationMinutes"
        name="estimatedDurationMinutes"
        label="Estimated minutes"
        min={1}
        max={600}
        defaultValue={content.estimatedDurationMinutes}
      />
      <Select
        id="lessonAccess"
        name="lessonAccess"
        label="Lesson access"
        options={LESSON_ACCESS_MODES.map((value) => ({ value, label: LESSON_ACCESS_LABELS[value] }))}
        defaultValue={content.progression.lessonAccess}
      />
      <label className="flex items-start gap-2 text-[14px] text-ink">
        <input type="checkbox" name="requireCompletionBeforeAdvance" value="1" defaultChecked={content.progression.requireCompletionBeforeAdvance} />
        Require completion before the next lesson
      </label>
      <input type="hidden" name="quizGrading" value={content.assessment.quizGrading} />
      <Select
        id="writtenFeedback"
        name="writtenFeedback"
        label="Written quiz feedback"
        help="Stored for later. Blueprint does not grade written answers in this stage."
        options={WRITTEN_FEEDBACK_MODES.map((value) => ({
          value,
          label: value === "ai_assisted" ? "AI-assisted later" : "None",
        }))}
        defaultValue={content.assessment.writtenFeedback}
      />
      <Select
        id="assignmentApproval"
        name="assignmentApproval"
        label="Assignment approval"
        help="Stored for later. There is no assignment workflow yet."
        options={ASSIGNMENT_APPROVAL_MODES.map((value) => ({
          value,
          label: value === "human" ? "Human approval later" : "None",
        }))}
        defaultValue={content.assessment.assignmentApproval}
      />
      <Select
        id="submissionMode"
        name="submissionMode"
        label="Submission"
        options={SUBMISSION_MODES.map((value) => ({
          value,
          label: value === "online" ? "Online" : value === "in_person" ? "In person" : "Online or in person",
        }))}
        defaultValue={content.assessment.submissionMode}
      />
      <NumberField
        id="retryLimit"
        name="retryLimit"
        label="Retry limit"
        optional
        min={0}
        max={20}
        defaultValue={content.assessment.retryLimit}
      />
      <NumberField
        id="retryWaitHours"
        name="retryWaitHours"
        label="Wait hours between retries"
        optional
        min={0}
        max={720}
        defaultValue={content.assessment.retryWaitHours}
      />
      <Select
        id="certificationRequirement"
        name="certificationRequirement"
        label="Certification"
        help="Stored for later. Blueprint does not issue certifications in this stage."
        options={CERTIFICATION_REQUIREMENTS.map((value) => ({ value, label: CERTIFICATION_LABELS[value] }))}
        defaultValue={content.assessment.certificationRequirement}
      />
    </div>
  )
}

export function CourseEditorForm({ courseId, content, hasDraft }: { courseId: string; content: CourseContent; hasDraft: boolean }) {
  const save = useSaveForm(saveCompanyCourseAction)
  const publish = useSaveForm(publishCompanyCourseAction)
  const archive = useSaveForm(archiveCompanyCourseAction)
  useReloadWhenSaved(save.saveState)
  useReloadWhenSaved(publish.saveState)
  useReloadWhenSaved(archive.saveState)
  return (
    <div className="grid gap-8" data-course-editor={courseId}>
      <form {...save.formProps} className="grid gap-5" data-training-form="course-editor">
        <input type="hidden" name="courseId" value={courseId} />
        <CourseMetadataFields content={content} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.pending}>
            Save draft
          </Button>
          <SaveStatus state={save.saveState} />
        </div>
        <ErrorText error={save.error} />
      </form>
      {hasDraft ? (
        <form {...publish.formProps} className="grid gap-3" data-training-form="publish-course">
          <input type="hidden" name="courseId" value={courseId} />
          <p className="m-0 text-[14px] text-muted">{TRAINING_PUBLISH_HELP}</p>
          <label className="flex items-start gap-2 text-[14px] text-ink">
            <input type="checkbox" name="confirmPublish" value="1" />
            {TRAINING_PUBLISH_CONFIRM_LABEL}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="coral" disabled={publish.pending}>
              Publish version
            </Button>
            <SaveStatus state={publish.saveState} />
          </div>
          <ErrorText error={publish.error} />
        </form>
      ) : null}
      <form {...archive.formProps} className="grid gap-2" data-training-form="archive-course">
        <input type="hidden" name="courseId" value={courseId} />
        <p className="m-0 text-[14px] text-muted">{TRAINING_ARCHIVE_HELP}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="plain" disabled={archive.pending}>
            Archive or restore
          </Button>
          <SaveStatus state={archive.saveState} />
        </div>
        <ErrorText error={archive.error} />
      </form>
    </div>
  )
}

export function AddLessonForm({ courseId }: { courseId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(addCourseLessonAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3" data-training-form="add-lesson">
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="soft" disabled={pending}>
        Add lesson
      </Button>
      <SaveStatus state={saveState} />
      <ErrorText error={error} />
    </form>
  )
}

export function MoveLessonForm({
  courseId,
  lessonId,
  direction,
}: {
  courseId: string
  lessonId: string
  direction: "up" | "down"
}) {
  const save = useSaveForm(moveCourseLessonAction)
  useReloadWhenSaved(save.saveState)
  return (
    <form {...save.formProps}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="direction" value={direction} />
      <Button type="submit" variant="plain" size="sm" disabled={save.pending}>
        {direction === "up" ? "Move up" : "Move down"}
      </Button>
    </form>
  )
}

export function RemoveLessonForm({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { pending, saveState, formProps } = useSaveForm(removeCourseLessonAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Button type="submit" variant="plain" size="sm" disabled={pending}>
        Remove
      </Button>
    </form>
  )
}

function QuizFields({ block, index }: { block: QuizBlock; index: number }) {
  return (
    <div className="grid gap-4">
      <TextField id={`block-${index}-title`} name={`block-${index}-title`} label="Quiz title" defaultValue={block.title} />
      <input type="hidden" name={`block-${index}-questionCount`} value={block.questions.length} />
      <NumberField
        id={`block-${index}-retryLimit`}
        name={`block-${index}-retryLimit`}
        label="Quiz retry limit"
        optional
        min={0}
        max={20}
        defaultValue={block.config.retryLimit}
      />
      <NumberField
        id={`block-${index}-retryWaitHours`}
        name={`block-${index}-retryWaitHours`}
        label="Quiz wait hours"
        optional
        min={0}
        max={720}
        defaultValue={block.config.retryWaitHours}
      />
      <NumberField
        id={`block-${index}-passingScorePercent`}
        name={`block-${index}-passingScorePercent`}
        label="Passing score percent"
        optional
        min={0}
        max={100}
        defaultValue={block.config.passingScorePercent}
      />
      {block.questions.map((question, questionIndex) => (
        <div key={question.id} className="grid gap-3 rounded-[18px] border border-line p-4">
          <input type="hidden" name={`block-${index}-q-${questionIndex}-id`} value={question.id} />
          <TextField
            id={`block-${index}-q-${questionIndex}-prompt`}
            name={`block-${index}-q-${questionIndex}-prompt`}
            label={`Question ${questionIndex + 1}`}
            defaultValue={question.prompt}
          />
          <Select
            id={`block-${index}-q-${questionIndex}-kind`}
            name={`block-${index}-q-${questionIndex}-kind`}
            label="Question type"
            options={QUIZ_QUESTION_KINDS.map((value) => ({ value, label: QUIZ_QUESTION_LABELS[value] }))}
            defaultValue={question.kind}
          />
          <Select
            id={`block-${index}-q-${questionIndex}-writtenFeedback`}
            name={`block-${index}-q-${questionIndex}-writtenFeedback`}
            label="Written feedback"
            options={WRITTEN_FEEDBACK_MODES.map((value) => ({
              value,
              label: value === "ai_assisted" ? "AI-assisted later" : "None",
            }))}
            defaultValue={question.writtenFeedback}
          />
          {question.kind === "written" ? null : (
            <>
              <input type="hidden" name={`block-${index}-q-${questionIndex}-optionCount`} value={question.options.length} />
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="grid gap-2">
                  <input type="hidden" name={`block-${index}-q-${questionIndex}-opt-${optionIndex}-id`} value={option.id} />
                  <TextField
                    id={`block-${index}-q-${questionIndex}-opt-${optionIndex}-label`}
                    name={`block-${index}-q-${questionIndex}-opt-${optionIndex}-label`}
                    label={`Choice ${optionIndex + 1}`}
                    defaultValue={option.label}
                  />
                  <label className="flex items-start gap-2 text-[14px] text-ink">
                    <input
                      type="checkbox"
                      name={`block-${index}-q-${questionIndex}-opt-${optionIndex}-correct`}
                      value="1"
                      defaultChecked={option.correct}
                    />
                    Correct answer
                  </label>
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function BlockFields({ block, index }: { block: ContentBlock; index: number }) {
  return (
    <div className="grid gap-3" data-content-block={block.type}>
      <input type="hidden" name={`block-${index}-id`} value={block.id} />
      <input type="hidden" name={`block-${index}-type`} value={block.type} />
      <p className="m-0 text-[14px] font-bold text-ink">{CONTENT_BLOCK_LABELS[block.type]}</p>
      {block.type === "text" ? (
        <TextArea id={`block-${index}-body`} name={`block-${index}-body`} label="Text" defaultValue={block.body} />
      ) : null}
      {block.type === "video" ? (
        <>
          <TextField id={`block-${index}-url`} name={`block-${index}-url`} label="Video URL" defaultValue={block.url} />
          <TextField id={`block-${index}-caption`} name={`block-${index}-caption`} label="Caption" optional defaultValue={block.caption} />
        </>
      ) : null}
      {block.type === "image" ? (
        <>
          <TextField id={`block-${index}-url`} name={`block-${index}-url`} label="Image URL" defaultValue={block.url} />
          <TextField id={`block-${index}-alt`} name={`block-${index}-alt`} label="Image description" defaultValue={block.alt} />
        </>
      ) : null}
      {block.type === "resource" ? (
        <>
          <TextField id={`block-${index}-url`} name={`block-${index}-url`} label="Resource URL" defaultValue={block.url} />
          <TextField id={`block-${index}-label`} name={`block-${index}-label`} label="Link label" defaultValue={block.label} />
        </>
      ) : null}
      {block.type === "quiz" ? <QuizFields block={block} index={index} /> : null}
      {block.type === "assignment" ? (
        <>
          <TextField id={`block-${index}-title`} name={`block-${index}-title`} label="Assignment title" defaultValue={block.title} />
          <TextArea
            id={`block-${index}-instructions`}
            name={`block-${index}-instructions`}
            label="Instructions"
            defaultValue={block.instructions}
          />
          <Select
            id={`block-${index}-verification`}
            name={`block-${index}-verification`}
            label="Verification"
            options={[
              { value: "online", label: "Online submission later" },
              { value: "in_person", label: "In-person verification later" },
            ]}
            defaultValue={block.verification}
          />
          <label className="flex items-start gap-2 text-[14px] text-ink">
            <input type="checkbox" name={`block-${index}-requiresHumanApproval`} value="1" defaultChecked={block.requiresHumanApproval} />
            Human approval required later
          </label>
          <NumberField
            id={`block-${index}-retryLimit`}
            name={`block-${index}-retryLimit`}
            label="Assignment retry limit"
            optional
            min={0}
            max={20}
            defaultValue={block.retryLimit}
          />
        </>
      ) : null}
    </div>
  )
}

export function LessonEditorForm({
  courseId,
  lesson,
  action = saveCourseLessonAction,
}: {
  courseId: string
  lesson: LessonContent
  action?: typeof saveCourseLessonAction
}) {
  const save = useSaveForm(action)
  useReloadWhenSaved(save.saveState)
  return (
    <form {...save.formProps} className="grid gap-5" data-lesson-editor={lesson.id}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />
      <input type="hidden" name="blockCount" value={lesson.blocks.length} />
      <TextField id="lesson-title" name="title" label="Lesson title" defaultValue={lesson.title} />
      <TextArea id="lesson-description" name="description" label="Description" optional rows={3} defaultValue={lesson.description} />
      <label className="flex items-start gap-2 text-[14px] text-ink">
        <input type="checkbox" name="requireAllBlocks" value="1" defaultChecked={lesson.completion.requireAllBlocks} />
        Complete every block to finish the lesson
      </label>
      <label className="flex items-start gap-2 text-[14px] text-ink">
        <input
          type="checkbox"
          name="lockedUntilPreviousComplete"
          value="1"
          defaultChecked={lesson.progression.lockedUntilPreviousComplete}
        />
        Keep this lesson locked until the previous one is complete
      </label>
      <input type="hidden" name="requiredBlockIds" value={lesson.completion.requiredBlockIds.join(",")} />
      {lesson.blocks.map((block, index) => (
        <BlockFields key={block.id} block={block} index={index} />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={save.pending}>
          Save lesson
        </Button>
        <SaveStatus state={save.saveState} />
      </div>
      <ErrorText error={save.error} />
    </form>
  )
}

export function AddBlockForm({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(addLessonBlockAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="grid gap-3" data-training-form="add-block">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Select
        id="blockType"
        name="blockType"
        label="Add a content block"
        options={CONTENT_BLOCK_TYPES.map((value) => ({ value, label: CONTENT_BLOCK_LABELS[value] }))}
        defaultValue="text"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Add block
        </Button>
        <SaveStatus state={saveState} />
      </div>
      <ErrorText error={error} />
    </form>
  )
}

export function MoveBlockForm({
  courseId,
  lessonId,
  blockId,
  direction,
}: {
  courseId: string
  lessonId: string
  blockId: string
  direction: "up" | "down"
}) {
  const save = useSaveForm(moveLessonBlockAction)
  useReloadWhenSaved(save.saveState)
  return (
    <form {...save.formProps}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="blockId" value={blockId} />
      <input type="hidden" name="direction" value={direction} />
      <Button type="submit" variant="plain" size="sm" disabled={save.pending}>
        {direction === "up" ? "Move up" : "Move down"}
      </Button>
    </form>
  )
}

export function RemoveBlockForm({ courseId, lessonId, blockId }: { courseId: string; lessonId: string; blockId: string }) {
  const save = useSaveForm(removeLessonBlockAction)
  useReloadWhenSaved(save.saveState)
  return (
    <form {...save.formProps}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="blockId" value={blockId} />
      <Button type="submit" variant="plain" size="sm" disabled={save.pending}>
        Remove
      </Button>
    </form>
  )
}

export function CreatePathForm() {
  const { error, pending, saveState, formProps } = useSaveForm(createTrainingPathAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="grid gap-3" data-training-form="create-path">
      <TextField id="new-path-title" name="title" label="New path title" defaultValue="Untitled path" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          {TRAINING_CREATE_PATH}
        </Button>
        <SaveStatus state={saveState} />
      </div>
      <ErrorText error={error} />
    </form>
  )
}

export function PathEditorForm({
  pathId,
  content,
  courses,
  hasDraft,
}: {
  pathId: string
  content: PathContent
  courses: StoredCompanyCourse[]
  hasDraft: boolean
}) {
  const save = useSaveForm(saveTrainingPathAction)
  const publish = useSaveForm(publishTrainingPathAction)
  const archive = useSaveForm(archiveTrainingPathAction)
  const add = useSaveForm(addPathCourseAction)
  useReloadWhenSaved(save.saveState)
  useReloadWhenSaved(publish.saveState)
  useReloadWhenSaved(archive.saveState)
  useReloadWhenSaved(add.saveState)
  const available = courses.filter(
    (course) => course.libraryStatus === "active" && !content.courses.some((item) => item.courseId === course.id),
  )
  return (
    <div className="grid gap-8" data-path-editor={pathId}>
      <form {...save.formProps} className="grid gap-5" data-training-form="path-editor">
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="courseCount" value={content.courses.length} />
        <TextField id="path-title" name="title" label="Path title" defaultValue={content.title} />
        <TextArea id="path-description" name="description" label="Description" optional rows={3} defaultValue={content.description} />
        <TextField id="path-role" name="intendedRole" label="Intended role" defaultValue={content.intendedRole} />
        <Select
          id="focus"
          name="focus"
          label="Focus"
          options={PATH_FOCUS_VALUES.map((value) => ({ value, label: PATH_FOCUS_LABELS[value] }))}
          defaultValue={content.focus}
        />
        {content.courses.map((item, index) => (
          <div key={item.courseId} className="grid gap-2">
            <input type="hidden" name={`course-${index}-id`} value={item.courseId} />
            <p className="m-0 text-[14px] font-bold text-ink">
              {index + 1}. {courses.find((course) => course.id === item.courseId)?.title ?? "Course"}
            </p>
            <TextField
              id={`course-${index}-prerequisites`}
              name={`course-${index}-prerequisites`}
              label="Prerequisite course ids"
              help="Optional. Comma-separated ids of earlier courses in this path."
              optional
              defaultValue={item.prerequisiteCourseIds.join(",")}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.pending}>
            Save draft
          </Button>
          <SaveStatus state={save.saveState} />
        </div>
        <ErrorText error={save.error} />
      </form>
      {available.length > 0 ? (
        <form {...add.formProps} className="grid gap-3" data-training-form="add-path-course">
          <input type="hidden" name="pathId" value={pathId} />
          <Select
            id="add-path-course"
            name="courseId"
            label="Add a course from your library"
            options={available.map((course) => ({ value: course.id, label: course.title }))}
            defaultValue={available[0]?.id}
          />
          <Button type="submit" variant="soft" disabled={add.pending}>
            Add course to path
          </Button>
          <ErrorText error={add.error} />
        </form>
      ) : null}
      {hasDraft ? (
        <form {...publish.formProps} className="grid gap-3" data-training-form="publish-path">
          <input type="hidden" name="pathId" value={pathId} />
          <label className="flex items-start gap-2 text-[14px] text-ink">
            <input type="checkbox" name="confirmPublish" value="1" />
            {TRAINING_PATH_PUBLISH_CONFIRM_LABEL}
          </label>
          <Button type="submit" variant="coral" disabled={publish.pending}>
            Publish version
          </Button>
          <ErrorText error={publish.error} />
        </form>
      ) : null}
      <form {...archive.formProps} data-training-form="archive-path">
        <input type="hidden" name="pathId" value={pathId} />
        <Button type="submit" variant="plain" disabled={archive.pending}>
          Archive or restore
        </Button>
      </form>
    </div>
  )
}
