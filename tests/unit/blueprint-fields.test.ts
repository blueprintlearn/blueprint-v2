import { readFileSync } from "node:fs"
import path from "node:path"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Card, CheckboxGroup, Fact, NumberField, SaveStatus, Select, TextField, TopNav } from "@/components/blueprint"
import { contrastRatio } from "@/lib/brand/tenant-theme"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const attr = (markup: string, tag: string, name: string) =>
  markup.match(new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]*)"`))?.[1]

describe("TextField", () => {
  it("has a real label for a required input", () => {
    const out = html(h(TextField, { id: "goal-other", label: "Other goal", name: "ownerGoalOther" }))
    expect(out).toMatch(/<label class="bp-field__label" for="goal-other">Other goal<\/label>/)
    expect(out).toMatch(/<input[^>]*id="goal-other"/)
    expect(out).toMatch(/<input[^>]*required=""/)
    expect(out).toMatch(/<input[^>]*class="bp-input"/)
    expect(attr(out, "input", "aria-describedby")).toBeUndefined()
    expect(out).not.toContain("aria-invalid")
  })

  it("connects help and error through aria-describedby, in that order", () => {
    const out = html(
      h(TextField, { id: "x", label: "Other goal", help: "Describe your goal in a few words.", error: "Add a few words about your goal." }),
    )
    expect(attr(out, "input", "aria-describedby")).toBe("x-help x-error")
    expect(attr(out, "input", "aria-invalid")).toBe("true")
    expect(out).toContain('<p class="bp-field__help" id="x-help">Describe your goal in a few words.</p>')
    expect(out).toMatch(/<p class="bp-field__error" id="x-error" role="alert"><svg[^>]*>.*<\/svg>Add a few words about your goal.<\/p>/)
  })

  it("lists only the parts that exist", () => {
    expect(attr(html(h(TextField, { id: "x", label: "L", help: "Help" })), "input", "aria-describedby")).toBe("x-help")
    expect(attr(html(h(TextField, { id: "x", label: "L", error: "Fix it." })), "input", "aria-describedby")).toBe("x-error")
  })

  it("marks optional fields in words and drops required", () => {
    const out = html(h(TextField, { id: "x", label: "Nickname", optional: true }))
    expect(out).toContain('Nickname<span class="bp-field__optional"> Optional</span></label>')
    expect(out).not.toMatch(/<input[^>]*required/)
    expect(out).not.toContain("*")
  })

  it("passes native attributes through and generates an id when none is given", () => {
    const out = html(h(TextField, { label: "Other goal", name: "ownerGoalOther", maxLength: 80, placeholder: "e.g. Open a second market" }))
    const id = attr(out, "input", "id")
    expect(id).toBeTruthy()
    expect(attr(out, "label", "for")).toBe(id)
    expect(out).toMatch(/<input[^>]*name="ownerGoalOther"/)
    expect(out).toMatch(/<input[^>]*maxLength="80"/)
    expect(out).toMatch(/<input[^>]*placeholder="e.g. Open a second market"/)
  })
})

describe("NumberField", () => {
  it("renders never-saved as an empty input and a saved 0 as 0", () => {
    const empty = html(h(NumberField, { id: "n", label: "Current DJ count", defaultValue: null, placeholder: "e.g. 6" }))
    expect(attr(empty, "input", "value")).toBe("")
    expect(empty).toMatch(/<input[^>]*placeholder="e.g. 6"/)
    expect(attr(html(h(NumberField, { id: "n", label: "Current DJ count", defaultValue: 0 })), "input", "value")).toBe("0")
    expect(attr(html(h(NumberField, { id: "n", label: "Current DJ count", defaultValue: 12 })), "input", "value")).toBe("12")
  })

  it("is a whole-number input capped by the number style", () => {
    const out = html(h(NumberField, { id: "n", label: "Current DJ count", min: 0, max: 999, defaultValue: null }))
    expect(attr(out, "input", "type")).toBe("number")
    expect(attr(out, "input", "step")).toBe("1")
    expect(attr(out, "input", "inputMode")).toBe("numeric")
    expect(attr(out, "input", "class")).toBe("bp-input bp-input--number")
    expect(attr(out, "input", "min")).toBe("0")
    expect(attr(out, "input", "max")).toBe("999")
    expect(out).toMatch(/<input[^>]*required=""/)
  })

  it("shows its error on the field", () => {
    const out = html(h(NumberField, { id: "n", label: "Desired DJ count", error: "Enter a whole number from 0 to 999." }))
    expect(attr(out, "input", "aria-invalid")).toBe("true")
    expect(out).toContain('role="alert"')
  })
})

