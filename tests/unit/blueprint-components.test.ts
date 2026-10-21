import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  Avatar,
  BottomTabBar,
  Button,
  Card,
  Chip,
  DecisionCard,
  JourneyTrack,
  MessageBubble,
  SeatMap,
  StatusTag,
  TopNav,
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
    expect(html(h(DecisionCard, { title: "x", initialState: "done", doneTitle: "Sent" }))).toContain(">Undo<")
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
