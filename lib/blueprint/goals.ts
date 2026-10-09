import { z } from "zod"

export const OWNER_GOAL_CODES = [
  "dj_less",
  "stop_djing",
  "scale",
  "expand",
  "improve_quality",
  "create_leadership",
  "other",
] as const

export type OwnerGoalCode = (typeof OWNER_GOAL_CODES)[number]

export const OWNER_GOAL_LABELS: Record<OwnerGoalCode, string> = {
  dj_less: "DJ less",
  stop_djing: "Stop DJing",
  scale: "Scale",
  expand: "Expand",
  improve_quality: "Improve quality",
  create_leadership: "Create leadership",
  other: "Other",
}

export const OWNER_GOAL_OTHER_MAX_LENGTH = 80

export type OwnerGoalInput = {
  ownerGoal: OwnerGoalCode
  ownerGoalOther: string | null
}

export const ownerGoalSchema = z
  .object({
    ownerGoal: z.enum(OWNER_GOAL_CODES),
    ownerGoalOther: z.string().trim().max(OWNER_GOAL_OTHER_MAX_LENGTH).optional(),
  })
  .superRefine((value, context) => {
    const other = value.ownerGoalOther ?? ""

    if (value.ownerGoal === "other" && other.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerGoalOther"],
        message: "Enter a company-defined goal.",
      })
    }
  })
  .transform((value): OwnerGoalInput => ({
    ownerGoal: value.ownerGoal,
    ownerGoalOther: value.ownerGoal === "other" ? (value.ownerGoalOther ?? "") : null,
  }))

export function parseOwnerGoal(input: {
  ownerGoal: unknown
  ownerGoalOther?: unknown
}): OwnerGoalInput | null {
  const parsed = ownerGoalSchema.safeParse({
    ownerGoal: input.ownerGoal,
    ownerGoalOther:
      typeof input.ownerGoalOther === "string" ? input.ownerGoalOther : undefined,
  })

  return parsed.success ? parsed.data : null
}
