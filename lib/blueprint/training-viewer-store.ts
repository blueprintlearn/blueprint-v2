import { loadTraineeEnrollment } from "@/lib/blueprint/training-enrollment-store"
import { parseCourseContent, parsePathContent } from "@/lib/blueprint/training-library"
import {
  toTraineeCourseView,
  toTraineePathView,
  type TraineeAssignedView,
  type TraineeCourseView,
} from "@/lib/blueprint/training-viewer"
import type { createClient } from "@/lib/supabase/server"

type Client = Awaited<ReturnType<typeof createClient>>

const COURSE_VERSION_COLUMNS = "id, course_id, version, status, content" as const
const PATH_VERSION_COLUMNS = "id, path_id, version, status, content" as const

function asFrozenStatus(value: string): "published" | "superseded" | null {
  return value === "published" || value === "superseded" ? value : null
}

export async function loadAssignedTrainingView(
  client: Client,
  enrollmentId: string,
): Promise<TraineeAssignedView | null> {
  const enrollment = await loadTraineeEnrollment(client, enrollmentId)
  if (!enrollment) return null
  if (enrollment.targetKind === "course") {
    if (!enrollment.courseId) return null
    const { data, error } = await client
      .from("company_training_course_versions")
      .select(COURSE_VERSION_COLUMNS)
      .eq("course_id", enrollment.courseId)
      .eq("version", enrollment.contentVersion)
      .in("status", ["published", "superseded"])
      .maybeSingle()
    if (error || !data) return null
    const status = asFrozenStatus(data.status)
    const content = parseCourseContent(data.content)
    if (!status || !content) return null
    return toTraineeCourseView(enrollment.id, data.version, status, content)
  }
  if (!enrollment.pathId) return null
  const { data, error } = await client
    .from("company_training_path_versions")
    .select(PATH_VERSION_COLUMNS)
    .eq("path_id", enrollment.pathId)
    .eq("version", enrollment.contentVersion)
    .in("status", ["published", "superseded"])
    .maybeSingle()
  if (error || !data) return null
  const status = asFrozenStatus(data.status)
  const content = parsePathContent(data.content)
  if (!status || !content) return null
  return toTraineePathView(enrollment.id, data.version, status, content)
}

export async function loadAssignedCourseLesson(
  client: Client,
  enrollmentId: string,
  lessonId: string,
): Promise<{ course: TraineeCourseView; lesson: TraineeCourseView["lessons"][number] } | null> {
  const view = await loadAssignedTrainingView(client, enrollmentId)
  if (!view || view.kind !== "course") return null
  const lesson = view.lessons.find((item) => item.id === lessonId)
  if (!lesson) return null
  return { course: view, lesson }
}
