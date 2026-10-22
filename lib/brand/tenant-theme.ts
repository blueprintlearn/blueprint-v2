/**
 * Customer-brand color overrides for Blueprint V2.
 *
 * A DJ company may supply a primary color (required for branding) and an accent color
 * (optional). This module turns them into a safe set of CSS custom-property overrides for
 * light and dark themes. Every override is checked against WCAG 2 contrast. When a color
 * fails, it is nudged in lightness (hue and saturation kept) until it passes. When the nudge
 * would change the color too much, or the input is invalid, it falls back to Blueprint's own
 * color and reports why.
 *
 * Only these tokens are ever overridden:
 *   brand, brand-deep, text-on-brand, text-on-brand-muted,
 *   solid, text-on-solid, hatch, draft (light theme only; dark keeps Blueprint's cream motif),
 *   coral, text-on-coral, coral-text, focus
 * Status tints (blush, butter, mint, sky, lavender, danger) and their inks are never
 * overridden, so a red or green brand can never be confused with an error or success state.
 *
 * Pure and deterministic: safe to run on the server, in tests, or in an admin preview.
 */

export type ThemeId = "light" | "dark"

export type TenantBrandInput = {
  /** The DJ company's primary color, as #RRGGBB. */
  primary?: string | null
  /** Optional accent for important actions; replaces Blueprint coral. #RRGGBB. */
  accent?: string | null
}

export type OverridableToken =
  | "brand"
  | "brand-deep"
  | "text-on-brand"
  | "text-on-brand-muted"
  | "solid"
  | "text-on-solid"
  | "coral"
  | "text-on-coral"
  | "coral-text"
  | "focus"
  | "hatch"
  | "draft"

export type ContrastCheck = {
  theme: ThemeId
  pair: string
  ratio: number
  min: number
  pass: boolean
}

export type TenantTheme = {
  light: Partial<Record<OverridableToken, string>>
  dark: Partial<Record<OverridableToken, string>>
  report: {
    primary: { input: string | null; used: string; fallback: boolean; adjusted: boolean; reason?: string }
    accent: { input: string | null; used: string; fallback: boolean; adjusted: boolean; reason?: string }
    checks: ContrastCheck[]
    allPass: boolean
  }
}

/** Blueprint defaults, mirroring design-tokens/tokens.json. */
export const BLUEPRINT_DEFAULTS = {
  brand: "#253860",
  ink: "#1B2742",
  white: "#FFFFFF",
  light: { paper: "#F8F5EF", surface: "#FFFFFF", surfaceSoft: "#F0EBE2", coral: "#EE6A47", coralText: "#B13E1D" },
  dark: {
    paper: "#0F1626",
    surface: "#172238",
    surfaceSoft: "#1E2A44",
    coral: "#FF8A66",
    coralText: "#FF9C7C",
    brandDeep: "#22345A",
    solid: "#F1ECE2",
    hatch: "#F4F0E866",
    draft: "#F4F0E880",
  },
} as const

/** WCAG thresholds used throughout. */
export const MIN_TEXT = 4.5
export const MIN_UI = 3
/** A brand panel must differ from the dark page background by at least this much to read as a panel. */
export const MIN_PANEL_SEPARATION = 1.3
/** Largest lightness change (HSL, 0–1) we accept before falling back to Blueprint's color. */
export const MAX_LIGHTNESS_SHIFT = 0.35

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value)
}

export function normalizeHex(value: string): string {
  return value.toUpperCase()
}

type RGB = [number, number, number]
type HSL = [number, number, number]

function hexToRgb(hex: string): RGB {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
}

function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("").toUpperCase()
}

function rgbToHsl([r, g, b]: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h / 6, s, l]
}

function hslToRgb([h, s, l]: HSL): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const hue = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255]
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio between two #RRGGBB colors, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function mix(a: string, b: string, weightOfA: number): string {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  return rgbToHex([0, 1, 2].map((i) => ra[i] * weightOfA + rb[i] * (1 - weightOfA)) as RGB)
}

