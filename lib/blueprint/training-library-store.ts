import type { createClient } from "@/lib/supabase/server"
import {
  cloneCourseContent,
  clonePathContent,
  currentDraft,
  currentPublished,
  editorVersion,
  listingFromContent,
  nextVersionNumber,
  parseCourseContent,
  parsePathContent,
  type CourseContent,
  type PathContent,
  type StoredCompanyCourse,
  type StoredCourseVersion,
  type StoredMasterCourse,
  type StoredPathVersion,
  type StoredTrainingPath,
  type TrainingLibraryStatus,
  type TrainingVersionStatus,
} from "@/lib/blueprint/training-library"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>
type Client = Awaited<ReturnType<typeof createClient>>

const COURSE_COLUMNS =
  "id, company_id, title, origin, source_master_course_id, source_master_version, library_status, legacy_source_id, legacy_content_version" as const
const COURSE_VERSION_COLUMNS = "id, course_id, company_id, version, status, content, published_by, published_at" as const
const PATH_COLUMNS = "id, company_id, title, library_status" as const
const PATH_VERSION_COLUMNS = "id, path_id, company_id, version, status, content, published_by, published_at" as const
const MASTER_COLUMNS = "id, title, visibility, legacy_source_id, legacy_content_version" as const
const MASTER_VERSION_COLUMNS = "id, course_id, version, status, content, published_by, published_at" as const

function asStatus(value: unknown): TrainingVersionStatus | null {
  return value === "draft" || value === "published" || value === "superseded" ? value : null
}

function versionFromRow(row: {
  id: string
  version: number
  status: string
  content: unknown
  published_by: string | null
  published_at: string | null
}): StoredCourseVersion | null {
  const status = asStatus(row.status)
  const content = parseCourseContent(row.content)
  if (!status || !content) return null
  return {
    id: row.id,
    version: row.version,
    status,
    content,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
  }
}

function pathVersionFromRow(row: {
  id: string
  version: number
  status: string
  content: unknown
  published_by: string | null
  published_at: string | null
}): StoredPathVersion | null {
  const status = asStatus(row.status)
  const content = parsePathContent(row.content)
  if (!status || !content) return null
  return {
    id: row.id,
    version: row.version,
    status,
    content,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
  }
}

export async function loadMasterCourses(client: Client): Promise<StoredMasterCourse[]> {
  const { data, error } = await client.from("training_master_courses").select(MASTER_COLUMNS).order("title")
  if (error || !data) return []
  const { data: versions, error: versionError } = await client
    .from("training_master_course_versions")
    .select(MASTER_VERSION_COLUMNS)
    .order("version", { ascending: false })
  if (versionError || !versions) return []
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility === "starter" || row.visibility === "archived" ? row.visibility : "private",
    legacy: { sourceId: row.legacy_source_id, contentVersion: row.legacy_content_version },
    versions: versions
      .filter((version) => version.course_id === row.id)
      .map(versionFromRow)
      .filter((version): version is StoredCourseVersion => version !== null),
  }))
}

export async function loadMasterCourse(client: Client, courseId: string): Promise<StoredMasterCourse | null> {
  const courses = await loadMasterCourses(client)
  return courses.find((course) => course.id === courseId) ?? null
}

export async function loadStarterCatalog(client: Client): Promise<StoredMasterCourse[]> {
  const courses = await loadMasterCourses(client)
  return courses.filter((course) => course.visibility === "starter" && currentPublished(course.versions))
}

export async function loadCompanyCourses(client: Client, companyId: string): Promise<StoredCompanyCourse[]> {
  const { data, error } = await client
    .from("company_training_courses")
    .select(COURSE_COLUMNS)
    .eq("company_id", companyId)
    .order("title")
  if (error || !data) return []
  const { data: versions, error: versionError } = await client
    .from("company_training_course_versions")
    .select(COURSE_VERSION_COLUMNS)
    .eq("company_id", companyId)
    .order("version", { ascending: false })
  if (versionError || !versions) return []
  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    origin: row.origin === "adopted" ? "adopted" : "original",
    sourceMasterCourseId: row.source_master_course_id,
    sourceMasterVersion: row.source_master_version,
    libraryStatus: row.library_status === "archived" ? "archived" : "active",
    legacy: { sourceId: row.legacy_source_id, contentVersion: row.legacy_content_version },
    versions: versions
      .filter((version) => version.course_id === row.id)
      .map(versionFromRow)
      .filter((version): version is StoredCourseVersion => version !== null),
  }))
}

export async function loadCompanyCourse(
  client: Client,
  companyId: string,
  courseId: string,
): Promise<StoredCompanyCourse | null> {
  const courses = await loadCompanyCourses(client, companyId)
  return courses.find((course) => course.id === courseId) ?? null
}

