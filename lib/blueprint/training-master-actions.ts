"use server"

import { revalidatePath } from "next/cache"

import { SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import {
  addLessonToContent,
  currentDraft,
  currentPublished,
  emptyCourseContent,
  mergeCourseMetadata,
  moveLessonInContent,
  parseCourseEditorForm,
  parseLessonEditorForm,
  parseMasterVisibility,
  removeLessonFromContent,
  replaceLesson,
  TRAINING_MASTER_MISSING,
  TRAINING_NOT_ADMIN,
  TRAINING_PUBLISH_CONFIRM_MESSAGE,
  TRAINING_VISIBILITY_STARTER_NEEDS_PUBLISH,
  type CourseContent,
  type SaveTrainingLibraryState,
} from "@/lib/blueprint/training-library"
import {
  createMasterCourse,
  loadMasterCourse,
  publishMasterCourse,
  saveMasterCourseDraft,
  setMasterVisibility,
} from "@/lib/blueprint/training-master-store"
import { createClient } from "@/lib/supabase/server"

async function requireAdminUser() {
  const supabase = await createClient()
  const { data: claimsData, error } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (error || typeof userId !== "string" || !userId) {
    return { ok: false as const, error: TRAINING_NOT_ADMIN }
  }
  const { data } = await supabase.from("training_platform_admins").select("user_id").eq("user_id", userId).maybeSingle()
  if (!data?.user_id) return { ok: false as const, error: TRAINING_NOT_ADMIN }
  return { ok: true as const, supabase, userId }
}

function fail(error: string): SaveTrainingLibraryState {
  if (
    error === TRAINING_NOT_ADMIN ||
    error === TRAINING_MASTER_MISSING ||
    error === TRAINING_PUBLISH_CONFIRM_MESSAGE ||
    error === TRAINING_VISIBILITY_STARTER_NEEDS_PUBLISH
  ) {
    return { error, savedAt: null }
  }
  console.error("training master", error)
  return { error: SAVE_FAILED_MESSAGE, savedAt: null }
}

function revalidateMaster(courseId?: string) {
  revalidatePath("/training-admin")
  if (courseId) revalidatePath(`/training-admin/courses/${courseId}`)
}

export async function createMasterCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const title = String(formData.get("title") ?? "").trim() || "Untitled master course"
  const created = await createMasterCourse(auth.supabase, emptyCourseContent(title))
  if (created.error || !created.courseId) return fail(created.error ?? SAVE_FAILED_MESSAGE)
  revalidateMaster(created.courseId)
  return { error: null, savedAt: Date.now() }
}

export async function saveMasterCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadMasterCourse(auth.supabase, courseId)
  if (!course) return { error: TRAINING_MASTER_MISSING, savedAt: null }
  const metadata = parseCourseEditorForm(formData)
  if (typeof metadata === "string") return { error: metadata, savedAt: null }
  const existing = currentDraft(course.versions)?.content ?? currentPublished(course.versions)?.content
  if (!existing) return fail(SAVE_FAILED_MESSAGE)
  const saved = await saveMasterCourseDraft(auth.supabase, course, mergeCourseMetadata(existing, metadata))
  if (saved.error) return fail(saved.error)
  revalidateMaster(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function publishMasterCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  if (formData.get("confirmPublish") !== "1") return { error: TRAINING_PUBLISH_CONFIRM_MESSAGE, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadMasterCourse(auth.supabase, courseId)
  if (!course) return { error: TRAINING_MASTER_MISSING, savedAt: null }
  const published = await publishMasterCourse(auth.supabase, course)
  if (published.error) return fail(published.error)
  revalidateMaster(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function setMasterVisibilityAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const visibility = parseMasterVisibility(String(formData.get("visibility") ?? ""))
  if (!visibility) return fail(SAVE_FAILED_MESSAGE)
  const course = await loadMasterCourse(auth.supabase, courseId)
  if (!course) return { error: TRAINING_MASTER_MISSING, savedAt: null }
  const saved = await setMasterVisibility(auth.supabase, course, visibility)
  if (saved.error) return fail(saved.error)
  revalidateMaster(course.id)
  return { error: null, savedAt: Date.now() }
}

async function mutateMasterLessons(
  formData: FormData,
  mutate: (content: CourseContent) => CourseContent | null | string,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadMasterCourse(auth.supabase, courseId)
  if (!course) return { error: TRAINING_MASTER_MISSING, savedAt: null }
  const existing = currentDraft(course.versions)?.content ?? currentPublished(course.versions)?.content
  if (!existing) return fail(SAVE_FAILED_MESSAGE)
  const next = mutate(existing)
  if (typeof next === "string") return { error: next, savedAt: null }
  if (!next) return fail(SAVE_FAILED_MESSAGE)
  const saved = await saveMasterCourseDraft(auth.supabase, course, next)
  if (saved.error) return fail(saved.error)
  revalidateMaster(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function addMasterLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  return mutateMasterLessons(formData, (content) => addLessonToContent(content))
}

export async function moveMasterLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  const direction = formData.get("direction") === "down" ? "down" : "up"
  return mutateMasterLessons(formData, (content) => moveLessonInContent(content, lessonId, direction))
}

export async function removeMasterLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  return mutateMasterLessons(formData, (content) => removeLessonFromContent(content, lessonId))
}

export async function saveMasterLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lesson = parseLessonEditorForm(formData)
  if (typeof lesson === "string") return { error: lesson, savedAt: null }
  return mutateMasterLessons(formData, (content) => replaceLesson(content, lesson))
}
