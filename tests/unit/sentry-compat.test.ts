import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { getSentryInitOptions } from "@/lib/observability/options"

const require = createRequire(import.meta.url)
const sentryNext = require("@sentry/nextjs/package.json") as {
  version: string
  peerDependencies: { next: string }
  engines: { node: string }
}

describe("@sentry/nextjs compatibility", () => {
  it("is the pinned SDK that declares Next.js 16 support", () => {
    expect(sentryNext.version).toBe("11.5.0")
    expect(sentryNext.peerDependencies.next).toContain("^16")
    expect(sentryNext.engines.node).toContain(">=22.12.0")
  })

  it("does not enable a Sentry tunnel route", () => {
    const nextConfig = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8")

    expect(nextConfig).not.toMatch(/tunnelRoute/)
    expect(nextConfig).not.toMatch(/sentry-tunnel/)
    expect(getSentryInitOptions({ SENTRY_DSN: "https://public@127.0.0.1/1" })).not.toHaveProperty(
      "tunnel",
    )
  })
})
