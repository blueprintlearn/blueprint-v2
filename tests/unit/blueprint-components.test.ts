import { readFileSync } from "node:fs"
import path from "node:path"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  Avatar,
  BottomTabBar,
  Button,
  Card,
  Chip,
  DECIDE_FAILED,
  DecisionCard,
  JourneyTrack,
  MessageBubble,
  runDecisionStep,
  SeatMap,
  StatusTag,
  TenantBrandScope,
  TopNav,
  UNDO_FAILED,
} from "@/components/blueprint"
import { isCurrentPath } from "@/components/blueprint/nav-match"

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe("Blueprint components render and keep their accessibility promises", () => {
  it("Button is a real button with the variant class", () => {
    const out = html(h(Button, { variant: "coral" }, "Plan my next hire"))
    expect(out).toContain('<button type="button" class="bp-btn bp-btn--coral"')
  })

  it("StatusTag always shows words with the motif swatch", () => {
    expect(html(h(StatusTag, { status: "progress" }))).toContain("In progress")
    expect(html(h(StatusTag, { status: "planned", label: "  " }))).toContain("Planned")
  })

  it("JourneyTrack shows stage words and the current stage", () => {
    const out = html(h(JourneyTrack, { current: 2 }))
    for (const s of ["Learn", "Practice", "Prove", "Advance", "Now: Practice"]) expect(out).toContain(s)
    expect(out).toContain("bp-journey__seg--now bp-hatch")
  })

  it("SeatMap legend names every state with its count", () => {
    const out = html(
      h(SeatMap, {
        seats: [{ initials: "MR" }, { initials: "PS", status: "progress" }, { status: "planned", label: "Your next hire" }],
        label: "Spring seats",
      }),
    )
    expect(out).toContain("Proven: 1 leads today")
    expect(out).toContain("In progress: 1 on their way")
    expect(out).toContain("Planned: 1 open seat")
    expect(out).toContain('aria-label="Spring seats"')
  })

  it("DecisionCard renders evidence, title and actions; consequential cards start open", () => {
    const out = html(
      h(
        DecisionCard,
        { tone: "blush", kicker: "Ready to advance", title: "Jake is ready", primaryLabel: "Approve Jake", secondaryLabel: "See evidence", consequential: true },
        h(Avatar, { name: "Jake Morales", tone: "blush", onTint: true }),
      ),
    )
    expect(out).toContain("Approve Jake")
    expect(out).toContain('aria-label="Jake Morales"')
    expect(out).not.toContain("Confirm decision")
  })

  it("DecisionCard done state: consequential shows the record, reversible shows Undo", () => {
    expect(html(h(DecisionCard, { title: "x", consequential: true, initialState: "done", doneTitle: "Approved" }))).toContain("Recorded with your name and the time.")
    expect(html(h(DecisionCard, { title: "x", initialState: "done", doneTitle: "Sent", onUndo: () => {} }))).toContain(">Undo<")
  })

  it("Chip, Card, Avatar and MessageBubble render", () => {
    expect(html(h(Chip, { tone: "mint", icon: "check", children: "On track" }))).toContain("bp-chip--mint")
    expect(html(h(Card, { tone: "lavender", title: "MC Foundations" }))).toContain("bp-card--lavender")
    expect(html(h(Avatar, { name: "Priya Shah" }))).toContain(">PS<")
    expect(html(h(MessageBubble, null, "Hey Devon!"))).toContain("Blueprint drafted this for you")
  })

  it("TopNav and BottomTabBar mark the current destination", () => {
    const items = [
      { href: "/", label: "Home" },
      { href: "/people", label: "People" },
    ]
    expect(html(h(TopNav, { items, currentHref: "/" }))).toMatch(/aria-current="page"[^>]*>Home</)
    const tabs = html(h(BottomTabBar, { items: [{ href: "/", label: "Home", icon: "home", badge: 12 }], currentHref: "/" }))
    expect(tabs).toContain('aria-current="page"')
    expect(tabs).toContain("9+")
    expect(tabs).toContain(", 12 need you")
  })

  it("TenantBrandScope scopes validated overrides and writes nothing for invalid input", () => {
    expect(html(h(TenantBrandScope, { brand: { primary: "#FFD400" }, children: "x" }))).toContain("[data-tenant-brand] {")
    expect(html(h(TenantBrandScope, { brand: { primary: "</style><script>" }, children: "x" }))).not.toContain("<style")
  })
})

