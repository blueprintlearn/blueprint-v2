import { z } from "zod"

export const CURRENT_DJ_COUNT_MIN = 0
export const CURRENT_DJ_COUNT_MAX = 999
export const DESIRED_DJ_COUNT_MIN = 0
export const DESIRED_DJ_COUNT_MAX = 999

const djCountSchema = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().min(min).max(max))

export const currentDjCountSchema = djCountSchema(
  CURRENT_DJ_COUNT_MIN,
  CURRENT_DJ_COUNT_MAX,
)
export const desiredDjCountSchema = djCountSchema(
  DESIRED_DJ_COUNT_MIN,
  DESIRED_DJ_COUNT_MAX,
)

function parseDjCount(
  value: unknown,
  schema: typeof currentDjCountSchema,
): number | null {
  if (typeof value !== "string") {
    return null
  }

  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function parseCurrentDjCount(value: unknown): number | null {
  return parseDjCount(value, currentDjCountSchema)
}

export function parseDesiredDjCount(value: unknown): number | null {
  return parseDjCount(value, desiredDjCountSchema)
}
