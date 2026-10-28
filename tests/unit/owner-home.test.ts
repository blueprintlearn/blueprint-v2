import { createElement as h, Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { formatCount, OwnerGoalCard, OwnerHomeHeader, TeamTodayCard } from "@/app/owner-home"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
const OWNER_ONLY = "Only the company owner can change these."

describe("formatCount", () => {
  it("keeps never-saved distinct from a saved 0", () => {
    expect(formatCount(null)).toBe("Not set")
    expect(formatCount(0)).toBe("0")
    expect(formatCount(12)).toBe("12")
  })
})

describe("OwnerHomeHeader", () => {
  it("shows the company name, a role chip and a single h1", () => {
    const out = html(h(OwnerHomeHeader, { companyName: "Company A", role: "owner_admin" }))
    expect(text(out)).toContain("Company: Company A")
    expect(out).toMatch(/<span class="bp-chip bp-chip--neutral">Role: <strong>owner_admin<\/strong><\/span>/)
    expect(out.match(/<h1[\s>]/g)).toHaveLength(1)
  })

  it("renders the actions slot and no links", () => {
    const out = html(
      h(OwnerHomeHeader, {
        companyName: "Company A",
        role: "owner_admin",
        actions: h("button", { type: "submit" }, "Sign out"),
      }),
    )
    expect(out).toContain(">Sign out</button>")
    expect(out).not.toContain("<a ")
  })
})

describe("TeamTodayCard", () => {
  it("shows Not set for both counts when nothing is saved", () => {
    const out = text(html(h(TeamTodayCard, { currentDjCount: null, desiredDjCount: null })))
    expect(out).toContain("DJs today: Not set")
    expect(out).toContain("Desired DJs: Not set")
  })

  it("shows a saved 0 as 0, not Not set", () => {
    const out = text(html(h(TeamTodayCard, { currentDjCount: 0, desiredDjCount: 0 })))
    expect(out).toContain("DJs today: 0")
    expect(out).toContain("Desired DJs: 0")
    expect(out).not.toContain("Not set")
  })

  it("keeps desired Not set while current is saved", () => {
    const out = text(html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null })))
    expect(out).toContain("DJs today: 3")
    expect(out).toContain("Desired DJs: Not set")
  })

  it("shows the editor for owners and the owner-only note otherwise", () => {
    const editor = h("form", { "data-saved-current-dj-count": "3" })
    const withEditor = html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null, editor }))
    expect(withEditor).toContain('data-saved-current-dj-count="3"')
    expect(withEditor).not.toContain(OWNER_ONLY)

    const readOnly = html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null }))
    expect(readOnly).not.toContain("<form")
    expect(readOnly).toContain(OWNER_ONLY)
  })

  it("is a section titled with an h2", () => {
    const out = html(h(TeamTodayCard, { currentDjCount: null, desiredDjCount: null }))
    expect(out).toMatch(/^<section class="bp-card bp-card--surface">/)
    expect(out).toContain('<h2 class="bp-card__title">Team today</h2>')
  })
})

describe("OwnerGoalCard", () => {
  it("shows the saved goal, with the company-defined text for Other", () => {
    expect(text(html(h(OwnerGoalCard, { goalLabel: "Scale", goalOther: null })))).toContain("Owner goal: Scale")
    expect(text(html(h(OwnerGoalCard, { goalLabel: "Other", goalOther: "Open a second office" })))).toContain(
      "Owner goal: Other (Open a second office)",
    )
    expect(text(html(h(OwnerGoalCard, { goalLabel: "Not set", goalOther: null })))).toContain("Owner goal: Not set")
  })

  it("shows the editor for owners and the owner-only note otherwise", () => {
    const editor = h("form", { "data-saved-owner-goal": "scale" })
    expect(html(h(OwnerGoalCard, { goalLabel: "Scale", goalOther: null, editor }))).not.toContain(OWNER_ONLY)
    const readOnly = html(h(OwnerGoalCard, { goalLabel: "Scale", goalOther: null }))
    expect(readOnly).not.toContain("<form")
    expect(readOnly).toContain(OWNER_ONLY)
  })
})

describe("owner home heading outline", () => {
  it("goes h1 then h2 for each card, with no skipped levels", () => {
    const out = html(
      h(
        Fragment,
        null,
        h(OwnerHomeHeader, { companyName: "Company A", role: "owner_admin" }),
        h(TeamTodayCard, { currentDjCount: 1, desiredDjCount: 2 }),
        h(OwnerGoalCard, { goalLabel: "Scale", goalOther: null }),
      ),
    )
    expect([...out.matchAll(/<h([1-6])[\s>]/g)].map(([, level]) => level)).toEqual(["1", "2", "2"])
  })
})
