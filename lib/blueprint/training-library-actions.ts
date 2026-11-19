"use server"

import { revalidatePath } from "next/cache"

import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import {
  addBlockToLesson,
  addLessonToContent,
  CONTENT_BLOCK_TYPES,
  currentDraft,
  currentPublished,
  emptyCourseContent,
  emptyPathContent,
  mergeCourseMetadata,
  moveBlockInLesson,
  moveLessonInContent,
  parseCourseEditorForm,
  parseLessonEditorForm,
  parsePathContent,
  parsePathEditorForm,
  removeBlockFromLesson,
  removeLessonFromContent,
  replaceLesson,
  TRAINING_COURSE_MISSING,
  TRAINING_PATH_MISSING,
  TRAINING_PUBLISH_CONFIRM_MESSAGE,
  TRAINING_STARTER_UNAVAILABLE,
  type ContentBlockType,
  type CourseContent,
  type SaveTrainingLibraryState,
} from "@/lib/blueprint/training-library"
import {
  adoptMasterUpdate,
  adoptStarterCourse,
  createOriginalCourse,
  createTrainingPath,
  loadCompanyCourse,
  loadCompanyCourses,
  loadCompanyPath,
  loadMasterCourse,
  loadStarterCatalog,
  publishCompanyCourse,
  publishCompanyPath,
  saveCompanyCourseDraft,
  saveCompanyPathDraft,
  setCompanyCourseLibraryStatus,
  setCompanyPathLibraryStatus,
} from "@/lib/blueprint/training-library-store"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

async function requireOwnerUser() {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { ok: false as const, error: OWNER_ONLY_MESSAGE }
  }
  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || typeof userId !== "string" || !userId) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  return { ok: true as const, membership, supabase, userId }
}

function fail(error: string): SaveTrainingLibraryState {
  if (
    error === OWNER_ONLY_MESSAGE ||
    error === TRAINING_COURSE_MISSING ||
    error === TRAINING_PATH_MISSING ||
    error === TRAINING_STARTER_UNAVAILABLE ||
    error === TRAINING_PUBLISH_CONFIRM_MESSAGE
  ) {
    return { error, savedAt: null }
  }
  console.error("training library", error)
  return { error: SAVE_FAILED_MESSAGE, savedAt: null }
}

function revalidateLibrary(courseId?: string, pathId?: string) {
  revalidatePath("/blueprint/training")
  if (courseId) {
    revalidatePath(`/blueprint/training/courses/${courseId}`)
    revalidatePath(`/blueprint/training/courses/${courseId}`, "layout")
  }
  if (pathId) revalidatePath(`/blueprint/training/paths/${pathId}`)
}

export async function createCompanyCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const title = String(formData.get("title") ?? "").trim() || "Untitled course"
  const created = await createOriginalCourse(auth.supabase, auth.membership.companyId, emptyCourseContent(title))
  if (created.error || !created.courseId) return fail(created.error ?? SAVE_FAILED_MESSAGE)
  revalidateLibrary(created.courseId)
  return { error: null, savedAt: Date.now() }
}

export async function adoptStarterCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const masterId = String(formData.get("masterCourseId") ?? "").trim()
  const master = (await loadStarterCatalog(auth.supabase)).find((course) => course.id === masterId)
  if (!master) return { error: TRAINING_STARTER_UNAVAILABLE, savedAt: null }
  const adopted = await adoptStarterCourse(auth.supabase, auth.membership.companyId, master)
  if (adopted.error || !adopted.courseId) return fail(adopted.error ?? TRAINING_STARTER_UNAVAILABLE)
  revalidateLibrary(adopted.courseId)
  return { error: null, savedAt: Date.now() }
}

