import { createElement as h, Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OwnerGoalCard, OwnerHomeHero, TeamTodayCard } from "@/app/owner-home"
import { OWNER_GOAL_CODES } from "@/lib/blueprint/goals"
import { SYSTEM_ROLES, systemRoleLabel } from "@/lib/rules/system-role"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
const count = (markup: string, needle: string) => markup.split(needle).length - 1
const OWNER_ONLY = "Only the company owner can change these."
const editorForm = (attrs: Record<string, string>) => h("form", attrs)

describe("systemRoleLabel", () => {
  it("maps every system role to customer words", () => {
    expect(SYSTEM_ROLES.map(systemRoleLabel)).toEqual(["Owner", "Manager", "Trainer", "DJ"])
  })

  it("returns null for anything unknown, including the planned applicant role", () => {
    expect(systemRoleLabel("applicant")).toBeNull()
    expect(systemRoleLabel("something_else")).toBeNull()
    expect(systemRoleLabel("")).toBeNull()
  })
})

describe("OwnerHomeHero", () => {
  it("shows the company name and Signed in as Owner, never the role code", () => {
    const out = html(h(OwnerHomeHero, { companyName: "Company A", role: "owner_admin", isOwner: true }))
    expect(text(out)).toContain("Company A")
    expect(out).toContain(">Signed in as Owner</p>")
    expect(out).not.toContain("owner_admin")
    expect(out).not.toContain("bp-chip")
    expect(text(out)).not.toContain(":")
    expect(out.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(out).toContain("Start your Company Blueprint. These answers shape what Blueprint recommends.")
  })

  it("shows Signed in as Manager and the viewer lead for a manager", () => {
    const out = html(h(OwnerHomeHero, { companyName: "Company A", role: "manager", isOwner: false }))
    expect(out).toContain(">Signed in as Manager</p>")
    expect(out).not.toMatch(/>\s*manager\s*</)
    expect(out).toContain("Here’s what your company has shared so far.")
  })

  it("renders no role line for an unknown role and no links", () => {
    const out = html(h(OwnerHomeHero, { companyName: "Company A", role: "applicant", isOwner: false }))
    expect(out).not.toContain("Signed in as")
    expect(out).not.toContain("applicant")
    expect(out).not.toContain("<a ")
  })
})

describe("TeamTodayCard, read-only", () => {
  it("shows quiet Not set yet for both counts when nothing is saved", () => {
    const out = html(h(TeamTodayCard, { currentDjCount: null, desiredDjCount: null }))
    expect(out).toContain("Current DJ count")
    expect(out).toContain("Desired DJ count")
    expect(count(out, "Not set yet")).toBe(2)
    expect(count(out, "is-empty")).toBe(2)
    expect(out).toContain(OWNER_ONLY)
  })

  it("shows a saved 0 as 0 at full size, never as empty", () => {
    const out = html(h(TeamTodayCard, { currentDjCount: 0, desiredDjCount: 0 }))
    expect(count(out, '<span class="bp-fact__value">0</span>')).toBe(2)
    expect(out).not.toContain("Not set yet")
    expect(out).not.toContain("is-empty")
  })

  it("keeps desired empty while current is saved", () => {
    const out = html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null }))
    expect(out).toContain('<span class="bp-fact__value">3</span>')
    expect(count(out, "Not set yet")).toBe(1)
  })

  it("has no form for viewers", () => {
    const out = html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null }))
    expect(out).not.toContain("<form")
    expect(count(out, 'class="bp-fact"')).toBe(2)
  })
})

describe("TeamTodayCard, owner", () => {
  it("shows the editor and never the facts or the owner-only note", () => {
    const out = html(
      h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null, editor: editorForm({ "data-saved-current-dj-count": "3" }) }),
    )
    expect(out).toContain('data-saved-current-dj-count="3"')
    expect(out).not.toContain("bp-fact")
    expect(out).not.toContain(OWNER_ONLY)
    expect(out).toContain("Blueprint will use these to recommend whether recruiting makes sense for you.")
  })

  it("is a section named by its h2", () => {
    const out = html(h(TeamTodayCard, { currentDjCount: null, desiredDjCount: null }))
    expect(out).toMatch(/^<section class="bp-card bp-card--surface[^"]*" aria-labelledby="team-today-title">/)
    expect(out).toContain('<h2 id="team-today-title" class="bp-card__title">Team today</h2>')
  })
})

describe("TeamTodayCard status", () => {
  const status = (current: number | null, desired: number | null) =>
    html(h(TeamTodayCard, { currentDjCount: current, desiredDjCount: desired })).match(
      /<span class="bp-status [^"]*"><span[^>]*><\/span>([^<]*)<\/span>/,
    )?.[1]

  it("is derived from the saved values, with 0 counting as answered", () => {
    expect(status(null, null)).toBe("Not answered yet")
    expect(status(3, null)).toBe("Partly answered")
    expect(status(null, 4)).toBe("Partly answered")
    expect(status(0, 0)).toBe("Answered")
  })

  it("uses the matching motif and is the same for owners and viewers", () => {
    expect(html(h(TeamTodayCard, { currentDjCount: null, desiredDjCount: null }))).toContain("bp-status--planned")
    expect(html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null }))).toContain("bp-status--progress")
    const owner = html(h(TeamTodayCard, { currentDjCount: 0, desiredDjCount: 0, editor: editorForm({}) }))
    expect(owner).toContain("bp-status--proven")
    expect(text(owner)).toContain("Answered")
  })
})