const buttonFor = (out: string, label: string) => out.match(new RegExp(`<button[^>]*>${label}</button>`))?.[0] ?? null

describe("DecisionCard never shows an outcome it did not get", () => {
  it("disables the decision when there is no onDecide, in both open and confirm states", () => {
    const open = html(h(DecisionCard, { title: "x", primaryLabel: "Approve Jake" }))
    expect(buttonFor(open, "Approve Jake")).toContain('disabled=""')
    const confirm = html(h(DecisionCard, { title: "x", consequential: true, initialState: "confirm", confirmLabel: "Yes, approve" }))
    expect(buttonFor(confirm, "Yes, approve")).toContain('disabled=""')
    const wired = html(h(DecisionCard, { title: "x", primaryLabel: "Approve Jake", onDecide: () => {} }))
    expect(buttonFor(wired, "Approve Jake")).not.toContain("disabled")
  })

  it("offers Undo only with a real onUndo, and never on consequential decisions", () => {
    expect(html(h(DecisionCard, { title: "x", initialState: "done" }))).not.toContain("Undo")
    expect(html(h(DecisionCard, { title: "x", initialState: "done", onUndo: () => {} }))).toContain(">Undo<")
    expect(html(h(DecisionCard, { title: "x", initialState: "done", consequential: true, onUndo: () => {} }))).not.toContain("Undo")
  })

  it("renders the secondary action only with onSecondary", () => {
    expect(html(h(DecisionCard, { title: "x", secondaryLabel: "See evidence" }))).not.toContain("See evidence")
    expect(buttonFor(html(h(DecisionCard, { title: "x", secondaryLabel: "See evidence", onSecondary: () => {} })), "See evidence")).not.toBeNull()
  })

  it("does nothing when a handler is missing", async () => {
    await expect(runDecisionStep("decide", undefined, "open")).resolves.toEqual({ state: "open", error: null })
    await expect(runDecisionStep("decide", undefined, "confirm")).resolves.toEqual({ state: "confirm", error: null })
    await expect(runDecisionStep("undo", undefined, "done")).resolves.toEqual({ state: "done", error: null })
  })

  it("reaches done only after onDecide completes", async () => {
    let finish!: () => void
    let settled = false
    const step = runDecisionStep("decide", () => new Promise<void>((resolve) => (finish = resolve)), "open").then((r) => {
      settled = true
      return r
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    finish()
    await expect(step).resolves.toEqual({ state: "done", error: null })
  })

  it("stays put and says nothing changed when onDecide fails", async () => {
    const rejects = () => Promise.reject(new Error("network"))
    await expect(runDecisionStep("decide", rejects, "open")).resolves.toEqual({ state: "open", error: DECIDE_FAILED })
    await expect(runDecisionStep("decide", rejects, "confirm")).resolves.toEqual({ state: "confirm", error: DECIDE_FAILED })
    const throws = () => {
      throw new Error("sync")
    }
    await expect(runDecisionStep("decide", throws, "open")).resolves.toEqual({ state: "open", error: DECIDE_FAILED })
  })

  it("reopens only when onUndo succeeds, and keeps the decision when it fails", async () => {
    await expect(runDecisionStep("undo", async () => {}, "done")).resolves.toEqual({ state: "open", error: null })
    await expect(runDecisionStep("undo", () => Promise.reject(new Error("network")), "done")).resolves.toEqual({
      state: "done",
      error: UNDO_FAILED,
    })
  })
})

describe("TopNav renders interactive controls only when they do something", () => {
  const items = [{ href: "/", label: "Home" }]
  const count = (out: string, tag: string) => (out.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length

  it("renders no buttons until controls are configured", () => {
    const out = html(h(TopNav, { items, currentHref: "/", workspace: "Riverside DJ Co.", alerts: 3, userInitial: "D" }))
    expect(count(out, "button")).toBe(0)
    expect(out).toContain("Riverside DJ Co.")
    expect(out).not.toContain("M6 9l6 6 6-6")
    expect(out).not.toContain("Search")
    expect(out).toMatch(/<span class="bp-nav__icon bp-nav__static" role="img" aria-label="Notifications, 3 new">/)
    expect(out).toMatch(/<span class="bp-nav__me bp-nav__static" role="img" aria-label="Account">D<\/span>/)
  })

  it("leaves out notifications with no alerts and no destination", () => {
    expect(html(h(TopNav, { items, currentHref: "/" }))).not.toContain("Notifications")
  })

  it("renders buttons for callbacks", () => {
    const fn = () => {}
    const out = html(
      h(TopNav, {
        items,
        currentHref: "/",
        workspace: "Riverside DJ Co.",
        onOpenWorkspace: fn,
        onOpenNotifications: fn,
        userInitial: "D",
        accountLabel: "Account for David",
        onOpenAccount: fn,
        onOpenSearch: fn,
      }),
    )
    expect(count(out, "button")).toBe(4)
    for (const label of ["Workspace: Riverside DJ Co.", "Notifications", "Account for David", "Search"]) {
      expect(out).toMatch(new RegExp(`<button[^>]*aria-label="${label}"`))
    }
    expect(out).toContain("M6 9l6 6 6-6")
    expect(out).not.toContain("bp-nav__static")
  })

  it("renders links for hrefs", () => {
    const out = html(
      h(TopNav, {
        items,
        currentHref: "/",
        workspace: "Riverside DJ Co.",
        workspaceHref: "/settings/company",
        alerts: 2,
        notificationsHref: "/notifications",
        userInitial: "D",
        accountHref: "/account",
        searchHref: "/search",
      }),
    )
    expect(count(out, "button")).toBe(0)
    for (const href of ["/settings/company", "/notifications", "/account", "/search"]) expect(out).toContain(`href="${href}"`)
    expect(out).toMatch(/<a[^>]*aria-label="Notifications, 2 new"/)
  })
})

describe("touch targets", () => {
  const css = readFileSync(path.resolve(__dirname, "../../styles/blueprint/components.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(",").map((s) => s.trim()), body: m[2] }))
  const px = (body: string, prop: string) => Number(body.match(new RegExp(`(?:^|;)${prop}:(\\d+(?:\\.\\d+)?)px`))?.[1] ?? NaN)
  const hitArea = rules.find((r) => /width:max\(100%,44px\)/.test(r.body) && /height:max\(100%,44px\)/.test(r.body))

  it.each(["bp-btn", "bp-btn--sm", "bp-nav__tab", "bp-nav__ws", "bp-nav__icon", "bp-nav__me", "bp-link", "bp-tabbar__item"])(
    ".%s answers to at least 44px",
    (cls) => {
      const own = rules.filter((r) => r.selectors.includes(`.${cls}`))
      const height = Math.max(...own.map((r) => Math.max(px(r.body, "height") || 0, px(r.body, "min-height") || 0)))
      const width = Math.max(...own.map((r) => Math.max(px(r.body, "width") || 0, px(r.body, "min-width") || 0)))
      const drawnIsEnough = height >= 44 && (width >= 44 || !own.some((r) => /(?:^|;)width:/.test(r.body)))
      expect(drawnIsEnough || Boolean(hitArea?.selectors.includes(`.${cls}::after`))).toBe(true)
    },
  )

  it("static TopNav content gets no hit area", () => {
    expect(rules.some((r) => r.selectors.includes(".bp-nav__static::after") && /content:none/.test(r.body))).toBe(true)
  })
})

describe("isCurrentPath", () => {
  it("matches home exactly and sections by prefix", () => {
    expect(isCurrentPath("/", "/")).toBe(true)
    expect(isCurrentPath("/", "/people")).toBe(false)
    expect(isCurrentPath("/people", "/people/jake")).toBe(true)
    expect(isCurrentPath("/people", "/peoplex")).toBe(false)
    expect(isCurrentPath("/people", null)).toBe(false)
  })
})
