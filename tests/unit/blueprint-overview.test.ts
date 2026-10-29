import { createElement as h, Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OwnerGoalCard, TeamTodayCard } from "@/app/owner-home"
import {
  ALL_READY_DONE_TEXT,
  BlueprintHomeCard,
  BlueprintOverview,
  BlueprintSectionList,
  BlueprintSectionPage,
  GOALS_OPENING,
  OVERVIEW_LEAD,
  TEAM_FOOTER_NOTE,
  TEAM_OPENING,
} from "@/app/blueprint/blueprint-ui"
import { blueprintSection, getBlueprintProgress } from "@/lib/blueprint/progress"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
const count = (markup: string, needle: string) => markup.split(needle).length - 1
const anchors = (markup: string) =>
  [...markup.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].map(([, attrs, label]) => ({
    href: attrs.match(/href="([^"]*)"/)?.[1],
    className: attrs.match(/class="([^"]*)"/)?.[1] ?? "",
    label,
  }))
const primaryLink = (markup: string) =>
  anchors(markup).find((a) => a.className.includes("bp-btn--primary"))

const APPROVED = [
  ["Your goal", "What you want Blueprint to help you do"],
  ["Your team today", "How many DJs you have, and how many you’d like"],
  ["Your events", "How many events you book, who works them, and your busiest dates"],
  ["Your services and market", "What your DJs handle at events, and where your prices sit"],
  ["Your numbers", "What each event really earns, private to you"],
  ["How you develop DJs", "How you hire and train today, and what to keep"],
  ["Your ideal DJ", "Your core values and the skills you hire for"],
  ["Your Blueprint", "Blueprint’s recommendations, for you to approve or change"],
] as const

const none = getBlueprintProgress(null, null)
const started = getBlueprintProgress({ ownerGoal: "scale" }, null)
const partlyTeam = getBlueprintProgress({ ownerGoal: "scale" }, { currentDjCount: 3, desiredDjCount: null })
const allReady = getBlueprintProgress({ ownerGoal: "scale" }, { currentDjCount: 3, desiredDjCount: 5 })

describe("BlueprintSectionList", () => {
  const out = html(h(BlueprintSectionList, { progress: started }))

  it("is one named card with an ordered list of eight rows", () => {
    expect(out).toMatch(/^<section class="bp-card[^"]*" aria-labelledby="blueprint-sections-title">/)
    expect(count(out, "<ol")).toBe(1)
    expect(count(out, "<li")).toBe(8)
  })

  it("shows the approved name and description for every section, in order", () => {
    const rows = [...out.matchAll(/<li\b[\s\S]*?<\/li>/g)].map(([li]) => text(li))
    expect(rows).toHaveLength(8)
    APPROVED.forEach(([name, description], index) => {
      expect(rows[index]).toContain(`${index + 1} ${name} ${description}`)
    })
  })

  it("links only the two live sections and leaves six as Coming soon", () => {
    expect(count(out, "<a ")).toBe(2)
    expect(out).toContain('href="/blueprint/goals"')
    expect(out).toContain('href="/blueprint/team"')
    expect(count(out, "Coming soon")).toBe(6)
  })

  it("uses customer words for statuses, never codes", () => {
    expect(text(out)).toContain("Done")
    expect(text(out)).toContain("Not started")
    for (const code of ["not_started", "in_progress", "coming_soon", "planned", "proven"]) {
      expect(text(out)).not.toContain(code)
    }
    expect(text(html(h(BlueprintSectionList, { progress: partlyTeam })))).toContain("In progress")
  })
})

