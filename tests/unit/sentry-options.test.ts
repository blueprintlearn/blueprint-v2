import { afterEach, describe, expect, it } from "vitest"

import { onRequestError } from "@/instrumentation"
import { getSentryDsn, getSentryEnvironment, isSentryEnabled } from "@/lib/observability/env"
import {
  GENERIC_SENTRY_ERROR_MESSAGE,
} from "@/lib/observability/event"
import {
  DISABLED_SENTRY_INTEGRATIONS,
  getSentryInitOptions,
  lockSentryTransport,
  wrapSentryTransport,
} from "@/lib/observability/options"
import { reportIsolatedException } from "@/lib/observability/report"

const testDsn = "https://public@127.0.0.1/1"
const leakedMessage =
  "Login failed for owner-a@blueprint.test with password blueprint-local-password at Company A"

async function initCapturingClient() {
  const Sentry = await import("@sentry/nextjs")
  const options = getSentryInitOptions({
    NEXT_PUBLIC_SENTRY_DSN: testDsn,
    SENTRY_DSN: testDsn,
    SENTRY_ENVIRONMENT: "staging",
  })

  const sent: unknown[] = []

  Sentry.init({
    ...options!,
    transport: wrapSentryTransport(() => ({
      send(envelope: never) {
        sent.push(envelope)
        return Promise.resolve({})
      },
      flush: () => Promise.resolve(true),
    })) as never,
  })

  return { Sentry, sent, options: options! }
}

describe("Sentry env and init options", () => {
  it("is disabled without a DSN and does not throw", () => {
    const source = {}

    expect(getSentryDsn(source)).toBeUndefined()
    expect(isSentryEnabled(source)).toBe(false)
    expect(getSentryInitOptions(source)).toBeNull()
    expect(getSentryEnvironment({ VERCEL_ENV: "development" })).toBeUndefined()
  })

  it("maps preview to staging and keeps production separate", () => {
    expect(
      getSentryInitOptions({
        NEXT_PUBLIC_SENTRY_DSN: testDsn,
        SENTRY_ENVIRONMENT: "staging",
      })?.environment,
    ).toBe("staging")
    expect(
      getSentryInitOptions({
        SENTRY_DSN: testDsn,
        VERCEL_ENV: "preview",
      })?.environment,
    ).toBe("staging")
    expect(
      getSentryInitOptions({
        SENTRY_DSN: testDsn,
        VERCEL_ENV: "production",
      })?.environment,
    ).toBe("production")
  })

  it("disables breadcrumbs, tracing, replay, logs, and request context", () => {
    const options = getSentryInitOptions({
      SENTRY_DSN: testDsn,
      SENTRY_ENVIRONMENT: "staging",
    })

    expect(options?.maxBreadcrumbs).toBe(0)
    expect(options?.beforeBreadcrumb?.()).toBeNull()
    expect(options?.beforeSendTransaction?.()).toBeNull()
    expect(options?.beforeSendLog?.()).toBeNull()
    expect(options?.beforeSendMetric?.()).toBeNull()
    expect(options?.dataCollection.httpBodies).toEqual([])
    expect(options?.dataCollection.cookies).toBe(false)
    expect(options?.dataCollection.userInfo).toBe(false)
    expect(
      options?.integrations([
        { name: "Breadcrumbs" },
        { name: "BrowserTracing" },
        { name: "Replay" },
        { name: "RequestData" },
        { name: "HttpContext" },
        { name: "LinkedErrors" },
      ]),
    ).toEqual([{ name: "LinkedErrors" }])
    expect(DISABLED_SENTRY_INTEGRATIONS.has("Replay")).toBe(true)
  })
})