/**
 * Walk lightness in one direction until `ok` holds. Returns the first passing color and the
 * total lightness shift, or null if it never passes within MAX steps.
 */
function nudgeLightness(hex: string, direction: "darker" | "lighter", ok: (c: string) => boolean): { color: string; shift: number } | null {
  if (ok(hex)) return { color: normalizeHex(hex), shift: 0 }
  const [h, s, l] = rgbToHsl(hexToRgb(hex))
  for (let step = 1; step <= 100; step++) {
    const nl = direction === "darker" ? l - step * 0.01 : l + step * 0.01
    if (nl < 0 || nl > 1) break
    const candidate = rgbToHex(hslToRgb([h, s, nl]))
    if (ok(candidate)) return { color: candidate, shift: Math.abs(nl - l) }
  }
  return null
}

function bestTextOn(fill: string): { text: string; ratio: number } {
  const white = contrastRatio(BLUEPRINT_DEFAULTS.white, fill)
  const ink = contrastRatio(BLUEPRINT_DEFAULTS.ink, fill)
  return white >= ink ? { text: BLUEPRINT_DEFAULTS.white, ratio: white } : { text: BLUEPRINT_DEFAULTS.ink, ratio: ink }
}

/** A fill that carries text: keep it if white or ink text reaches 4.5:1, else nudge toward whichever text works. */
function textBearingFill(color: string): { fill: string; text: string; shift: number } | null {
  const best = bestTextOn(color)
  if (best.ratio >= MIN_TEXT) return { fill: normalizeHex(color), text: best.text, shift: 0 }
  const direction = best.text === BLUEPRINT_DEFAULTS.white ? "darker" : "lighter"
  const found = nudgeLightness(color, direction, (c) => contrastRatio(best.text, c) >= MIN_TEXT)
  return found ? { fill: found.color, text: best.text, shift: found.shift } : null
}

function mutedTextOn(fill: string, text: string): string {
  const muted = mix(text, fill, 0.82)
  return contrastRatio(muted, fill) >= MIN_TEXT ? muted : text
}