export async function adoptMasterUpdateAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadCompanyCourse(auth.supabase, auth.membership.companyId, courseId)
  if (!course || !course.sourceMasterCourseId) return { error: TRAINING_COURSE_MISSING, savedAt: null }
  const master = await loadMasterCourse(auth.supabase, course.sourceMasterCourseId)
  if (!master) return { error: TRAINING_STARTER_UNAVAILABLE, savedAt: null }
  const updated = await adoptMasterUpdate(auth.supabase, course, master)
  if (updated.error) return fail(updated.error)
  revalidateLibrary(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function saveCompanyCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadCompanyCourse(auth.supabase, auth.membership.companyId, courseId)
  if (!course) return { error: TRAINING_COURSE_MISSING, savedAt: null }
  const metadata = parseCourseEditorForm(formData)
  if (typeof metadata === "string") return { error: metadata, savedAt: null }
  const existing = currentDraft(course.versions)?.content ?? currentPublished(course.versions)?.content
  if (!existing) return fail(SAVE_FAILED_MESSAGE)
  const saved = await saveCompanyCourseDraft(auth.supabase, course, mergeCourseMetadata(existing, metadata))
  if (saved.error) return fail(saved.error)
  revalidateLibrary(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function publishCompanyCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  if (formData.get("confirmPublish") !== "1") return { error: TRAINING_PUBLISH_CONFIRM_MESSAGE, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadCompanyCourse(auth.supabase, auth.membership.companyId, courseId)
  if (!course) return { error: TRAINING_COURSE_MISSING, savedAt: null }
  const published = await publishCompanyCourse(auth.supabase, course)
  if (published.error) return fail(published.error)
  revalidateLibrary(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function archiveCompanyCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadCompanyCourse(auth.supabase, auth.membership.companyId, courseId)
  if (!course) return { error: TRAINING_COURSE_MISSING, savedAt: null }
  const next = course.libraryStatus === "archived" ? "active" : "archived"
  const saved = await setCompanyCourseLibraryStatus(auth.supabase, course, next)
  if (saved.error) return fail(saved.error)
  revalidateLibrary(course.id)
  return { error: null, savedAt: Date.now() }
}

async function mutateCourseLessons(
  formData: FormData,
  mutate: (content: CourseContent) => CourseContent | null | string,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const course = await loadCompanyCourse(auth.supabase, auth.membership.companyId, courseId)
  if (!course) return { error: TRAINING_COURSE_MISSING, savedAt: null }
  const existing = currentDraft(course.versions)?.content ?? currentPublished(course.versions)?.content
  if (!existing) return fail(SAVE_FAILED_MESSAGE)
  const next = mutate(existing)
  if (typeof next === "string") return { error: next, savedAt: null }
  if (!next) return fail(SAVE_FAILED_MESSAGE)
  const saved = await saveCompanyCourseDraft(auth.supabase, course, next)
  if (saved.error) return fail(saved.error)
  revalidateLibrary(course.id)
  return { error: null, savedAt: Date.now() }
}

export async function addCourseLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  return mutateCourseLessons(formData, (content) => addLessonToContent(content))
}

export async function moveCourseLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  const direction = formData.get("direction") === "down" ? "down" : "up"
  return mutateCourseLessons(formData, (content) => moveLessonInContent(content, lessonId, direction))
}

export async function removeCourseLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  return mutateCourseLessons(formData, (content) => removeLessonFromContent(content, lessonId))
}

export async function saveCourseLessonAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lesson = parseLessonEditorForm(formData)
  if (typeof lesson === "string") return { error: lesson, savedAt: null }
  return mutateCourseLessons(formData, (content) => replaceLesson(content, lesson))
}

export async function addLessonBlockAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  const type = CONTENT_BLOCK_TYPES.includes(String(formData.get("blockType") ?? "") as ContentBlockType)
    ? (String(formData.get("blockType")) as ContentBlockType)
    : null
  if (!type) return fail(SAVE_FAILED_MESSAGE)
  return mutateCourseLessons(formData, (content) => {
    const lesson = content.lessons.find((item) => item.id === lessonId)
    if (!lesson) return null
    const nextLesson = addBlockToLesson(lesson, type)
    return nextLesson ? replaceLesson(content, nextLesson) : null
  })
}

export async function moveLessonBlockAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  const blockId = String(formData.get("blockId") ?? "").trim()
  const direction = formData.get("direction") === "down" ? "down" : "up"
  return mutateCourseLessons(formData, (content) => {
    const lesson = content.lessons.find((item) => item.id === lessonId)
    if (!lesson) return null
    const nextLesson = moveBlockInLesson(lesson, blockId, direction)
    return nextLesson ? replaceLesson(content, nextLesson) : null
  })
}

