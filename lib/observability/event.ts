const ALLOWED_PLATFORMS = new Set(["javascript", "node"])
const ALLOWED_LEVELS = new Set(["fatal", "error", "warning"])
const ALLOWED_ENVIRONMENTS = new Set(["staging", "production"])
const MAX_MESSAGE_LENGTH = 1024
const MAX_EVENT_ID_LENGTH = 64
const MAX_EXCEPTION_VALUES = 5
const MAX_FRAMES = 50

export const GENERIC_SENTRY_ERROR_MESSAGE = "Application error"

export const ALLOWED_SENTRY_ERROR_CODES = new Set<string>()

export function resolveSafeErrorMessage(value: unknown): string {
  if (typeof value === "string" && ALLOWED_SENTRY_ERROR_CODES.has(value)) {
    return value
  }

  return GENERIC_SENTRY_ERROR_MESSAGE
}

export const SENTRY_EVENT_ALLOWLIST = [
  "type",
  "event_id",
  "timestamp",
  "platform",
  "level",
  "environment",
  "exception",
  "message",
] as const

export type SanitizedSentryEvent = {
  type: undefined
  event_id?: string
  timestamp?: number
  platform?: string
  level?: string
  environment?: string
  message?: string
  exception?: {
    values: Array<{
      type?: string
      value?: string
      mechanism?: {
        type: string
        handled?: boolean
      }
      stacktrace?: {
        frames: Array<{
          filename?: string
          function?: string
          lineno?: number
          colno?: number
          in_app?: boolean
        }>
      }
    }>
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function asBoundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    return undefined
  }

  return value
}

function sanitizeFilename(value: unknown): string | undefined {
  const filename = asBoundedString(value, MAX_MESSAGE_LENGTH)
  if (!filename) {
    return undefined
  }

  const queryIndex = filename.indexOf("?")
  return queryIndex === -1 ? filename : filename.slice(0, queryIndex)
}

function sanitizeMechanism(
  value: unknown,
): { type: string; handled?: boolean } | undefined {
  if (!isPlainObject(value) || typeof value.type !== "string" || value.type.length === 0) {
    return undefined
  }

  const mechanism: { type: string; handled?: boolean } = { type: value.type }
  if (typeof value.handled === "boolean") {
    mechanism.handled = value.handled
  }

  return mechanism
}

function sanitizeFrame(value: unknown) {
  if (!isPlainObject(value)) {
    throw new Error("invalid stack frame")
  }

  const frame: {
    filename?: string
    function?: string
    lineno?: number
    colno?: number
    in_app?: boolean
  } = {}

  const filename = sanitizeFilename(value.filename)
  const fn = asBoundedString(value.function, MAX_MESSAGE_LENGTH)
  const lineno = asFiniteNumber(value.lineno)
  const colno = asFiniteNumber(value.colno)

  if (filename) frame.filename = filename
  if (fn) frame.function = fn
  if (lineno !== undefined) frame.lineno = lineno
  if (colno !== undefined) frame.colno = colno
  if (typeof value.in_app === "boolean") frame.in_app = value.in_app

  return frame
}

function sanitizeException(value: unknown): SanitizedSentryEvent["exception"] {
  if (!isPlainObject(value) || !Array.isArray(value.values) || value.values.length === 0) {
    return undefined
  }

  const values = value.values.slice(0, MAX_EXCEPTION_VALUES).map((item) => {
    if (!isPlainObject(item)) {
      throw new Error("invalid exception value")
    }

    const exception: NonNullable<SanitizedSentryEvent["exception"]>["values"][number] =
      {}

    const type = asBoundedString(item.type, MAX_MESSAGE_LENGTH)
    const mechanism = sanitizeMechanism(item.mechanism)

    if (type) exception.type = type
    exception.value = resolveSafeErrorMessage(item.value)
    if (mechanism) exception.mechanism = mechanism

    if (isPlainObject(item.stacktrace) && Array.isArray(item.stacktrace.frames)) {
      exception.stacktrace = {
        frames: item.stacktrace.frames.slice(0, MAX_FRAMES).map(sanitizeFrame),
      }
    }

    if (!exception.type && !exception.stacktrace) {
      throw new Error("empty exception value")
    }

    return exception
  })

  return { values }
}

function hasMessage(value: unknown): boolean {
  return (
    typeof value === "string" ||
    (isPlainObject(value) && typeof value.formatted === "string")
  )
}

function sanitizeMessage(value: unknown): string | undefined {
  if (!hasMessage(value)) {
    return undefined
  }

  if (typeof value === "string") {
    return resolveSafeErrorMessage(value)
  }

  if (isPlainObject(value)) {
    return resolveSafeErrorMessage(value.formatted)
  }

  return GENERIC_SENTRY_ERROR_MESSAGE
}

function sanitizeSentryEventOrThrow(event: unknown): SanitizedSentryEvent {
  if (!isPlainObject(event)) {
    throw new Error("invalid event")
  }

  if (event.type !== undefined) {
    throw new Error("non-error event")
  }

  const exception = sanitizeException(event.exception)
  const message = sanitizeMessage(event.message)

  if (!exception && !message) {
    throw new Error("no allowlisted error payload")
  }

  const sanitized: SanitizedSentryEvent = { type: undefined }

  const eventId = asBoundedString(event.event_id, MAX_EVENT_ID_LENGTH)
  const timestamp = asFiniteNumber(event.timestamp)
  const platform =
    typeof event.platform === "string" && ALLOWED_PLATFORMS.has(event.platform)
      ? event.platform
      : undefined
  const level =
    typeof event.level === "string" && ALLOWED_LEVELS.has(event.level)
      ? event.level
      : undefined
  const environment =
    typeof event.environment === "string" && ALLOWED_ENVIRONMENTS.has(event.environment)
      ? event.environment
      : undefined

  if (eventId) sanitized.event_id = eventId
  if (timestamp !== undefined) sanitized.timestamp = timestamp
  if (platform) sanitized.platform = platform
  if (level) sanitized.level = level
  if (environment) sanitized.environment = environment
  if (exception) sanitized.exception = exception
  if (message) sanitized.message = message

  return sanitized
}

export function sanitizeSentryEvent(event: unknown): SanitizedSentryEvent | null {
  try {
    return sanitizeSentryEventOrThrow(event)
  } catch {
    return null
  }
}

export function filterSentryEnvelope(envelope: unknown): unknown | null {
  try {
    if (!Array.isArray(envelope) || envelope.length < 2) {
      throw new Error("invalid envelope")
    }

    const [headers, items] = envelope
    if (!isPlainObject(headers) || !Array.isArray(items)) {
      throw new Error("invalid envelope parts")
    }

    const safeItems = items.flatMap((item) => {
      if (!Array.isArray(item) || item.length < 2 || !isPlainObject(item[0])) {
        throw new Error("invalid envelope item")
      }

      if (item[0].type !== "event") {
        return []
      }

      const sanitized = sanitizeSentryEvent(item[1])
      if (!sanitized) {
        return []
      }

      return [[{ type: "event" }, sanitized]]
    })

    if (safeItems.length === 0) {
      return null
    }

    return [{}, safeItems]
  } catch {
    return null
  }
}