export function computeTenantTheme(input: TenantBrandInput): TenantTheme {
  const D = BLUEPRINT_DEFAULTS
  const light: TenantTheme["light"] = {}
  const dark: TenantTheme["dark"] = {}
  const checks: ContrastCheck[] = []
  const check = (theme: ThemeId, pair: string, a: string, b: string, min: number) => {
    const ratio = Math.round(contrastRatio(a, b) * 100) / 100
    checks.push({ theme, pair, ratio, min, pass: ratio >= min })
  }

  // ---------- Primary → brand, solid ----------
  const primaryInput = input.primary ?? null
  let primaryReport: TenantTheme["report"]["primary"]
  if (!isHexColor(primaryInput)) {
    primaryReport = { input: primaryInput, used: D.brand, fallback: true, adjusted: false, reason: primaryInput ? "Not a #RRGGBB color" : "No primary color set" }
  } else {
    const p = normalizeHex(primaryInput)
    // Light brand panels and the light-theme solid share one color so the tenant's identity is
    // consistent: it must hold white-or-ink text at 4.5:1 AND stand out from paper and surface at 3:1.
    const lightBrand = textBearingFill(p)
    const lightSolid = nudgeLightness(p, "darker", (c) =>
      contrastRatio(c, D.light.paper) >= MIN_UI &&
      contrastRatio(c, D.light.surface) >= MIN_UI &&
      contrastRatio(D.white, c) >= MIN_TEXT)
    // Dark brand panels sit on deep navy paper: they must hold white text AND stay visibly
    // distinct from the page (a near-black brand would otherwise vanish), so try both directions.
    const darkOk = (c: string) => contrastRatio(D.white, c) >= MIN_TEXT && contrastRatio(c, D.dark.paper) >= MIN_PANEL_SEPARATION
    const darkBrand = nudgeLightness(p, "darker", darkOk) ?? nudgeLightness(p, "lighter", darkOk)
    const shifts = [lightBrand?.shift, lightSolid?.shift, darkBrand?.shift]
    const failed = !lightBrand || !lightSolid || !darkBrand || shifts.some((s) => (s ?? 1) > MAX_LIGHTNESS_SHIFT)
    if (failed) {
      primaryReport = { input: p, used: D.brand, fallback: true, adjusted: false, reason: "Could not reach readable contrast without changing the color too much" }
    } else {
      light.brand = lightBrand!.fill
      light["brand-deep"] = lightBrand!.fill
      light["text-on-brand"] = lightBrand!.text
      light["text-on-brand-muted"] = mutedTextOn(lightBrand!.fill, lightBrand!.text)
      light.solid = lightSolid!.color
      light["text-on-solid"] = D.white
      // The motif's hatch and drafting lines follow the solid, at the same strengths as Blueprint's
      // (42% and 55%). They are decorative companions to a text label, so no contrast minimum applies.
      light.hatch = `${lightSolid!.color}6B`
      light.draft = `${lightSolid!.color}8C`
      // The light overrides above sit on the scope element, so they would also apply in dark
      // theme. Dark keeps Blueprint's cream motif for every customer, so restate it here.
      dark.solid = D.dark.solid
      dark["text-on-solid"] = D.ink
      dark.hatch = D.dark.hatch
      dark.draft = D.dark.draft
      dark.brand = p
      dark["brand-deep"] = darkBrand!.color
      dark["text-on-brand"] = D.white
      dark["text-on-brand-muted"] = mutedTextOn(darkBrand!.color, D.white)
      const adjusted = lightBrand!.fill !== p || lightSolid!.color !== p || darkBrand!.color !== p
      primaryReport = { input: p, used: p, fallback: false, adjusted, reason: adjusted ? "Lightness adjusted for readable contrast; hue kept" : undefined }
    }
  }

  // ---------- Accent → coral family ----------
  const accentInput = input.accent ?? null
  let accentReport: TenantTheme["report"]["accent"]
  if (accentInput == null || accentInput === "") {
    accentReport = { input: null, used: D.light.coral, fallback: true, adjusted: false, reason: "No accent set; Blueprint coral is used" }
  } else if (!isHexColor(accentInput)) {
    accentReport = { input: accentInput, used: D.light.coral, fallback: true, adjusted: false, reason: "Not a #RRGGBB color" }
  } else {
    const a = normalizeHex(accentInput)
    const per = (theme: ThemeId) => {
      const g = D[theme]
      const fill = textBearingFill(a)
      const asText = nudgeLightness(a, theme === "light" ? "darker" : "lighter", (c) =>
        contrastRatio(c, g.paper) >= MIN_TEXT && contrastRatio(c, g.surface) >= MIN_TEXT && contrastRatio(c, g.surfaceSoft) >= MIN_TEXT)
      return { fill, asText }
    }
    const L = per("light")
    const K = per("dark")
    const shifts = [L.fill?.shift, L.asText?.shift, K.fill?.shift, K.asText?.shift]
    if (!L.fill || !L.asText || !K.fill || !K.asText || shifts.some((s) => (s ?? 1) > MAX_LIGHTNESS_SHIFT)) {
      accentReport = { input: a, used: D.light.coral, fallback: true, adjusted: false, reason: "Could not reach readable contrast without changing the color too much" }
    } else {
      light.coral = L.fill.fill
      light["text-on-coral"] = L.fill.text
      light["coral-text"] = L.asText.color
      light.focus = L.asText.color
      dark.coral = K.fill.fill
      dark["text-on-coral"] = K.fill.text
      dark["coral-text"] = K.asText.color
      dark.focus = K.asText.color
      const adjusted = [L.fill.fill, L.asText.color, K.asText.color].some((c) => c !== a)
      accentReport = { input: a, used: a, fallback: false, adjusted, reason: adjusted ? "Lightness adjusted for readable contrast; hue kept" : undefined }
    }
  }

  // ---------- Verify everything we emit (defaults included) ----------
  for (const theme of ["light", "dark"] as const) {
    const g = D[theme]
    const t = theme === "light" ? light : dark
    const brandDeep = t["brand-deep"] ?? (theme === "light" ? D.brand : D.dark.brandDeep)
    check(theme, "text-on-brand / brand-deep", t["text-on-brand"] ?? D.white, brandDeep, MIN_TEXT)
    check(theme, "text-on-brand-muted / brand-deep", t["text-on-brand-muted"] ?? "#DCE4F3", brandDeep, MIN_TEXT)
    if (theme === "dark") check(theme, "brand-deep / paper (panel separation)", brandDeep, g.paper, MIN_PANEL_SEPARATION)
    const solid = t.solid ?? (theme === "light" ? D.brand : D.dark.solid)
    check(theme, "text-on-solid / solid", t["text-on-solid"] ?? (theme === "light" ? D.white : D.ink), solid, MIN_TEXT)
    check(theme, "solid / paper", solid, g.paper, MIN_UI)
    check(theme, "solid / surface", solid, g.surface, MIN_UI)
    const coral = t.coral ?? g.coral
    check(theme, "text-on-coral / coral", t["text-on-coral"] ?? D.ink, coral, MIN_TEXT)
    const coralText = t["coral-text"] ?? g.coralText
    check(theme, "coral-text / paper", coralText, g.paper, MIN_TEXT)
    check(theme, "coral-text / surface", coralText, g.surface, MIN_TEXT)
    check(theme, "coral-text / surface-soft", coralText, g.surfaceSoft, MIN_TEXT)
  }

  return { light, dark, report: { primary: primaryReport, accent: accentReport, checks, allPass: checks.every((c) => c.pass) } }
}

