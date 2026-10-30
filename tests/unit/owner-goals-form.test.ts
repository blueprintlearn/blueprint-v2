import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OwnerGoalsForm } from "@/app/owner-goals-form"
import { SINGLE_PRIMARY_LINE } from "@/lib/blueprint/company-goals"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

describe("OwnerGoalsForm", () => {
  it("renders the CheckboxGroup, hides the Select for one goal, and reveals Other", () => {
    const one = html(h(OwnerGoalsForm, { companyId: "company-a", goals: ["scale"], primary: "scale", otherText: null }))
    expect(one).toContain("<fieldset class=\"bp-check-group")
    expect(one).toContain("What do you want Blueprint to help you do? Choose all that apply.")
    expect(one).toContain(SINGLE_PRIMARY_LINE)
    expect(one).not.toContain("Which one matters most right now?")
    expect(one).toContain('type="hidden" name="primary" value="scale"')
    expect(one).toContain("Save goals")
    expect(one).not.toContain("Other goal")

    const withOther = html(
      h(OwnerGoalsForm, { companyId: "company-a", goals: ["other"], primary: "other", otherText: "Open a second market" }),
    )
    expect(withOther).toContain("Other goal")
    expect(withOther).toContain("Open a second market")
  })

  it("shows the main-goal Select only when two or more goals are checked", () => {
    const two = html(
      h(OwnerGoalsForm, { companyId: "company-a", goals: ["scale", "expand"], primary: "scale", otherText: null }),
    )
    expect(two).toContain("Which one matters most right now?")
    expect(two).toContain("Select your main goal")
    expect(two).not.toContain(SINGLE_PRIMARY_LINE)
    expect(text(two)).toContain("Scale")
    expect(text(two)).toContain("Expand")
    expect(text(two)).not.toContain("create_leadership")
  })

  it("includes DJ less and Stop DJing so the form can exclude them", () => {
    const out = html(h(OwnerGoalsForm, { companyId: "company-a", goals: [], primary: null, otherText: null }))
    expect(out).toContain("DJ less")
    expect(out).toContain("Stop DJing")
    expect(out).toContain('value="dj_less"')
    expect(out).toContain('value="stop_djing"')
  })
})