export async function loadCompanyPaths(client: Client, companyId: string): Promise<StoredTrainingPath[]> {
  const { data, error } = await client
    .from("company_training_paths")
    .select(PATH_COLUMNS)
    .eq("company_id", companyId)
    .order("title")
  if (error || !data) return []
  const { data: versions, error: versionError } = await client
    .from("company_training_path_versions")
    .select(PATH_VERSION_COLUMNS)
    .eq("company_id", companyId)
    .order("version", { ascending: false })
  if (versionError || !versions) return []
  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    libraryStatus: row.library_status === "archived" ? "archived" : "active",
    versions: versions
      .filter((version) => version.path_id === row.id)
      .map(pathVersionFromRow)
      .filter((version): version is StoredPathVersion => version !== null),
  }))
}

export async function loadCompanyPath(
  client: Client,
  companyId: string,
  pathId: string,
): Promise<StoredTrainingPath | null> {
  const paths = await loadCompanyPaths(client, companyId)
  return paths.find((path) => path.id === pathId) ?? null
}

async function upsertCourseDraft(
  client: Client,
  course: StoredCompanyCourse,
  content: CourseContent,
): Promise<{ error: string | null }> {
  const listing = listingFromContent(content)
  const { error: listingError } = await client
    .from("company_training_courses")
    .update({
      title: listing.title,
    })
    .eq("id", course.id)
    .eq("company_id", course.companyId)
  if (listingError) return { error: listingError.message }

  const draft = currentDraft(course.versions)
  const payload = {
    course_id: course.id,
    company_id: course.companyId,
    content: content as unknown as JsonValue,
    status: "draft",
    published_by: null,
    published_at: null,
  }
  if (draft) {
    const { error } = await client
      .from("company_training_course_versions")
      .update(payload)
      .eq("id", draft.id)
      .eq("company_id", course.companyId)
    return { error: error?.message ?? null }
  }
  const { error } = await client.from("company_training_course_versions").insert({
    ...payload,
    version: nextVersionNumber(course.versions),
  })
  return { error: error?.message ?? null }
}

export async function saveCompanyCourseDraft(
  client: Client,
  course: StoredCompanyCourse,
  content: CourseContent,
): Promise<{ error: string | null }> {
  return upsertCourseDraft(client, course, content)
}

export async function publishCompanyCourse(
  client: Client,
  course: StoredCompanyCourse,
): Promise<{ error: string | null }> {
  const draft = currentDraft(course.versions)
  if (!draft) return { error: "Save a draft before publishing." }
  const published = currentPublished(course.versions)
  if (published) {
    const { error } = await client
      .from("company_training_course_versions")
      .update({ status: "superseded" })
      .eq("id", published.id)
      .eq("company_id", course.companyId)
    if (error) return { error: error.message }
  }
  const { error } = await client
    .from("company_training_course_versions")
    .update({ status: "published" })
    .eq("id", draft.id)
    .eq("company_id", course.companyId)
  return { error: error?.message ?? null }
}

export async function setCompanyCourseLibraryStatus(
  client: Client,
  course: StoredCompanyCourse,
  libraryStatus: TrainingLibraryStatus,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("company_training_courses")
    .update({ library_status: libraryStatus })
    .eq("id", course.id)
    .eq("company_id", course.companyId)
  return { error: error?.message ?? null }
}

export async function createOriginalCourse(
  client: Client,
  companyId: string,
  content: CourseContent,
): Promise<{ error: string | null; courseId: string | null }> {
  const listing = listingFromContent(content)
  const { data, error } = await client
    .from("company_training_courses")
    .insert({
      company_id: companyId,
      title: listing.title,
      origin: "original",
      library_status: "active",
      legacy_source_id: content.legacy.sourceId,
      legacy_content_version: content.legacy.contentVersion,
    })
    .select("id")
    .single()
  if (error || !data) return { error: error?.message ?? "create failed", courseId: null }
  const { error: versionError } = await client.from("company_training_course_versions").insert({
    course_id: data.id,
    company_id: companyId,
    version: 1,
    status: "draft",
    content: content as unknown as JsonValue,
  })
  if (versionError) return { error: versionError.message, courseId: null }
  return { error: null, courseId: data.id }
}

