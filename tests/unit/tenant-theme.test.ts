import { describe, expect, it } from "vitest"

import {
  BLUEPRINT_DEFAULTS,
  MIN_TEXT,
  MIN_UI,
  computeTenantTheme,
  contrastRatio,
  tenantThemeCss,
} from "@/lib/brand/tenant-theme"

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1)
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5)
    expect(contrastRatio("#253860", "#FFFFFF")).toBeGreaterThan(11)
  })
})

describe("computeTenantTheme", () => {
  it("keeps Blueprint navy unchanged and passes every check", () => {
    const t = computeTenantTheme({ primary: "#253860" })
    expect(t.report.primary.fallback).toBe(false)
    expect(t.report.primary.adjusted).toBe(false)
    expect(t.light.solid).toBe("#253860")
    expect(t.light["text-on-solid"]).toBe(BLUEPRINT_DEFAULTS.white)
    // motif lines follow the solid at Blueprint's own strengths (0.42 and 0.55)
    expect(t.light.hatch).toBe("#2538606B")
    expect(t.light.draft).toBe("#2538608C")
    expect(t.dark.hatch).toBeUndefined()
    expect(t.report.allPass).toBe(true)
  })

  it("falls back to Blueprint navy for missing or invalid input", () => {
    for (const primary of [undefined, null, "", "navy", "#12345", "#GGGGGG", "url(x)"]) {
      const t = computeTenantTheme({ primary })
      expect(t.report.primary.fallback).toBe(true)
      expect(t.light.brand).toBeUndefined()
      expect(t.report.allPass).toBe(true)
    }
  })

  it("darkens a bright yellow brand just enough for the solid motif and white text", () => {
    const t = computeTenantTheme({ primary: "#FFD400" })
    expect(t.report.primary.fallback).toBe(false)
    expect(t.report.primary.adjusted).toBe(true)
    // brand panels keep the bright yellow with ink text
    expect(t.light.brand).toBe("#FFD400")
    expect(t.light["text-on-brand"]).toBe(BLUEPRINT_DEFAULTS.ink)
    // the solid used for buttons and done-states is darker, but still the same hue family
    expect(contrastRatio(t.light.solid!, BLUEPRINT_DEFAULTS.light.paper)).toBeGreaterThanOrEqual(MIN_UI)
    expect(contrastRatio("#FFFFFF", t.light.solid!)).toBeGreaterThanOrEqual(MIN_TEXT)
    expect(t.report.allPass).toBe(true)
  })

  it("falls back when a pale pastel would need too large a change", () => {
    const t = computeTenantTheme({ primary: "#F6E9E4" })
    expect(t.report.primary.fallback).toBe(true)
    expect(t.report.primary.reason).toMatch(/contrast/)
    expect(t.report.allPass).toBe(true)
  })

  it("uses Blueprint coral when no accent is set and adjusts a custom accent for readable text", () => {
    expect(computeTenantTheme({ primary: "#253860" }).report.accent.fallback).toBe(true)
    const t = computeTenantTheme({ primary: "#253860", accent: "#14B8A6" })
    expect(t.report.accent.fallback).toBe(false)
    expect(contrastRatio(t.light["coral-text"]!, BLUEPRINT_DEFAULTS.light.surfaceSoft)).toBeGreaterThanOrEqual(MIN_TEXT)
    expect(contrastRatio(t.dark["coral-text"]!, BLUEPRINT_DEFAULTS.dark.surfaceSoft)).toBeGreaterThanOrEqual(MIN_TEXT)
    expect(t.light.focus).toBe(t.light["coral-text"])
    expect(t.report.allPass).toBe(true)
  })

  it("never emits an override that fails contrast, across 600 random brand colors", () => {
    let seed = 42
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    const hex = () => "#" + Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0").toUpperCase()
    for (let i = 0; i < 600; i++) {
      const t = computeTenantTheme({ primary: hex(), accent: hex() })
      const failures = t.report.checks.filter((c) => !c.pass)
      expect(failures, JSON.stringify({ input: t.report.primary.input, failures })).toEqual([])
    }
  })

  it("never overrides status tints", () => {
    const t = computeTenantTheme({ primary: "#C62828", accent: "#2E7D32" })
    const keys = [...Object.keys(t.light), ...Object.keys(t.dark)]
    for (const reserved of ["blush", "butter", "mint", "sky", "lavender", "danger", "danger-ink", "mint-ink"]) {
      expect(keys).not.toContain(reserved)
    }
  })
})

describe("tenantThemeCss", () => {
  it("writes only validated hex values, scoped to the tenant attribute", () => {
    const css = tenantThemeCss(computeTenantTheme({ primary: "#FFD400", accent: "#14B8A6" }))
    expect(css).toContain("[data-tenant-brand] {")
    expect(css).toContain('[data-theme="dark"] [data-tenant-brand]')
    expect(css).toContain("@media (prefers-color-scheme: dark)")
    expect(css).not.toMatch(/[<>{}]\s*[<>]/)
    const declarations = [...css.matchAll(/--([a-z-]+):\s*([^;]+);/g)]
    expect(declarations.length).toBeGreaterThan(0)
    for (const [, , value] of declarations) {
      expect(value).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/)
    }
  })

  it("writes nothing for a full fallback", () => {
    expect(tenantThemeCss(computeTenantTheme({ primary: "not-a-color" }))).toBe("")
  })
})
