import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

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
})
