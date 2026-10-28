import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/ci.yml"), "utf8")

function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`)
  expect(start, `job ${name} exists`).toBeGreaterThan(-1)
  const rest = workflow.slice(start + 1)
  const next = rest.slice(1).search(/\n  [a-z][a-z0-9-]*:\n/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

describe("CI workflow", () => {
  it("runs for pull requests to and pushes on main and production", () => {
    expect(workflow).toMatch(/pull_request:\n\s+branches: \[main, production\]/)
    expect(workflow).toMatch(/push:\n\s+branches: \[main, production\]/)
  })

  it("keeps the prove job that the rulesets require", () => {
    expect(jobBlock("prove")).toMatch(/name: prove\n/)
  })

  it("only lets main from this repository into production", () => {
    const job = jobBlock("production-source")
    expect(job).toMatch(/name: production-source\n/)
    expect(job).toContain("github.event_name == 'pull_request' && github.base_ref == 'production'")
    expect(job).toContain('[ "$HEAD_REF" != "main" ] || [ "$HEAD_REPO" != "$GITHUB_REPOSITORY" ]')
    expect(job).toContain("exit 1")
  })

  it("never interpolates branch names into a shell script", () => {
    const runScripts = workflow.match(/run: \|\n(?:\s{10,}.*\n?)+/g) ?? []
    expect(runScripts.length).toBeGreaterThan(0)
    for (const script of runScripts) {
      expect(script).not.toMatch(/\$\{\{\s*github\.(head_ref|event\.pull_request)/)
    }
  })
})
