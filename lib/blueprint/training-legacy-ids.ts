import { createHash } from "node:crypto"

/**
 * Stable UUID namespace for LearnDash → V2 identifier mapping.
 * uuid v5, so the same legacy post id always yields the same V2 id.
 */
export const LEGACY_UUID_NAMESPACE = "8f2c6d1a-9b47-5e0c-a3d1-6e5b4c7a9012"

export const LEGACY_ID_KINDS = [
  "course",
  "course-version",
  "lesson",
  "text",
  "video",
  "resource",
  "quiz",
  "question",
  "option",
  "assignment",
] as const
export type LegacyIdKind = (typeof LEGACY_ID_KINDS)[number]

export function legacyUuid(kind: LegacyIdKind, sourceId: string): string {
  const namespace = Buffer.from(LEGACY_UUID_NAMESPACE.replaceAll("-", ""), "hex")
  const hash = createHash("sha1").update(namespace).update(`${kind}:${sourceId}`).digest()
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
