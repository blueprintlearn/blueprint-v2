import { z } from "zod"

export const CURRENT_DJ_COUNT_MIN = 0
export const CURRENT_DJ_COUNT_MAX = 999

export const currentDjCountSchema = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform((value) => Number(value))
  .pipe(z.number().int().min(CURRENT_DJ_COUNT_MIN).max(CURRENT_DJ_COUNT_MAX))

export function parseCurrentDjCount(value: unknown): number | null {
  if (typeof value !== "string") {
    return null
  }

  const parsed = currentDjCountSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
