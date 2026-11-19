import type { createClient } from "@/lib/supabase/server"
import {
  currentDraft,
  currentPublished,
  listingFromContent,
  nextVersionNumber,
  TRAINING_VISIBILITY_STARTER_NEEDS_PUBLISH,
  type CourseContent,
  type MasterVisibility,
  type StoredMasterCourse,
} from "@/lib/blueprint/training-library"
import { loadMasterCourse, loadMasterCourses } from "@/lib/blueprint/training-library-store"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>
type Client = Awaited<ReturnType<typeof createClient>>

export { loadMasterCourse, loadMasterCourses }

async function upsertMasterDraft(
  client: Client,
  course: StoredMasterCourse,
  content: CourseContent,
): Promise<{ error: string | null }> {
  const listing = listingFromContent(content)
  const { error: listingError } = await client
    .from("training_master_courses")
    .update({
      title: listing.title,
      legacy_source_id: content.legacy.sourceId,
      legacy_content_version: content.legacy.contentVersion,
    })
    .eq("id", course.id)
  if (listingError) return { error: listingError.message }

  const draft = currentDraft(course.versions)
  const payload = {
    course_id: course.id,
    content: content as unknown as JsonValue,
    status: "draft",
    published_by: null,
    published_at: null,
  }
  if (draft) {
    const { error } = await client.from("training_master_course_versions").update(payload).eq("id", draft.id)
    return { error: error?.message ?? null }
  }
  const { error } = await client.from("training_master_course_versions").insert({
    ...payload,
    version: nextVersionNumber(course.versions),
  })
  return { error: error?.message ?? null }
}

export async function saveMasterCourseDraft(
  client: Client,
  course: StoredMasterCourse,
  content: CourseContent,
): Promise<{ error: string | null }> {
  return upsertMasterDraft(client, course, content)
}

export async function publishMasterCourse(
  client: Client,
  course: StoredMasterCourse,
): Promise<{ error: string | null }> {
  const draft = currentDraft(course.versions)
  if (!draft) return { error: "Save a draft before publishing." }
  const published = currentPublished(course.versions)
  if (published) {
    const { error } = await client
      .from("training_master_course_versions")
      .update({ status: "superseded" })
      .eq("id", published.id)
    if (error) return { error: error.message }
  }
  const { error } = await client
    .from("training_master_course_versions")
    .update({ status: "published" })
    .eq("id", draft.id)
  return { error: error?.message ?? null }
}

export async function setMasterVisibility(
  client: Client,
  course: StoredMasterCourse,
  visibility: MasterVisibility,
): Promise<{ error: string | null }> {
  if (visibility === "starter" && !currentPublished(course.versions)) {
    return { error: TRAINING_VISIBILITY_STARTER_NEEDS_PUBLISH }
  }
  const { error } = await client.from("training_master_courses").update({ visibility }).eq("id", course.id)
  return { error: error?.message ?? null }
}

export async function createMasterCourse(
  client: Client,
  content: CourseContent,
): Promise<{ error: string | null; courseId: string | null }> {
  const listing = listingFromContent(content)
  const { data, error } = await client
    .from("training_master_courses")
    .insert({
      title: listing.title,
      visibility: "private",
      legacy_source_id: content.legacy.sourceId,
      legacy_content_version: content.legacy.contentVersion,
    })
    .select("id")
    .single()
  if (error || !data) return { error: error?.message ?? "create failed", courseId: null }
  const { error: versionError } = await client.from("training_master_course_versions").insert({
    course_id: data.id,
    version: 1,
    status: "draft",
    content: content as unknown as JsonValue,
  })
  if (versionError) return { error: versionError.message, courseId: null }
  return { error: null, courseId: data.id }
}