export async function removeLessonBlockAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  const blockId = String(formData.get("blockId") ?? "").trim()
  return mutateCourseLessons(formData, (content) => {
    const lesson = content.lessons.find((item) => item.id === lessonId)
    if (!lesson) return null
    const nextLesson = removeBlockFromLesson(lesson, blockId)
    return nextLesson ? replaceLesson(content, nextLesson) : null
  })
}

export async function createTrainingPathAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const title = String(formData.get("title") ?? "").trim() || "Untitled path"
  const created = await createTrainingPath(auth.supabase, auth.membership.companyId, emptyPathContent(title))
  if (created.error || !created.pathId) return fail(created.error ?? SAVE_FAILED_MESSAGE)
  revalidateLibrary(undefined, created.pathId)
  return { error: null, savedAt: Date.now() }
}

export async function saveTrainingPathAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const pathId = String(formData.get("pathId") ?? "").trim()
  const path = await loadCompanyPath(auth.supabase, auth.membership.companyId, pathId)
  if (!path) return { error: TRAINING_PATH_MISSING, savedAt: null }
  const courses = await loadCompanyCourses(auth.supabase, auth.membership.companyId)
  const allowed = new Set(courses.filter((course) => course.libraryStatus === "active").map((course) => course.id))
  const parsed = parsePathEditorForm(formData, allowed)
  if (typeof parsed === "string") return { error: parsed, savedAt: null }
  const saved = await saveCompanyPathDraft(auth.supabase, path, parsed)
  if (saved.error) return fail(saved.error)
  revalidateLibrary(undefined, path.id)
  return { error: null, savedAt: Date.now() }
}

export async function addPathCourseAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const pathId = String(formData.get("pathId") ?? "").trim()
  const courseId = String(formData.get("courseId") ?? "").trim()
  const path = await loadCompanyPath(auth.supabase, auth.membership.companyId, pathId)
  const course = await loadCompanyCourse(auth.supabase, auth.membership.companyId, courseId)
  if (!path) return { error: TRAINING_PATH_MISSING, savedAt: null }
  if (!course || course.libraryStatus !== "active") return { error: TRAINING_COURSE_MISSING, savedAt: null }
  const existing = currentDraft(path.versions)?.content ?? currentPublished(path.versions)?.content ?? emptyPathContent(path.title)
  if (existing.courses.some((item) => item.courseId === course.id)) return { error: null, savedAt: Date.now() }
  const next = {
    ...existing,
    courses: [...existing.courses, { courseId: course.id, prerequisiteCourseIds: [] as string[] }],
  }
  const allowed = new Set([course.id, ...existing.courses.map((item) => item.courseId)])
  const parsed = parsePathContent(next, allowed)
  if (!parsed) return fail(SAVE_FAILED_MESSAGE)
  const saved = await saveCompanyPathDraft(auth.supabase, path, parsed)
  if (saved.error) return fail(saved.error)
  revalidateLibrary(undefined, path.id)
  return { error: null, savedAt: Date.now() }
}

export async function publishTrainingPathAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  if (formData.get("confirmPublish") !== "1") return { error: TRAINING_PUBLISH_CONFIRM_MESSAGE, savedAt: null }
  const pathId = String(formData.get("pathId") ?? "").trim()
  const path = await loadCompanyPath(auth.supabase, auth.membership.companyId, pathId)
  if (!path) return { error: TRAINING_PATH_MISSING, savedAt: null }
  const published = await publishCompanyPath(auth.supabase, path)
  if (published.error) return fail(published.error)
  revalidateLibrary(undefined, path.id)
  return { error: null, savedAt: Date.now() }
}

export async function archiveTrainingPathAction(
  _prev: SaveTrainingLibraryState,
  formData: FormData,
): Promise<SaveTrainingLibraryState> {
  const auth = await requireOwnerUser()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const pathId = String(formData.get("pathId") ?? "").trim()
  const path = await loadCompanyPath(auth.supabase, auth.membership.companyId, pathId)
  if (!path) return { error: TRAINING_PATH_MISSING, savedAt: null }
  const next = path.libraryStatus === "archived" ? "active" : "archived"
  const saved = await setCompanyPathLibraryStatus(auth.supabase, path, next)
  if (saved.error) return fail(saved.error)
  revalidateLibrary(undefined, path.id)
  return { error: null, savedAt: Date.now() }
}