describe("OwnerGoalCard", () => {
  const viewer = (goal: Parameters<typeof OwnerGoalCard>[0]["goal"], goalOther: string | null = null) =>
    html(h(OwnerGoalCard, { goal, goalOther, isOwner: false }))

  it("shows Company goal with a Goal fact for viewers", () => {
    const out = viewer("scale")
    expect(out).toContain(">Company goal</h2>")
    expect(out).toContain('<span class="bp-fact__label">Goal</span><span class="bp-fact__value">Scale</span>')
    expect(out).toContain(OWNER_ONLY)
    expect(out).not.toContain("<form")
  })

  it("shows the Other text alone, or Other when the text is empty", () => {
    const withText = viewer("other", "Open a second office")
    expect(withText).toContain('<span class="bp-fact__value">Open a second office</span>')
    expect(text(withText)).not.toContain("Other (")
    expect(viewer("other", "")).toContain('<span class="bp-fact__value">Other</span>')
    expect(viewer("other", null)).toContain('<span class="bp-fact__value">Other</span>')
  })

  it("shows No goal chosen yet, quietly, when nothing is saved", () => {
    expect(viewer(null)).toContain('<span class="bp-fact__value is-empty">No goal chosen yet</span>')
  })

  it("never shows a goal code", () => {
    for (const code of OWNER_GOAL_CODES) {
      expect(text(viewer(code))).not.toContain(code)
    }
  })

  it("shows Your goals, Main goal and Also for a switch-on owner", () => {
    const out = html(
      h(OwnerGoalCard, {
        goal: "scale",
        goalOther: null,
        isOwner: true,
        editHref: "/blueprint/goals",
        alsoLine: "Also: Expand, Improve quality",
      }),
    )
    expect(out).toContain(">Your goals</h2>")
    expect(out).toContain('<span class="bp-fact__label">Main goal</span><span class="bp-fact__value">Scale</span>')
    expect(out).toContain("Also: Expand, Improve quality")
    expect(out).toContain("Edit in your Blueprint")
    expect(out).not.toContain("scale")
    expect(out).not.toContain("expand")
    expect(out).not.toContain("improve_quality")
  })

  it("keeps the manager card as Company goal with no Also line", () => {
    const out = html(h(OwnerGoalCard, { goal: "scale", goalOther: null, isOwner: false }))
    expect(out).toContain(">Company goal</h2>")
    expect(out).toContain('<span class="bp-fact__label">Goal</span>')
    expect(out).not.toContain("Also:")
    expect(out).not.toContain("Your goals")
  })

  it("shows Your goal with only the editor for the owner", () => {
    const out = html(h(OwnerGoalCard, { goal: "scale", goalOther: null, isOwner: true, editor: editorForm({ "data-saved-owner-goal": "scale" }) }))
    expect(out).toContain(">Your goal</h2>")
    expect(out).toContain('data-saved-owner-goal="scale"')
    expect(out).not.toContain("bp-fact")
    expect(out).not.toContain(OWNER_ONLY)
  })

  it("is answered for any saved goal and not answered when none is saved", () => {
    expect(text(viewer(null))).toContain("Not answered yet")
    expect(viewer(null)).toContain("bp-status--planned")
    expect(text(viewer("scale"))).toContain("Answered")
    expect(text(viewer("scale"))).not.toContain("Not answered yet")
    expect(viewer("scale")).toContain("bp-status--proven")
  })

  it("is a section named by its h2", () => {
    expect(viewer("scale")).toMatch(/^<section class="bp-card bp-card--surface[^"]*" aria-labelledby="owner-goal-title">/)
    expect(viewer("scale")).toContain('<h2 id="owner-goal-title"')
  })
})

describe("owner home heading outline", () => {
  it("goes h1 then h2 for each card, with no skipped levels", () => {
    const out = html(
      h(
        Fragment,
        null,
        h(OwnerHomeHero, { companyName: "Company A", role: "owner_admin", isOwner: true }),
        h(TeamTodayCard, { currentDjCount: 1, desiredDjCount: 2 }),
        h(OwnerGoalCard, { goal: "scale", goalOther: null, isOwner: true }),
      ),
    )
    expect([...out.matchAll(/<h([1-6])[\s>]/g)].map(([, level]) => level)).toEqual(["1", "2", "2"])
    expect(out).not.toContain("<a ")
  })

  it("never shows a label ending in a colon", () => {
    const out = text(
      html(
        h(
          Fragment,
          null,
          h(OwnerHomeHero, { companyName: "Company A", role: "manager", isOwner: false }),
          h(TeamTodayCard, { currentDjCount: null, desiredDjCount: 0 }),
          h(OwnerGoalCard, { goal: null, goalOther: null, isOwner: false }),
        ),
      ),
    )
    expect(out).not.toContain(":")
    expect(out).not.toContain("null")
  })
})