const CSS_SAFE = /^#[0-9A-F]{6}([0-9A-F]{2})?$/
const SCOPE_SAFE = /^\[data-tenant-brand(="[0-9A-Za-z_-]{1,64}")?\]$/

/**
 * A stable attribute value for one brand input. The CSS is a pure function of the validated
 * colors, so equal keys always carry equal CSS, and scopes with different colors on the same
 * page never restyle each other.
 */
export function tenantBrandKey(input: TenantBrandInput): string {
  const part = (v: string | null | undefined) => (isHexColor(v) ? normalizeHex(v).slice(1) : "none")
  return `${part(input.primary)}-${part(input.accent)}`
}

function block(selector: string, vars: Partial<Record<OverridableToken, string>>): string {
  const lines = Object.entries(vars)
    .filter(([, v]) => typeof v === "string" && CSS_SAFE.test(v))
    .map(([k, v]) => `  --${k}: ${v};`)
  return lines.length ? `${selector} {\n${lines.join("\n")}\n}` : ""
}

/**
 * CSS text that applies a tenant theme inside elements carrying `data-tenant-brand`.
 * Works with an explicit `data-theme` on <html> (or the scope) and with the system setting.
 * Only validated #RRGGBB values are ever written, so the output is safe to inline in <style>.
 * The scope must be `[data-tenant-brand]` or `[data-tenant-brand="<key>"]`; anything else throws.
 */
export function tenantThemeCss(theme: TenantTheme, scope = "[data-tenant-brand]"): string {
  if (!SCOPE_SAFE.test(scope)) throw new Error("Unsafe tenant brand scope")
  const darkScopes = `[data-theme="dark"] ${scope}, ${scope}[data-theme="dark"]`
  const parts = [
    block(scope, theme.light),
    block(darkScopes, theme.dark),
    (() => {
      const inner = block(`:root:not([data-theme="light"]) ${scope}`, theme.dark)
      return inner ? `@media (prefers-color-scheme: dark) {\n${inner}\n}` : ""
    })(),
  ]
  return parts.filter(Boolean).join("\n")
}
