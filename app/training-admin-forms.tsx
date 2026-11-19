"use client"

import { useEffect, useRef } from "react"

import { Button, SaveStatus, Select } from "@/components/blueprint"
import {
  addMasterLessonAction,
  createMasterCourseAction,
  moveMasterLessonAction,
  publishMasterCourseAction,
  removeMasterLessonAction,
  saveMasterCourseAction,
  saveMasterLessonAction,
  setMasterVisibilityAction,
} from "@/lib/blueprint/training-master-actions"
import {
  MASTER_VISIBILITIES,
  MASTER_VISIBILITY_LABELS,
  TRAINING_CREATE_COURSE,
  TRAINING_PUBLISH_CONFIRM_LABEL,
  TRAINING_PUBLISH_HELP,
  type CourseContent,
  type LessonContent,
  type MasterVisibility,
} from "@/lib/blueprint/training-library"
import { CourseMetadataFields, LessonEditorForm } from "./training-library-forms"
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

export function CreateMasterCourseForm() {
  const { error, pending, saveState, formProps } = useSaveForm(createMasterCourseAction)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} className="grid gap-3" data-training-form="create-master">
      <input type="hidden" name="title" value="Untitled master course" />
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

export function MasterCourseEditorForm({
  courseId,
  content,
  visibility,
  hasDraft,
}: {
  courseId: string
  content: CourseContent
  visibility: MasterVisibility
  hasDraft: boolean
}) {
  const save = useSaveForm(saveMasterCourseAction)
  const publish = useSaveForm(publishMasterCourseAction)
  const visibilityForm = useSaveForm(setMasterVisibilityAction)
  useReloadWhenSaved(save.saveState)
  useReloadWhenSaved(publish.saveState)
  useReloadWhenSaved(visibilityForm.saveState)
  return (
    <div className="grid gap-8" data-master-editor={courseId}>
      <form {...save.formProps} className="grid gap-5" data-training-form="master-editor">
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
        <form {...publish.formProps} className="grid gap-3" data-training-form="publish-master">
          <input type="hidden" name="courseId" value={courseId} />
          <p className="m-0 text-[14px] text-muted">{TRAINING_PUBLISH_HELP}</p>
          <label className="flex items-start gap-2 text-[14px] text-ink">
            <input type="checkbox" name="confirmPublish" value="1" />
            {TRAINING_PUBLISH_CONFIRM_LABEL}
          </label>
          <Button type="submit" variant="coral" disabled={publish.pending}>
            Publish version
          </Button>
          <ErrorText error={publish.error} />
        </form>
      ) : null}
      <form {...visibilityForm.formProps} className="grid gap-3" data-training-form="master-visibility">
        <input type="hidden" name="courseId" value={courseId} />
        <Select
          id="visibility"
          name="visibility"
          label="Library visibility"
          help="Private stays with Blueprint. Starter Library is what companies can copy. Archived cannot be newly adopted."
          options={MASTER_VISIBILITIES.map((value) => ({ value, label: MASTER_VISIBILITY_LABELS[value] }))}
          defaultValue={visibility}
        />
        <Button type="submit" variant="soft" disabled={visibilityForm.pending}>
          Save visibility
        </Button>
        <ErrorText error={visibilityForm.error} />
      </form>
    </div>
  )
}

export function MasterLessonEditor({
  courseId,
  lesson,
}: {
  courseId: string
  lesson: LessonContent
}) {
  return <LessonEditorForm courseId={courseId} lesson={lesson} action={saveMasterLessonAction} />
}

export function AddMasterLessonForm({ courseId }: { courseId: string }) {
  const save = useSaveForm(addMasterLessonAction)
  useReloadWhenSaved(save.saveState)
  return (
    <form {...save.formProps} data-training-form="add-master-lesson">
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="soft" disabled={save.pending}>
        Add lesson
      </Button>
    </form>
  )
}

export function MoveMasterLessonForm({
  courseId,
  lessonId,
  direction,
}: {
  courseId: string
  lessonId: string
  direction: "up" | "down"
}) {
  const save = useSaveForm(moveMasterLessonAction)
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

export function RemoveMasterLessonForm({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const save = useSaveForm(removeMasterLessonAction)
  useReloadWhenSaved(save.saveState)
  return (
    <form {...save.formProps}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Button type="submit" variant="plain" size="sm" disabled={save.pending}>
        Remove
      </Button>
    </form>
  )
}
