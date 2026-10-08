import { describe, expect, it } from "vitest"

import {
  ALLOWED_SENTRY_ERROR_CODES,
  GENERIC_SENTRY_ERROR_MESSAGE,
  SENTRY_EVENT_ALLOWLIST,
  filterSentryEnvelope,
  sanitizeSentryEvent,
} from "@/lib/observability/event"

const dirtyEvent = {
  event_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  timestamp: 1_700_000_000,
  platform: "javascript",
  level: "error",
  environment: "staging",
  message:
    "Failed for owner-a@blueprint.test with password blueprint-local-password at Company A",
  exception: {
    values: [
      {
        type: "Error",
        value:
          "Failed for owner-a@blueprint.test with password blueprint-local-password at Company A",
        mechanism: {
          type: "generic",
          handled: true,
          data: { email: "owner-a@blueprint.test" },
        },
        module: "lib/tenancy/queries",
        stacktrace: {
          frames: [
            {
              filename: "app/page.tsx?user=owner-a@blueprint.test",
              function: "HomePage",
              lineno: 10,
              colno: 4,
              in_app: true,
              abs_path: "/Users/david/secrets/app/page.tsx",
              vars: {
                password: "blueprint-local-password",
                companyName: "Company A",
              },
              context_line: "const email = 'owner-a@blueprint.test'",
              pre_context: ["const password = 'blueprint-local-password'"],
            },
          ],
        },
      },
    ],
  },
  user: {
    email: "owner-a@blueprint.test",
    id: "user-a",
    ip_address: "203.0.113.10",
  },
  request: {
    url: "/?company=Company%20A",
    cookies: { "sb-access-token": "secret-cookie" },
    headers: { authorization: "Bearer secret", cookie: "session=1" },
    data: { password: "blueprint-local-password", name: "Company A" },
  },
  breadcrumbs: [{ message: "signed in as owner-a@blueprint.test" }],
  extra: { companyName: "Company B", password: "secret" },
  contexts: { tenant: { companyName: "Company A" } },
  tags: { company: "Company A" },
  server_name: "davids-macbook",
  transaction: "/sign-in?email=owner-a@blueprint.test",
  sdk: { name: "sentry.javascript.nextjs" },
}

describe("sanitizeSentryEvent", () => {
  it("replaces raw messages and keeps only allowlisted error fields", () => {
    const sanitized = sanitizeSentryEvent(dirtyEvent)

    expect(sanitized).toEqual({
      type: undefined,
      event_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      timestamp: 1_700_000_000,
      platform: "javascript",
      level: "error",
      environment: "staging",
      message: GENERIC_SENTRY_ERROR_MESSAGE,
      exception: {
        values: [
          {
            type: "Error",
            value: GENERIC_SENTRY_ERROR_MESSAGE,
            mechanism: { type: "generic", handled: true },
            stacktrace: {
              frames: [
                {
                  filename: "app/page.tsx",
                  function: "HomePage",
                  lineno: 10,
                  colno: 4,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
    })
    expect(Object.keys(sanitized ?? {}).sort()).toEqual(
      [...SENTRY_EVENT_ALLOWLIST].sort(),
    )
  })

  it("does not transmit an email, password, or company name from the error", () => {
    const sanitized = sanitizeSentryEvent(dirtyEvent)
    const serialized = JSON.stringify(sanitized)

    expect(sanitized?.message).toBe(GENERIC_SENTRY_ERROR_MESSAGE)
    expect(sanitized?.exception?.values[0]?.value).toBe(GENERIC_SENTRY_ERROR_MESSAGE)
    expect(serialized).not.toContain("owner-a@blueprint.test")
    expect(serialized).not.toContain("blueprint-local-password")
    expect(serialized).not.toContain("Company A")
    expect(serialized).not.toContain("Company B")
    expect(serialized).not.toContain("Failed for")
  })

  it("discards request, user, breadcrumbs, extras, and unknown metadata", () => {
    const sanitized = sanitizeSentryEvent(dirtyEvent)

    expect(sanitized).not.toHaveProperty("user")
    expect(sanitized).not.toHaveProperty("request")
    expect(sanitized).not.toHaveProperty("breadcrumbs")
    expect(sanitized).not.toHaveProperty("extra")
    expect(sanitized).not.toHaveProperty("contexts")
    expect(sanitized).not.toHaveProperty("tags")
    expect(sanitized).not.toHaveProperty("server_name")
    expect(sanitized).not.toHaveProperty("transaction")
    expect(sanitized).not.toHaveProperty("sdk")
  })

  it("keeps only an explicitly allowlisted error code", () => {
    ALLOWED_SENTRY_ERROR_CODES.add("auth.unhandled")

    try {
      const sanitized = sanitizeSentryEvent({
        exception: { values: [{ type: "Error", value: "auth.unhandled" }] },
        message: "auth.unhandled",
      })

      expect(sanitized?.message).toBe("auth.unhandled")
      expect(sanitized?.exception?.values[0]?.value).toBe("auth.unhandled")
    } finally {
      ALLOWED_SENTRY_ERROR_CODES.delete("auth.unhandled")
    }
  })

  it("fails closed when sanitization throws or the payload is not an error", () => {
    const throwingEvent = new Proxy(
      {},
      {
        get() {
          throw new Error("cannot read event")
        },
      },
    )

    expect(sanitizeSentryEvent(throwingEvent)).toBeNull()
    expect(sanitizeSentryEvent(null)).toBeNull()
    expect(sanitizeSentryEvent({ type: "transaction", message: "trace" })).toBeNull()
    expect(sanitizeSentryEvent({ extra: { companyName: "Company A" } })).toBeNull()
  })

  it("drops non-error envelope items that would bypass beforeSend", () => {
    const filtered = filterSentryEnvelope([
      { dsn: "https://public@127.0.0.1/1", trace: { transaction: "/sign-in" } },
      [
        [{ type: "session" }, { sid: "abc", email: "owner-a@blueprint.test" }],
        [{ type: "transaction" }, dirtyEvent],
        [{ type: "log" }, { body: "password blueprint-local-password" }],
        [{ type: "event" }, dirtyEvent],
      ],
    ])

    expect(filtered).toEqual([
      {},
      [[{ type: "event" }, sanitizeSentryEvent(dirtyEvent)]],
    ])
    expect(JSON.stringify(filtered)).not.toContain("owner-a@blueprint.test")
    expect(JSON.stringify(filtered)).not.toContain("blueprint-local-password")
    expect(JSON.stringify(filtered)).not.toContain("Company A")
    expect(filterSentryEnvelope([{ type: "session" }, [[{ type: "session" }, {}]]])).toBeNull()
  })
})