export async function adoptStarterCourse(
  client: Client,
  companyId: string,
  master: StoredMasterCourse,
): Promise<{ error: string | null; courseId: string | null }> {
  const published = currentPublished(master.versions)
  if (!published || master.visibility !== "starter") return { error: "That starter course is not available.", courseId: null }
  const content = cloneCourseContent(published.content)
  const listing = listingFromContent(content)
  const { data, error } = await client
    .from("company_training_courses")
    .insert({
      company_id: companyId,
      title: listing.title,
      origin: "adopted",
      source_master_course_id: master.id,
      source_master_version: published.version,
      library_status: "active",
      legacy_source_id: content.legacy.sourceId,
      legacy_content_version: content.legacy.contentVersion,
    })
    .select("id")
    .single()
  if (error || !data) return { error: error?.message ?? "adopt failed", courseId: null }
  const { error: versionError } = await client.from("company_training_course_versions").insert({
    course_id: data.id,
    company_id: companyId,
    version: 1,
    status: "published",
    content: content as unknown as JsonValue,
  })
  if (versionError) return { error: versionError.message, courseId: null }
  return { error: null, courseId: data.id }
}

export async function adoptMasterUpdate(
  client: Client,
  course: StoredCompanyCourse,
  master: StoredMasterCourse,
): Promise<{ error: string | null }> {
  const published = currentPublished(master.versions)
  if (!published || master.visibility !== "starter") return { error: "That starter course is not available." }
  if (course.origin !== "adopted" || course.sourceMasterCourseId !== master.id) {
    return { error: "That course is not a copy of this starter course." }
  }
  const content = cloneCourseContent(published.content)
  const saved = await upsertCourseDraft(client, course, content)
  if (saved.error) return saved
  const { error } = await client
    .from("company_training_courses")
    .update({ source_master_version: published.version, title: content.title })
    .eq("id", course.id)
    .eq("company_id", course.companyId)
  return { error: error?.message ?? null }
}

async function upsertPathDraft(
  client: Client,
  path: StoredTrainingPath,
  content: PathContent,
): Promise<{ error: string | null }> {
  const { error: listingError } = await client
    .from("company_training_paths")
    .update({ title: content.title })
    .eq("id", path.id)
    .eq("company_id", path.companyId)
  if (listingError) return { error: listingError.message }
  const draft = currentDraft(path.versions)
  const payload = {
    path_id: path.id,
    company_id: path.companyId,
    content: content as unknown as JsonValue,
    status: "draft",
    published_by: null,
    published_at: null,
  }
  if (draft) {
    const { error } = await client
      .from("company_training_path_versions")
      .update(payload)
      .eq("id", draft.id)
      .eq("company_id", path.companyId)
    return { error: error?.message ?? null }
  }
  const { error } = await client.from("company_training_path_versions").insert({
    ...payload,
    version: nextVersionNumber(path.versions),
  })
  return { error: error?.message ?? null }
}

export async function saveCompanyPathDraft(
  client: Client,
  path: StoredTrainingPath,
  content: PathContent,
): Promise<{ error: string | null }> {
  return upsertPathDraft(client, path, content)
}

export async function publishCompanyPath(
  client: Client,
  path: StoredTrainingPath,
): Promise<{ error: string | null }> {
  const draft = currentDraft(path.versions)
  if (!draft) return { error: "Save a draft before publishing." }
  const published = currentPublished(path.versions)
  if (published) {
    const { error } = await client
      .from("company_training_path_versions")
      .update({ status: "superseded" })
      .eq("id", published.id)
      .eq("company_id", path.companyId)
    if (error) return { error: error.message }
  }
  const { error } = await client
    .from("company_training_path_versions")
    .update({ status: "published" })
    .eq("id", draft.id)
    .eq("company_id", path.companyId)
  return { error: error?.message ?? null }
}

export async function setCompanyPathLibraryStatus(
  client: Client,
  path: StoredTrainingPath,
  libraryStatus: TrainingLibraryStatus,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("company_training_paths")
    .update({ library_status: libraryStatus })
    .eq("id", path.id)
    .eq("company_id", path.companyId)
  return { error: error?.message ?? null }
}

export async function createTrainingPath(
  client: Client,
  companyId: string,
  content: PathContent,
): Promise<{ error: string | null; pathId: string | null }> {
  const { data, error } = await client
    .from("company_training_paths")
    .insert({
      company_id: companyId,
      title: content.title,
      library_status: "active",
    })
    .select("id")
    .single()
  if (error || !data) return { error: error?.message ?? "create failed", pathId: null }
  const { error: versionError } = await client.from("company_training_path_versions").insert({
    path_id: data.id,
    company_id: companyId,
    version: 1,
    status: "draft",
    content: clonePathContent(content) as unknown as JsonValue,
  })
  if (versionError) return { error: versionError.message, pathId: null }
  return { error: null, pathId: data.id }
}

export function editableCourseContent(course: StoredCompanyCourse): CourseContent | null {
  return editorVersion(course.versions)?.content ?? null
}

export function editablePathContent(path: StoredTrainingPath): PathContent | null {
  return editorVersion(path.versions)?.content ?? null
}