describe("CheckboxGroup", () => {
  const options = [
    { value: "scale", label: "Scale", description: "Book and staff more events" },
    { value: "expand", label: "Expand" },
    { value: "other", label: "Other" },
  ]

  it("is a fieldset with a legend, help, a status note and an alert error", () => {
    const out = html(
      h(CheckboxGroup, {
        id: "goals",
        label: "What do you want Blueprint to help you do? Choose all that apply.",
        name: "goals",
        options,
        help: "Pick everything that's true.",
        note: "Stop DJing includes DJing less.",
        error: "Choose at least one goal.",
        defaultValue: ["scale"],
      }),
    )
    expect(out).toMatch(/^<fieldset class="bp-check-group is-invalid"/)
    expect(out).toContain('aria-describedby="goals-help goals-note goals-error"')
    expect(out).toContain('<legend class="bp-field__label bp-check-group__legend">')
    expect(out).toContain("What do you want Blueprint to help you do? Choose all that apply.")
    expect(out).toContain('<p class="bp-field__help" id="goals-help">Pick everything that&#x27;s true.</p>')
    expect(out).toContain('id="goals-note" role="status" aria-live="polite"')
    expect(out).toContain("Stop DJing includes DJing less.")
    expect(out).toMatch(/<p class="bp-field__error" id="goals-error" role="alert"><svg[^>]*>.*<\/svg>Choose at least one goal\.<\/p>/)
    expect(out).not.toContain("<div class=\"bp-field\"")
  })

  it("uses a real checkbox in a label so the whole row and Space toggle the box", () => {
    const out = html(h(CheckboxGroup, { id: "goals", label: "Goals", name: "goals", options, defaultValue: ["scale"] }))
    expect(out).toContain('<label class="bp-check" for="goals-0">')
    expect(out).toMatch(/<input[^>]*type="checkbox"[^>]*id="goals-0"[^>]*name="goals"[^>]*value="scale"/)
    expect(out).toMatch(/<input[^>]*checked=""/)
    expect(attr(out, "input", "aria-describedby")).toBe("goals-0-desc")
    expect(out).toContain('<span class="bp-check__desc" id="goals-0-desc">Book and staff more events</span>')
    expect(out).toContain('<label class="bp-check" for="goals-1">')
    expect(out).not.toMatch(/<input[^>]*value="expand"[^>]*checked/)
  })

  it("marks every box aria-invalid when the group has an error", () => {
    const out = html(h(CheckboxGroup, { id: "g", label: "Goals", name: "goals", options, error: "Choose at least one goal." }))
    expect(out.match(/aria-invalid="true"/g)).toHaveLength(3)
  })

  it("shows the follow-up only under the checked option", () => {
    const followUp = { other: h(TextField, { id: "other-text", label: "Other goal", name: "otherText" }) }
    const hidden = html(h(CheckboxGroup, { id: "g", label: "Goals", name: "goals", options, defaultValue: ["scale"], followUp }))
    expect(hidden).not.toContain("Other goal")
    expect(hidden).not.toContain("bp-check-group__follow")

    const shown = html(h(CheckboxGroup, { id: "g", label: "Goals", name: "goals", options, defaultValue: ["other"], followUp }))
    expect(shown).toContain("bp-check-group__follow")
    expect(shown).toContain('<label class="bp-field__label" for="other-text">Other goal</label>')
  })

  it("keeps the status region mounted when there is no note", () => {
    const out = html(h(CheckboxGroup, { id: "g", label: "Goals", name: "goals", options }))
    expect(out).toContain('id="g-note" role="status" aria-live="polite"')
    expect(out).toContain('aria-describedby="g-note"')
  })
})

describe("Select", () => {
  const options = [
    { value: "scale", label: "Scale" },
    { value: "create_leadership", label: "Create leadership" },
  ]

  it("selects a disabled empty placeholder when nothing is saved", () => {
    const out = html(h(Select, { id: "g", label: "Owner goal", options, placeholderOption: "Select a goal", defaultValue: null }))
    expect(out).toMatch(/<option value="" disabled="" selected="">Select a goal<\/option>/)
    expect(out).toMatch(/<select[^>]*class="bp-select"/)
    expect(out).toMatch(/<select[^>]*required=""/)
    expect(out).toContain('<span class="bp-select-wrap__icon" aria-hidden="true">')
  })

  it("shows labels, never codes, and selects the saved value", () => {
    const out = html(h(Select, { id: "g", label: "Owner goal", options, placeholderOption: "Select a goal", defaultValue: "create_leadership" }))
    expect(out).toContain('<option value="create_leadership" selected="">Create leadership</option>')
    expect(out).not.toMatch(/>create_leadership</)
    expect(out).not.toMatch(/<option value="" disabled="" selected=""/)
  })

  it("connects help and error like the other fields", () => {
    const out = html(h(Select, { id: "g", label: "Owner goal", options, help: "Why", error: "Choose a goal from the list." }))
    expect(attr(out, "select", "aria-describedby")).toBe("g-help g-error")
    expect(attr(out, "select", "aria-invalid")).toBe("true")
  })
})

