export const SYSTEM_ROLES = [
  "owner_admin",
  "manager",
  "trainer_mentor",
  "dj_trainee",
] as const

export type SystemRole = (typeof SYSTEM_ROLES)[number]

export const OWNER_ADMIN_ROLE: SystemRole = "owner_admin"

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  owner_admin: "Owner",
  manager: "Manager",
  trainer_mentor: "Trainer",
  dj_trainee: "DJ",
}

/** Customer-facing words for a role. Unknown roles get null so callers render nothing rather than a code. */
export function systemRoleLabel(role: string): string | null {
  return (SYSTEM_ROLES as readonly string[]).includes(role) ? SYSTEM_ROLE_LABELS[role as SystemRole] : null
}
