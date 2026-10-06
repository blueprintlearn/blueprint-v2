export const SYSTEM_ROLES = [
  "owner_admin",
  "manager",
  "trainer_mentor",
  "dj_trainee",
] as const

export type SystemRole = (typeof SYSTEM_ROLES)[number]

export const OWNER_ADMIN_ROLE: SystemRole = "owner_admin"