describe("Sentry client and server capture", () => {
  afterEach(async () => {
    const Sentry = await import("@sentry/nextjs")
    const client = Sentry.getClient()
    await client?.close()
    delete process.env.SENTRY_DSN
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    delete process.env.SENTRY_ENVIRONMENT
  })

  it("does not send when no DSN is configured", async () => {
    const Sentry = await import("@sentry/nextjs")
    const sent: unknown[] = []

    expect(getSentryInitOptions({})).toBeNull()

    Sentry.init({
      dsn: undefined,
      enabled: false,
      transport: () => ({
        send(envelope: unknown) {
          sent.push(envelope)
          return Promise.resolve({})
        },
        flush: () => Promise.resolve(true),
      }),
    })

    reportIsolatedException(new Error(leakedMessage))
    await Sentry.flush(1000)

    expect(sent).toEqual([])
  })

  it("does not transmit email, password, or company name through capture", async () => {
    process.env.SENTRY_DSN = testDsn
    process.env.NEXT_PUBLIC_SENTRY_DSN = testDsn
    process.env.SENTRY_ENVIRONMENT = "staging"

    const { Sentry, sent } = await initCapturingClient()

    Sentry.setUser({ email: "owner-a@blueprint.test", id: "user-a" })
    Sentry.setExtra("companyName", "Company A")
    Sentry.addBreadcrumb({ message: leakedMessage })
    reportIsolatedException(new Error(leakedMessage))
    await Sentry.flush(2000)

    expect(sent).toHaveLength(1)
    const serialized = JSON.stringify(sent[0])
    expect(serialized).toContain(GENERIC_SENTRY_ERROR_MESSAGE)
    expect(serialized).not.toContain("owner-a@blueprint.test")
    expect(serialized).not.toContain("blueprint-local-password")
    expect(serialized).not.toContain("Company A")
    expect(serialized).not.toContain(leakedMessage)
  })

  it("uses the same reporter for Next.js onRequestError", async () => {
    process.env.SENTRY_DSN = testDsn
    process.env.NEXT_PUBLIC_SENTRY_DSN = testDsn
    process.env.SENTRY_ENVIRONMENT = "staging"

    const { Sentry, sent } = await initCapturingClient()

    onRequestError(
      new Error(leakedMessage),
      {
        path: "/?email=owner-a@blueprint.test",
        method: "POST",
        headers: { cookie: "sb-access-token=secret", authorization: "Bearer secret" },
      },
      {
        routerKind: "App Router",
        routePath: "/",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
      },
    )
    await Sentry.flush(2000)

    expect(sent).toHaveLength(1)
    expect(JSON.stringify(sent[0])).toContain(GENERIC_SENTRY_ERROR_MESSAGE)
    expect(JSON.stringify(sent[0])).not.toContain("owner-a@blueprint.test")
    expect(JSON.stringify(sent[0])).not.toContain("blueprint-local-password")
    expect(JSON.stringify(sent[0])).not.toContain("Company A")
    expect(JSON.stringify(sent[0])).not.toContain("/?email=")
  })

  it("drops envelope types that bypass beforeSend", async () => {
    const sent: unknown[] = []
    const transport = wrapSentryTransport(() => ({
      send(envelope: never) {
        sent.push(envelope)
        return Promise.resolve({})
      },
      flush: () => Promise.resolve(true),
    }))(undefined as never)

    const dropped = await transport.send([
      {},
      [[{ type: "session" }, { email: "owner-a@blueprint.test" }]],
    ] as never)

    expect(dropped).toEqual({})
    expect(sent).toEqual([])
  })

  it("locks an already-created SDK transport so sendEnvelope cannot leak", async () => {
    const Sentry = await import("@sentry/nextjs")
    const sent: unknown[] = []

    Sentry.init({
      dsn: testDsn,
      transport: () => ({
        send(envelope: unknown) {
          sent.push(envelope)
          return Promise.resolve({})
        },
        flush: () => Promise.resolve(true),
      }),
    })

    lockSentryTransport(Sentry.getClient()?.getTransport() as never)
    await Sentry.getClient()?.sendEnvelope([
      { event_id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", sent_at: "2026-10-08T00:00:00.000Z" },
      [
        [
          { type: "event" },
          {
            message: leakedMessage,
            exception: { values: [{ type: "Error", value: leakedMessage }] },
          },
        ],
      ],
    ] as never)

    expect(sent).toHaveLength(1)
    expect(JSON.stringify(sent[0])).toContain(GENERIC_SENTRY_ERROR_MESSAGE)
    expect(JSON.stringify(sent[0])).not.toContain("owner-a@blueprint.test")
    expect(JSON.stringify(sent[0])).not.toContain("blueprint-local-password")
    expect(JSON.stringify(sent[0])).not.toContain("Company A")
  })
})
