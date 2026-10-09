import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

const envSourcePath = resolve(process.cwd(), "lib/observability/env.ts")
const publicDsn = "https://inline-test-public@127.0.0.1/1"

function inlineNextPublicEnv(source: string): string {
  return source
    .replaceAll("process.env.NEXT_PUBLIC_SENTRY_DSN", JSON.stringify(publicDsn))
    .replaceAll("process.env.NEXT_PUBLIC_VERCEL_ENV", JSON.stringify("preview"))
}

async function loadInlinedEnvModule() {
  const source = readFileSync(envSourcePath, "utf8")
  const transpiled = ts.transpileModule(inlineNextPublicEnv(source), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText

  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`)
}

describe("Sentry public env inlining", () => {
  it("keeps static process.env.NEXT_PUBLIC lookups that Next.js can inline", () => {
    const source = readFileSync(envSourcePath, "utf8")

    expect(source).toContain("process.env.NEXT_PUBLIC_SENTRY_DSN")
    expect(source).toContain("process.env.NEXT_PUBLIC_VERCEL_ENV")
    expect(source).not.toMatch(/process\.env\[(['"`])NEXT_PUBLIC_SENTRY_DSN\1\]/)
  })

  it("still resolves DSN and staging after Next-style browser inlining", async () => {
    const env = await loadInlinedEnvModule()

    expect(env.getSentryDsn({})).toBe(publicDsn)
    expect(env.isSentryEnabled({})).toBe(true)
    expect(env.getSentryEnvironment({})).toBe("staging")
  })

  it("fails closed if only a dynamic source.NEXT_PUBLIC lookup exists", async () => {
    const dynamicOnly = `
      export function getSentryDsn(source = {}) {
        return source.SENTRY_DSN?.trim() || source.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined
      }
    `
    const inlined = inlineNextPublicEnv(dynamicOnly)
    expect(inlined).toContain("source.NEXT_PUBLIC_SENTRY_DSN")
    expect(inlined).not.toContain(publicDsn)

    const transpiled = ts.transpileModule(inlined, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const env = await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`
    )

    expect(env.getSentryDsn({})).toBeUndefined()
  })
})
