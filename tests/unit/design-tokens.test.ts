import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../..")
const read = (file: string) => readFileSync(path.join(root, file), "utf8")
const declared = (css: string) => new Set([...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]))

const tokensCss = read("styles/blueprint/tokens.css")
const blueprintCss = ["app/globals.css", "styles/blueprint/components.css", "styles/blueprint/tokens.css"]
const tailwindTheme = readFileSync(createRequire(import.meta.url).resolve("tailwindcss/theme.css"), "utf8")

describe("Blueprint design tokens", () => {
  it("tokens.css is generated from tokens.json", () => {
    expect(() =>
      execFileSync(process.execPath, ["scripts/build-blueprint-tokens.mjs", "--check"], { cwd: root, stdio: "pipe" }),
    ).not.toThrow()
  })

  it("defines no custom property that shadows a Tailwind default theme variable", () => {
    const tailwindNames = declared(tailwindTheme)
    const collisions = blueprintCss.flatMap((file) => [...declared(read(file))].filter((name) => tailwindNames.has(name)))
    expect(collisions).toEqual([])
  })

  it("keeps the approved radius values behind the rounded-bp-* utilities", () => {
    expect(tokensCss).toContain("--bp-radius-drafted: 4px;")
    expect(tokensCss).toContain("--bp-radius-sm: 10px;")
    expect(tokensCss).toContain("--bp-radius-md: 18px;")
    expect(tokensCss).toContain("--bp-radius-lg: 24px;")
    expect(tokensCss).toContain("--bp-radius-xl: 30px;")
    expect(tokensCss).toContain("--bp-radius-2xl: 34px;")
    expect(tokensCss).toContain("--bp-radius-pill: 999px;")
    const theme = read("styles/blueprint/tailwind-theme.css")
    for (const size of ["drafted", "sm", "md", "lg", "xl", "2xl"]) {
      expect(theme).toContain(`--radius-bp-${size}: var(--bp-radius-${size});`)
    }
  })

  it("every var() reference in Blueprint styles resolves to a declared property", () => {
    const names = new Set([
      ...blueprintCss.flatMap((file) => [...declared(read(file))]),
      ...declared(read("styles/blueprint/tailwind-theme.css")),
      "--font-bricolage",
      "--font-figtree",
    ])
    const files = [...blueprintCss, "styles/blueprint/tailwind-theme.css"]
    const missing = files.flatMap((file) =>
      [...read(file).matchAll(/var\((--[A-Za-z0-9_-]+)/g)].map((m) => m[1]).filter((name) => !names.has(name)),
    )
    expect(missing).toEqual([])
  })
})