describe("BlueprintOverview", () => {
  const render = (progress: typeof none) => html(h(BlueprintOverview, { companyName: "Company A", progress }))

  it("has one h1, the company name, the lead and the count", () => {
    const out = render(none)
    expect(out.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(out).toContain("Your Company Blueprint</h1>")
    expect(text(out)).toContain("Company A")
    expect(text(out)).toContain(OVERVIEW_LEAD)
    expect(text(out)).toContain("0 of 8 sections done")
    expect(text(render(allReady))).toContain("2 of 8 sections done")
  })

  it("offers Start when nothing is saved, linking to Goals", () => {
    const out = render(none)
    expect(primaryLink(out)).toMatchObject({ href: "/blueprint/goals", label: "Start your Blueprint" })
    expect(count(out, "bp-btn--primary")).toBe(1)
  })

  it("offers Continue at the first unfinished live section", () => {
    expect(primaryLink(render(started))).toMatchObject({ href: "/blueprint/team", label: "Continue your Blueprint" })
    expect(primaryLink(render(partlyTeam))).toMatchObject({ href: "/blueprint/team", label: "Continue your Blueprint" })
    const teamOnly = getBlueprintProgress(null, { currentDjCount: 1, desiredDjCount: 2 })
    expect(primaryLink(render(teamOnly))).toMatchObject({ href: "/blueprint/goals", label: "Continue your Blueprint" })
  })

  it("has no primary button once every live section is done, and says more is coming", () => {
    const out = render(allReady)
    expect(count(out, "bp-btn--primary")).toBe(0)
    expect(text(out)).toContain(ALL_READY_DONE_TEXT)
    expect(ALL_READY_DONE_TEXT).toBe("You’ve finished the sections that are ready. More are coming soon.")
  })
})

describe("BlueprintHomeCard", () => {
  const render = (progress: typeof none) => html(h(BlueprintHomeCard, { progress }))
  const tag = (out: string) => out.match(/<span class="bp-status [^"]*"><span[^>]*><\/span>([^<]*)<\/span>/)?.[1]

  it("is a section named by its h2, with a status, the count and one primary action", () => {
    const out = render(none)
    expect(out).toMatch(/^<section class="bp-card[^"]*" aria-labelledby="company-blueprint-title">/)
    expect(out).toContain('<h2 id="company-blueprint-title" class="bp-card__title">Your Company Blueprint</h2>')
    expect(tag(out)).toBe("Not started")
    expect(text(out)).toContain("0 of 8 sections done")
    expect(out).toContain("Start your Blueprint")
    expect(count(out, "bp-btn--primary")).toBe(1)
  })

  it("continues, then offers a soft Review when nothing is left", () => {
    expect(tag(render(started))).toBe("In progress")
    expect(render(started)).toContain("Continue your Blueprint")
    const done = render(allReady)
    expect(anchors(done)).toEqual([
      { href: "/blueprint", className: "bp-btn bp-btn--soft self-start", label: "Review your Blueprint" },
    ])
    expect(count(done, "bp-btn--primary")).toBe(0)
    expect(text(done)).toContain("2 of 8 sections done")
  })
})

describe("BlueprintSectionPage", () => {
  const goals = blueprintSection("goals")!
  const render = (footer = h("a", { href: "/x" }, "Next")) =>
    html(
      h(BlueprintSectionPage, {
        section: goals,
        status: "not_started",
        opening: GOALS_OPENING,
        footer,
        children: h("form", null),
      }),
    )

  it("has Back to your Blueprint, Section 1 of 8, one h1 with a status and the opening copy", () => {
    const out = render()
    expect(anchors(out)[0]).toMatchObject({ href: "/blueprint", label: "Back to your Blueprint" })
    expect(anchors(out)[0].className).toContain("bp-link")
    expect(text(out)).toContain("Section 1 of 8")
    expect(out.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(out).toContain(">Your goal</h1>")
    expect(out).toContain("bp-status--planned")
    expect(text(out)).toContain("Not started")
    expect(text(out)).toContain("Let’s start with where you want to go. Everything Blueprint suggests ties back to this.")
    expect(GOALS_OPENING).toBe("Let’s start with where you want to go. Everything Blueprint suggests ties back to this.")
    expect(TEAM_OPENING).toBe("Now your team: how many DJs you have, and how many you’d like.")
    expect(TEAM_FOOTER_NOTE).toBe("The next sections are coming soon.")
  })

  it("headings use the approved names for both live sections", () => {
    for (const [slug, name, n] of [
      ["goals", "Your goal", 1],
      ["team", "Your team today", 2],
    ] as const) {
      const out = html(
        h(BlueprintSectionPage, { section: blueprintSection(slug)!, status: "done", opening: "x", footer: null, children: null }),
      )
      expect(out).toContain(`>${name}</h1>`)
      expect(text(out)).toContain(`Section ${n} of 8`)
    }
  })

  it("names the form card by the h1", () => {
    expect(render()).toContain('aria-labelledby="section-title"')
    expect(render()).toContain('<h1 id="section-title"')
  })
})

describe("Owner home read-only cards with the guided Blueprint on", () => {
  it("shows facts and a soft small Edit in your Blueprint link instead of the owner-only note", () => {
    const team = html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: null, editHref: "/blueprint/team" }))
    expect(team).toContain('href="/blueprint/team"')
    expect(team).toContain("bp-btn bp-btn--soft bp-btn--sm")
    expect(text(team)).toContain("Edit in your Blueprint")
    expect(team).not.toContain("Only the company owner can change these.")
    expect(team).not.toContain("<form")
    expect(count(team, 'class="bp-fact"')).toBe(2)

    const goal = html(h(OwnerGoalCard, { goal: "scale", goalOther: null, isOwner: true, editHref: "/blueprint/goals" }))
    expect(goal).toContain('href="/blueprint/goals"')
    expect(text(goal)).toContain("Edit in your Blueprint")
    expect(goal).toContain(">Your goal</h2>")
    expect(goal).not.toContain("Only the company owner can change these.")
  })

  it("gives the two links distinct accessible names while keeping the visible text", () => {
    const team = html(h(TeamTodayCard, { currentDjCount: 3, desiredDjCount: 4, editHref: "/blueprint/team" }))
    const goal = html(h(OwnerGoalCard, { goal: null, goalOther: null, isOwner: true, editHref: "/blueprint/goals" }))
    expect(text(team)).toContain("Edit in your Blueprint for Team today")
    expect(text(goal)).toContain("Edit in your Blueprint for your goal")
  })

  it("keeps the heading outline h1, h2, h2, h2 with no skipped level", () => {
    const out = html(
      h(
        Fragment,
        null,
        h("h1", null, "Welcome back."),
        h(BlueprintHomeCard, { progress: none }),
        h(TeamTodayCard, { currentDjCount: 1, desiredDjCount: 2, editHref: "/blueprint/team" }),
        h(OwnerGoalCard, { goal: "scale", goalOther: null, isOwner: true, editHref: "/blueprint/goals" }),
      ),
    )
    expect([...out.matchAll(/<h([1-6])[\s>]/g)].map(([, level]) => level)).toEqual(["1", "2", "2", "2"])
  })
})
