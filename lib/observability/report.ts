import * as Sentry from "@sentry/nextjs"

import { isSentryEnabled } from "@/lib/observability/env"

export function reportIsolatedException(error: unknown): void {
  try {
    if (!isSentryEnabled()) {
      return
    }

    Sentry.captureException(error)
  } catch {
    // Monitoring must never break the application.
  }
}