describe("Fact", () => {
  it("shows never-saved as quiet empty text and a saved 0 at full size", () => {
    const empty = html(h(Fact, { label: "Current DJ count", value: null }))
    expect(empty).toContain('<span class="bp-fact__value is-empty">Not set yet</span>')
    expect(html(h(Fact, { label: "Current DJ count", value: "" }))).toContain("is-empty")

    const zero = html(h(Fact, { label: "Current DJ count", value: 0 }))
    expect(zero).toContain('<span class="bp-fact__value">0</span>')
    expect(zero).not.toContain("is-empty")
    expect(zero).not.toContain("Not set yet")
  })

  it("uses a specific empty message and labels without colons", () => {
    const out = html(h(Fact, { label: "Goal", value: null, emptyText: "No goal chosen yet" }))
    expect(out).toContain(">No goal chosen yet<")
    expect(out).toContain('<span class="bp-fact__label">Goal</span>')
  })
})

describe("SaveStatus", () => {
  it("is always a polite live region", () => {
    expect(html(h(SaveStatus, { state: "idle" }))).toBe('<span class="bp-save bp-save--idle" role="status" aria-live="polite"></span>')
  })

  it("reads Saving… while saving and shows a check with Saved once confirmed", () => {
    expect(html(h(SaveStatus, { state: "saving" }))).toContain(">Saving…</span>")
    const saved = html(h(SaveStatus, { state: "saved" }))
    expect(saved).toMatch(/<svg[^>]*>.*<\/svg><span>Saved<\/span>/)
    expect(saved).toContain("bp-save--saved")
  })

  it("accepts custom words", () => {
    expect(html(h(SaveStatus, { state: "saved", savedText: "Goal saved" }))).toContain("<span>Goal saved</span>")
  })
})

describe("TopNav no-tabs mode and actions slot", () => {
  it("renders no nav landmark when there are no tabs", () => {
    const out = html(h(TopNav, {}))
    expect(out).not.toContain("<nav")
    expect(out).toMatch(/<header class="bp-nav bp-nav--no-tabs">/)
    expect(out).not.toContain("<a ")
  })

  it("keeps the nav and drops the no-tabs class when there are tabs", () => {
    const out = html(h(TopNav, { items: [{ href: "/", label: "Home" }], currentHref: "/" }))
    expect(out).toContain('<nav class="bp-nav__tabs" aria-label="Main">')
    expect(out).not.toContain("bp-nav--no-tabs")
  })

  it("renders actions on the right, after the utilities", () => {
    const out = html(h(TopNav, { userInitial: "D", actions: h("button", { type: "submit" }, "Sign out") }))
    expect(out).toContain('<div class="bp-nav__actions"><button type="submit">Sign out</button></div>')
    expect(out.indexOf("bp-nav__actions")).toBeGreaterThan(out.indexOf("bp-nav__right"))
    expect(out.indexOf("bp-nav__actions")).toBeGreaterThan(out.indexOf("bp-nav__me"))
    expect(html(h(TopNav, {}))).not.toContain("bp-nav__actions")
  })
})

describe("Card aria-labelledby", () => {
  it("names a section card by its heading", () => {
    const out = html(h(Card, { as: "section", "aria-labelledby": "team-today-title" }, h("h2", { id: "team-today-title" }, "Team today")))
    expect(out).toMatch(/^<section class="bp-card bp-card--surface" aria-labelledby="team-today-title">/)
  })

  it("adds nothing when not given", () => {
    expect(html(h(Card, { as: "section" }, "x"))).toBe('<section class="bp-card bp-card--surface">x</section>')
  })
})

describe("control-border token", () => {
  const tokens = JSON.parse(readFileSync(path.resolve(__dirname, "../../design-tokens/tokens.json"), "utf8"))
  const color = (name: string) => tokens.color.tokens.find((t: { name: string }) => t.name === name).value

  it("meets 3:1 against every surface a control sits on, in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const surface of ["paper", "surface", "surface-soft"]) {
        expect(contrastRatio(color("control-border")[theme], color(surface)[theme]), `${theme} ${surface}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it("is what fields use, and line is not", () => {
    const css = readFileSync(path.resolve(__dirname, "../../styles/blueprint/components.css"), "utf8")
    expect(css).toMatch(/\.bp-input,\.bp-select\{[^}]*border:1\.5px solid var\(--control-border\)/)
    expect(css).not.toMatch(/\.bp-(input|select)[^{]*\{[^}]*var\(--line\)/)
    expect(css).toMatch(/\.bp-check__box\{[^}]*border:1\.5px solid var\(--control-border\)/)
    expect(css).toMatch(/\.bp-check__box:checked\{background:var\(--solid\);border-color:var\(--solid\)\}/)
  })
})
