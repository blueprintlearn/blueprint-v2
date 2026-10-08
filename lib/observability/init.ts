import * as Sentry from "@sentry/nextjs"

import { getSentryInitOptions, lockSentryTransport } from "@/lib/observability/options"

export function initSentry(): void {
  try {
    const options = getSentryInitOptions()
    if (!options) {
      return
    }

    Sentry.init(options)
    lockSentryTransport(Sentry.getClient()?.getTransport() as never)
  } catch {
    // Monitoring must never break the application.
  }
}
