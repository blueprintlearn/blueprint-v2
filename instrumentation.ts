import type { Instrumentation } from "next"

import { reportIsolatedException } from "@/lib/observability/report"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError: Instrumentation.onRequestError = (error) => {
  reportIsolatedException(error)
}
