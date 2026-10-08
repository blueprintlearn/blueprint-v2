export type ObservabilityEnvSource = Record<string, string | undefined>

export type SentryEnvironment = "staging" | "production"

export function getSentryDsn(
  source: ObservabilityEnvSource = process.env,
): string | undefined {
  const dsn = source.SENTRY_DSN?.trim() || source.NEXT_PUBLIC_SENTRY_DSN?.trim()
  return dsn || undefined
}

export function getSentryEnvironment(
  source: ObservabilityEnvSource = process.env,
): SentryEnvironment | undefined {
  if (source.SENTRY_ENVIRONMENT === "staging" || source.SENTRY_ENVIRONMENT === "production") {
    return source.SENTRY_ENVIRONMENT
  }

  if (source.VERCEL_ENV === "production") {
    return "production"
  }

  if (source.VERCEL_ENV === "preview") {
    return "staging"
  }

  return undefined
}

export function isSentryEnabled(
  source: ObservabilityEnvSource = process.env,
): boolean {
  return getSentryDsn(source) !== undefined
}
