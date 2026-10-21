#!/usr/bin/env node
// Builds styles/blueprint/tokens.css from design-tokens/tokens.json (the single source of truth).
//   node scripts/build-blueprint-tokens.mjs          write tokens.css
//   node scripts/build-blueprint-tokens.mjs --check  exit 1 if tokens.css is out of date (for CI)
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const src = resolve(root, "design-tokens/tokens.json")
const out = resolve(root, "styles/blueprint/tokens.css")
const tokens = JSON.parse(readFileSync(src, "utf8"))

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
const themes = tokens.color.themes.map((t) => t.id)
const [first, ...rest] = themes

function cssValue(v) {
  if (typeof v !== "string") throw new Error(`Bad token value: ${JSON.stringify(v)}`)
  const alias = v.match(/^\{([A-Za-z0-9_.-]+)\}$/)
  if (alias) return `var(--${alias[1]})`
  if (/[;{}<>]|url\(|expression/i.test(v)) throw new Error(`Unsafe token value: ${v}`)
  return v
}
function valueFor(token, theme) {
  if (typeof token.value === "string") return token.value
  return token.value[theme] ?? token.value[first]
}
function themed(families, theme) {
  const lines = []
  for (const fam of families) {
    for (const t of tokens[fam]?.tokens ?? []) {
      if (!NAME.test(t.name)) throw new Error(`Bad token name: ${t.name}`)
      lines.push(`  --${t.name}: ${cssValue(valueFor(t, theme))};`)
    }
  }
  return lines.join("\n")
}
function plain(families) {
  const lines = []
  for (const fam of families) {
    for (const t of tokens[fam]?.tokens ?? []) lines.push(`  --${t.name}: ${cssValue(String(t.value))};`)
  }
  return lines.join("\n")
}
function typeClasses() {
  const out = []
  for (const g of tokens.type.groups) {
    for (const s of g.styles) {
      const fam = s.family ?? g.family
      const stack = fam === "display" ? 'var(--font-display, "Bricolage Grotesque"), ui-sans-serif, system-ui, sans-serif' : "var(--font-body, Figtree), ui-sans-serif, system-ui, sans-serif"
      out.push(`.bp-type-${s.name} {\n  font-family: ${stack};\n  font-size: ${s.fontSize};\n  line-height: ${s.lineHeight};\n  font-weight: ${s.fontWeight};${s.letterSpacing ? `\n  letter-spacing: ${s.letterSpacing};` : ""}\n}`)
    }
  }
  return out.join("\n")
}

const themedFamilies = ["color", "shadow"]
const css = `/* Blueprint V2 — generated from design-tokens/tokens.json by scripts/build-blueprint-tokens.mjs. Do not edit by hand. */

:root,
[data-theme="${first}"] {
  color-scheme: light;
${themed(themedFamilies, first)}
}
${rest.map((id) => `
[data-theme="${id}"] {
  color-scheme: dark;
${themed(themedFamilies, id)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="${first}"]) {
    color-scheme: dark;
${themed(themedFamilies, id).replace(/^/gm, "  ")}
  }
}
`).join("")}
:root {
${plain(["spacing", "radius"])}
}

${typeClasses()}
`

if (process.argv.includes("--check")) {
  const current = existsSync(out) ? readFileSync(out, "utf8") : ""
  if (current !== css) {
    console.error("styles/blueprint/tokens.css is out of date. Run: node scripts/build-blueprint-tokens.mjs")
    process.exit(1)
  }
  console.log("tokens.css is up to date")
} else {
  writeFileSync(out, css)
  console.log(`Wrote ${out}`)
}
