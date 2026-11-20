import {
  traineeCourseViewFromSnapshot,
  traineePathViewFromSnapshot,
  type TraineeAssignedView,
  type TraineeCourseView,
} from "@/lib/blueprint/training-viewer"
import type { createClient } from "@/lib/supabase/server"

type Client = Awaited<ReturnType<typeof createClient>>

type SnapshotOk = {
  ok: true
  kind: "course" | "path"
  enrollmentId: string
  version: number
  status: string
  content: unknown
}

type SnapshotErr = { ok: false; code: string }

function asFrozenStatus(value: string): "published" | "superseded" | null {
  return value === "published" || value === "superseded" ? value : null
}

function asSnapshot(value: unknown): SnapshotOk | SnapshotErr | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.ok === false) {
    return typeof record.code === "string" ? { ok: false, code: record.code } : null
  }
  if (record.ok !== true) return null
  if (record.kind !== "course" && record.kind !== "path") return null
  if (typeof record.enrollmentId !== "string") return null
  if (typeof record.version !== "number" || !Number.isFinite(record.version)) return null
  if (typeof record.status !== "string") return null
  return {
    ok: true,
    kind: record.kind,
    enrollmentId: record.enrollmentId,
    version: record.version,
    status: record.status,
    content: record.content,
  }
}

export async function loadAssignedTrainingView(
  client: Client,
  enrollmentId: string,
): Promise<TraineeAssignedView | null> {
  const { data, error } = await client.rpc("get_assigned_training_snapshot", {
    p_enrollment_id: enrollmentId,
  })
  if (error || data == null) return null
  const snapshot = asSnapshot(data)
  if (!snapshot || snapshot.ok === false) return null
  if (snapshot.enrollmentId !== enrollmentId) return null
  const status = asFrozenStatus(snapshot.status)
  if (!status) return null
  if (snapshot.kind === "course") {
    return traineeCourseViewFromSnapshot(snapshot.enrollmentId, snapshot.version, status, snapshot.content)
  }
  return traineePathViewFromSnapshot(snapshot.enrollmentId, snapshot.version, status, snapshot.content)
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
