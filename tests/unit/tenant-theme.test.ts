import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  BLUEPRINT_DEFAULTS,
  MIN_TEXT,
  MIN_UI,
  computeTenantTheme,
  contrastRatio,
  tenantBrandKey,
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
    // dark keeps Blueprint's cream motif, restated so the light overrides cannot leak into it
    expect(t.dark.solid).toBe(BLUEPRINT_DEFAULTS.dark.solid)
    expect(t.dark.hatch).toBe(BLUEPRINT_DEFAULTS.dark.hatch)
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

  it("restates the cream motif in every dark block, so light overrides never reach dark theme", () => {
    const css = tenantThemeCss(computeTenantTheme({ primary: "#0F766E" }))
    const explicitDark = css.slice(css.indexOf('[data-theme="dark"]'), css.indexOf("@media"))
    const systemDark = css.slice(css.indexOf("@media"))
    for (const block of [explicitDark, systemDark]) {
      expect(block.length).toBeGreaterThan(0)
      expect(block).toContain(`--solid: ${BLUEPRINT_DEFAULTS.dark.solid};`)
      expect(block).toContain(`--text-on-solid: ${BLUEPRINT_DEFAULTS.ink};`)
      expect(block).toContain(`--hatch: ${BLUEPRINT_DEFAULTS.dark.hatch};`)
      expect(block).toContain(`--draft: ${BLUEPRINT_DEFAULTS.dark.draft};`)
    }
  })

  it("accepts only the tenant brand attribute as a scope", () => {
    const theme = computeTenantTheme({ primary: "#0F766E" })
    expect(tenantThemeCss(theme, '[data-tenant-brand="0F766E-none"]')).toContain('[data-tenant-brand="0F766E-none"] {')
    for (const scope of ["body", "*", '[data-tenant-brand="x"], *', '[data-tenant-brand="a"]{}', '[data-tenant-brand="</style>"]']) {
      expect(() => tenantThemeCss(theme, scope)).toThrow("Unsafe tenant brand scope")
    }
  })
})

describe("dark theme for customer brands", () => {
  it("keeps Blueprint cream for solid, hatch and draft across 600 random brand colors", () => {
    let seed = 7
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    const hex = () => "#" + Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0").toUpperCase()
    for (let i = 0; i < 600; i++) {
      const t = computeTenantTheme({ primary: hex(), accent: hex() })
      if (t.report.primary.fallback) {
        expect(t.light.solid).toBeUndefined()
        continue
      }
      expect(t.dark.solid).toBe(BLUEPRINT_DEFAULTS.dark.solid)
      expect(t.dark["text-on-solid"]).toBe(BLUEPRINT_DEFAULTS.ink)
      expect(t.dark.hatch).toBe(BLUEPRINT_DEFAULTS.dark.hatch)
      expect(t.dark.draft).toBe(BLUEPRINT_DEFAULTS.dark.draft)
      const darkSolidChecks = t.report.checks.filter((c) => c.theme === "dark" && c.pair.includes("solid"))
      expect(darkSolidChecks).toHaveLength(3)
      expect(darkSolidChecks.every((c) => c.pass)).toBe(true)
    }
  })
})

describe("tenantBrandKey", () => {
  it("is stable, case-insensitive, and made only of safe characters", () => {
    expect(tenantBrandKey({ primary: "#0f766e", accent: "#F97316" })).toBe("0F766E-F97316")
    expect(tenantBrandKey({ primary: "#0F766E" })).toBe("0F766E-none")
    expect(tenantBrandKey({ primary: '"]{}</style>', accent: "url(x)" })).toBe("none-none")
    expect(tenantBrandKey({})).toBe("none-none")
  })
})

describe("Blueprint defaults mirror design-tokens/tokens.json", () => {
  type Token = { name: string; value: string | { light: string; dark: string } }
  const tokens: { color: { tokens: Token[] } } = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../design-tokens/tokens.json"), "utf8"),
  )
  const value = (name: string, theme: "light" | "dark") => {
    const v = tokens.color.tokens.find((t) => t.name === name)!.value
    return typeof v === "string" ? v : v[theme]
  }
  const rgbaToHex8 = (rgba: string) => {
    const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number)
    return "#" + [r, g, b, Math.round(a * 255)].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()
  }

  it("matches every default the engine relies on", () => {
    const D = BLUEPRINT_DEFAULTS
    expect(D.brand).toBe(value("brand", "light"))
    expect(D.ink).toBe(value("ink", "light"))
    expect(D.ink).toBe(value("text-on-solid", "dark"))
    for (const theme of ["light", "dark"] as const) {
      expect(D[theme].paper).toBe(value("paper", theme))
      expect(D[theme].surface).toBe(value("surface", theme))
      expect(D[theme].surfaceSoft).toBe(value("surface-soft", theme))
      expect(D[theme].coral).toBe(value("coral", theme))
      expect(D[theme].coralText).toBe(value("coral-text", theme))
    }
    expect(D.dark.brandDeep).toBe(value("brand-deep", "dark"))
    expect(D.dark.solid).toBe(value("solid", "dark"))
    expect(D.dark.hatch).toBe(rgbaToHex8(value("hatch", "dark")))
    expect(D.dark.draft).toBe(rgbaToHex8(value("draft", "dark")))
  })
})
