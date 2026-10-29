import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  GUIDED_COMPANY_IDS_ENV,
  isGuidedBlueprintEnabled,
  parseGuidedCompanyIds,
} from "@/lib/blueprint/guided-switch"

const A = "00000000-0000-4000-8000-0000000000a1"
const B = "00000000-0000-4000-8000-0000000000b1"
const env = (value?: string) => ({ [GUIDED_COMPANY_IDS_ENV]: value })

describe("guided Blueprint switch", () => {
  it("is off for everyone when the variable is unset, empty or blank", () => {
    for (const value of [undefined, "", "   ", " , ,"]) {
      expect(isGuidedBlueprintEnabled(A, env(value))).toBe(false)
      expect(isGuidedBlueprintEnabled(B, env(value))).toBe(false)
    }
  })

  it("is on only for listed company ids", () => {
    expect(isGuidedBlueprintEnabled(A, env(A))).toBe(true)
    expect(isGuidedBlueprintEnabled(B, env(A))).toBe(false)
  })

  it("accepts a comma-separated list with spaces, any case and stray commas", () => {
    const value = ` ${A.toUpperCase()} ,, ${B}, `
    expect(isGuidedBlueprintEnabled(A, env(value))).toBe(true)
    expect(isGuidedBlueprintEnabled(B.toUpperCase(), env(value))).toBe(true)
  })

  it("ignores anything that is not a company id, so a wildcard or name never enables a company", () => {
    expect([...parseGuidedCompanyIds(`*, true, 1, all, Company A, ${A}x`)]).toEqual([])
    expect(isGuidedBlueprintEnabled(A, env("*"))).toBe(false)
    expect(isGuidedBlueprintEnabled("", env(A))).toBe(false)
  })

  it("reads the process environment by default and is off when it isn't set", () => {
    expect(isGuidedBlueprintEnabled(A, {})).toBe(false)
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) return []
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry) ? [full] : []
  })
}

describe("guided Blueprint switch stays on the server", () => {
  const root = path.resolve(__dirname, "../..")
  const files = ["app", "components", "lib"].flatMap((dir) => sourceFiles(path.join(root, dir)))

  it("is never imported by a client module", () => {
    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8")
      return /^\s*["']use client["']/m.test(source) && source.includes("guided-switch")
    })
    expect(offenders).toEqual([])
  })

  it("is only named in the switch module, never as a NEXT_PUBLIC variable or in a client module", () => {
    const named = files.filter((file) => readFileSync(file, "utf8").includes(GUIDED_COMPANY_IDS_ENV))
    expect(named.map((file) => path.relative(root, file))).toEqual(["lib/blueprint/guided-switch.ts"])
    expect(files.some((file) => readFileSync(file, "utf8").includes("NEXT_PUBLIC_BLUEPRINT"))).toBe(false)
  })
})
