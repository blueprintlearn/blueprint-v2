export type PublicEnvSource = Record<string, string | undefined>

export function getPublicEnv(source: PublicEnvSource = process.env): {
  url: string
  publishableKey: string
} {
  const url = source.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    )
  }

  return { url, publishableKey }
}
