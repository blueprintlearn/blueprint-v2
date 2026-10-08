import type { ErrorEvent } from "@sentry/nextjs"

import {
  getSentryDsn,
  getSentryEnvironment,
  type ObservabilityEnvSource,
} from "@/lib/observability/env"
import { filterSentryEnvelope, sanitizeSentryEvent } from "@/lib/observability/event"

export const DISABLED_SENTRY_INTEGRATIONS = new Set([
  "Breadcrumbs",
  "HttpContext",
  "BrowserSession",
  "Console",
  "RequestData",
  "ContextLines",
  "LocalVariables",
  "Http",
  "NodeFetch",
  "Undici",
  "BrowserTracing",
  "Replay",
  "ReplayCanvas",
  "Feedback",
  "ProcessSession",
  "Modules",
  "ChildProcess",
  "Spotlight",
  "WorkerThreads",
])

type SentryTransportLike = {
  send: (envelope: never) => PromiseLike<unknown>
  flush: (timeout?: number) => PromiseLike<boolean>
}

export function wrapSentryTransport(
  createTransport: (transportOptions: never) => SentryTransportLike,
) {
  return (transportOptions: never): SentryTransportLike => {
    const inner = createTransport(transportOptions)
    return {
      send(envelope: never) {
        try {
          const filtered = filterSentryEnvelope(envelope)
          if (!filtered) {
            return Promise.resolve({})
          }

          return inner.send(filtered as never)
        } catch {
          return Promise.resolve({})
        }
      },
      flush: (timeout?: number) => inner.flush(timeout),
    }
  }
}

export function lockSentryTransport(transport: SentryTransportLike | undefined): void {
  if (!transport) {
    return
  }

  const originalSend = transport.send.bind(transport)
  transport.send = ((envelope: unknown) => {
    try {
      const filtered = filterSentryEnvelope(envelope)
      if (!filtered) {
        return Promise.resolve({})
      }

      return originalSend(filtered as never)
    } catch {
      return Promise.resolve({})
    }
  }) as SentryTransportLike["send"]
}

export function getSentryInitOptions(source: ObservabilityEnvSource = process.env) {
  const dsn = getSentryDsn(source)
  if (!dsn) {
    return null
  }

  const environment = getSentryEnvironment(source)

  return {
    dsn,
    enabled: true as const,
    ...(environment ? { environment } : {}),
    includeServerName: false as const,
    sendClientReports: false as const,
    maxBreadcrumbs: 0,
    integrations(integrations: Array<{ name: string }>) {
      return integrations.filter(
        (integration) => !DISABLED_SENTRY_INTEGRATIONS.has(integration.name),
      )
    },
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [] as [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    beforeSend(event: ErrorEvent): ErrorEvent | null {
      return sanitizeSentryEvent(event) as ErrorEvent | null
    },
    beforeSendTransaction() {
      return null
    },
    beforeSendLog() {
      return null
    },
    beforeSendMetric() {
      return null
    },
    beforeBreadcrumb() {
      return null
    },
  }
}
