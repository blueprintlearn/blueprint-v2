import { expect, test, type Page } from "@playwright/test"

import { COMPANY_A_ID, resetGuidedCompanyData } from "./empty-guided-company"

const password = "blueprint-local-password"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const APPROVED_SECTIONS = [
  ["Your goals", "What you want Blueprint to help you do"],
  ["Your team today", "How many DJs you have, who can lead, and how many you’d like"],
  ["Your events", "How many events you book, who works them, and what you want next"],
  ["Your services and market", "What you offer today, how you sit in the market, and what you want to grow"],
  ["Your numbers", "Approximate revenue, typical event costs, and a financial priority, private to you"],
  ["How you develop DJs", "How you recruit and train today, and what you want to improve"],
  ["Your ideal DJ", "Your core values and the skills you hire for"],
  ["Your Blueprint", "Blueprint’s recommendations, for you to approve or change"],
] as const

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")
const doneText = (page: Page) => page.getByText(/^\d of 8 sections complete( · \d started)?$/)
const row = (page: Page, name: string) =>
  page.locator("ol li").filter({ has: page.getByText(name, { exact: true }) })

async function doneCount(page: Page) {
  const line = (await doneText(page).textContent()) ?? ""
  return Number(line.match(/^(\d)/)?.[1])
}

test.describe("guided Blueprint (switch on for Company A, off for Company B)", () => {
  test("signed-out visitors go home, whatever the path", async ({ page }) => {
    for (const path of ["/blueprint", "/blueprint/goals", "/blueprint/team", "/blueprint/events", "/blueprint/services", "/blueprint/numbers", "/blueprint/development", "/blueprint/nope"]) {
      await page.goto(path)
      await expect(page).toHaveURL("/")
      await expect(page.getByRole("heading", { name: "Blueprint" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
    }
  })

  test("Company A owner walks the guided Blueprint and every save shows up without a manual reload", async ({ page }) => {
    resetGuidedCompanyData(COMPANY_A_ID)
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint")

    await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toBeVisible()
    await expect(page.locator("main").getByText("Company A", { exact: true })).toBeVisible()
    await expect(
      page.getByText("Eight short sections. Blueprint saves each answer when you press Save, so you can stop and pick up any time."),
    ).toBeVisible()
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0)
    await expect(page.locator("header.bp-nav.bp-nav--no-tabs")).toBeVisible()
    await expect(page.getByRole("navigation")).toHaveCount(0)

    await expect(page.locator("ol li")).toHaveCount(8)
    await expect(page.locator("ol li a")).toHaveCount(6)
    await expect(row(page, "Your goals").getByRole("link")).toHaveAttribute("href", "/blueprint/goals")
    await expect(row(page, "Your team today").getByRole("link")).toHaveAttribute("href", "/blueprint/team")
    await expect(row(page, "Your events").getByRole("link")).toHaveAttribute("href", "/blueprint/events")
    await expect(row(page, "Your services and market").getByRole("link")).toHaveAttribute("href", "/blueprint/services")
    await expect(row(page, "Your numbers").getByRole("link")).toHaveAttribute("href", "/blueprint/numbers")
    await expect(row(page, "How you develop DJs").getByRole("link")).toHaveAttribute("href", "/blueprint/development")
    for (const name of ["Your ideal DJ", "Your Blueprint"]) {
      await expect(row(page, name).getByText("Coming soon")).toBeVisible()
      await expect(row(page, name).getByRole("link")).toHaveCount(0)
    }
    for (const [name, description] of APPROVED_SECTIONS) {
      await expect(row(page, name).getByText(description, { exact: true })).toBeVisible()
    }
    for (const code of ["not_started", "in_progress", "coming_soon", "owner_admin"]) {
      await expect(page.getByText(code)).toHaveCount(0)
    }

    // Goals
    await row(page, "Your goals").getByRole("link").click()
    await expect(page).toHaveURL("/blueprint/goals")
    await expect(page.getByRole("link", { name: "Back to your Blueprint" })).toHaveAttribute("href", "/blueprint")
    await expect(page.getByText("Section 1 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Your goals" })).toBeVisible()
    await expect(
      page.getByText("Let’s start with where you want to go. Everything Blueprint suggests ties back to this."),
    ).toBeVisible()
    await expect(page.locator("form[data-saved-company-goals]")).toHaveCount(1)
    await expect(page.getByRole("link", { name: "Next: Your team today" })).toHaveAttribute("href", "/blueprint/team")
    await expect(page.locator(".bp-btn--primary")).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Save goals", exact: true })).toHaveClass(/\bbp-btn--primary\b/)

    await page.getByRole("checkbox", { name: /Scale/ }).check()
    const primarySelect = page.getByLabel("Which one matters most right now?")
    if (await primarySelect.count()) {
      await primarySelect.selectOption("scale")
    } else {
      await expect(page.getByText("That’s your main goal. Blueprint will put it first in its recommendations.")).toBeVisible()
    }
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(page.locator("form[data-saved-company-goals] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Complete")

    // Team: current first, then desired
    await page.getByRole("link", { name: "Next: Your team today" }).click()
    await expect(page).toHaveURL("/blueprint/team")
    await expect(page.getByText("Section 2 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Your team today" })).toBeVisible()
    await expect(
      page.getByText("Now your team. We’ll count you separately, because your own events matter here too."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Previous: Your goals" })).toHaveAttribute("href", "/blueprint/goals")
    await expect(page.getByRole("link", { name: "Next: Your events" })).toHaveAttribute("href", "/blueprint/events")
    await expect(page.getByRole("link", { name: "Back to your Blueprint" })).toHaveCount(1)
    await expect(page.locator("form[data-card='today']")).toHaveCount(1)
    await expect(page.locator("form[data-card='wanted']")).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Save your team today" })).toHaveClass(/\bbp-btn--primary\b/)
    await expect(page.getByRole("button", { name: "Save how your team runs" })).toHaveClass(/\bbp-btn--primary\b/)
    await expect(page.getByRole("button", { name: "Save the team you want" })).toHaveClass(/\bbp-btn--primary\b/)

    const t0No = page.getByRole("radio", { name: "No, just my team" })
    if (await t0No.count()) {
      await t0No.check()
    }
    await page.getByLabel(/Not counting yourself, how many DJs work events/).fill("6")
    await page.getByLabel(/only as assistants/).fill("1")
    await page.getByRole("radio", { name: "Yes, now and then" }).check()
    await page.getByLabel(/can lead an event/).fill("2")
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Needs attention")

    await page.getByRole("checkbox", { name: "A manager" }).check()
    await page.getByRole("checkbox", { name: "Finding good candidates" }).check()
    await expect(page.getByRole("checkbox", { name: "A manager" })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: "Finding good candidates" })).toBeChecked()
    await page.getByRole("button", { name: "Save how your team runs" }).click()
    await expect(page.locator("form[data-card='runs'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='runs']")).toHaveAttribute("data-saved-t4", "manager")
    await expect(page.locator("form[data-card='runs']")).toHaveAttribute("data-saved-t5", "finding_candidates")

    await page.getByLabel(/DJs would you like|Earlier you said/).fill("8")
    await page.getByRole("button", { name: "Save the team you want" }).click()
    await expect(page.locator("form[data-card='wanted'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Complete")
    await expect(page.getByRole("region", { name: "Your team at a glance" })).toContainText("You and 6 DJs")

    await page.getByRole("link", { name: "Next: Your events" }).click()
    await expect(page).toHaveURL("/blueprint/events")
    await expect(page.getByText("Section 3 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Your events" })).toBeVisible()
    await expect(
      page.getByText("Now your events: what you book today, who can run them, and what you want next."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Previous: Your team today" })).toHaveAttribute("href", "/blueprint/team")
    await expect(page.getByRole("link", { name: "Next: Your services and market" })).toHaveAttribute("href", "/blueprint/services")
    await expect(page.getByText("The next sections are coming soon.")).toHaveCount(0)
    await expect(page.locator("form[data-card='today']")).toHaveCount(1)
    await expect(page.locator("form[data-card='staff']")).toHaveCount(1)
    await expect(page.locator("form[data-card='future']")).toHaveCount(1)

    await page.getByRole("checkbox", { name: "Weddings" }).first().check()
    await page.getByRole("checkbox", { name: "Corporate events" }).first().check()
    await page.getByLabel(/About how many events do you book in a year/).fill("80")
    await page.locator("#q-E3").getByRole("checkbox", { name: "Weddings" }).check()
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1", "wedding,corporate")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e2", "80")
    await expect(sectionStatus(page)).toHaveText("Needs attention")

    await page.locator("#q-E4").getByRole("checkbox", { name: "Corporate events" }).check()
    await page.locator("#q-E5").getByRole("checkbox", { name: "Weddings" }).check()
    await page.getByRole("radio", { name: "They start as assistants" }).check()
    await page.getByRole("button", { name: "Save how you staff events" }).click()
    await expect(page.locator("form[data-card='staff'] .bp-save")).toHaveText("Saved")

    await page.locator("#q-E7").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator("#q-E8").getByRole("checkbox", { name: "School dances" }).check()
    await page.getByRole("radio", { name: "Both" }).check()
    await page.getByRole("button", { name: "Save your future events" }).click()
    await expect(page.locator("form[data-card='future'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Complete")

    await page.getByRole("link", { name: "Next: Your services and market" }).click()
    await expect(page).toHaveURL("/blueprint/services")
    await expect(page.getByText("Section 4 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Your services and market" })).toBeVisible()
    await expect(
      page.getByText("Now your services: what you offer today, how you sit in the market, and what you want to grow."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Previous: Your events" })).toHaveAttribute("href", "/blueprint/events")
    await expect(page.getByRole("link", { name: "Next: Your numbers" })).toHaveAttribute("href", "/blueprint/numbers")
    await expect(page.getByText("The next sections are coming soon.")).toHaveCount(0)

    await page.locator("#q-S1").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.locator("#q-S2").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.locator("#q-S3").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.getByRole("button", { name: "Save your services today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.getByRole("radio", { name: "Mid-market" }).check()
    await page.locator("#q-S5").getByRole("checkbox", { name: "DJ talent and personality" }).check()
    await page.locator("#q-S6").getByRole("checkbox", { name: "Finding qualified DJs" }).check()
    await page.getByRole("button", { name: "Save your place in the market" }).click()
    await expect(page.locator("form[data-card='market'] .bp-save")).toHaveText("Saved")

    await page.locator("#q-S7").getByRole("checkbox", { name: "Photo booths" }).check()
    await page.locator("#q-S8").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.getByRole("radio", { name: "Train more DJs to deliver existing services" }).check()
    await page.getByRole("button", { name: "Save where you want to grow" }).click()
    await expect(page.locator("form[data-card='grow'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Complete")

    await page.getByRole("link", { name: "Next: Your numbers" }).click()
    await expect(page).toHaveURL("/blueprint/numbers")
    await expect(page.getByText("Section 5 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Your numbers" })).toBeVisible()
    await expect(
      page.getByText("Now your numbers: approximate is fine. These stay private to you, and Blueprint will not turn them into scores or recommendations yet."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Previous: Your services and market" })).toHaveAttribute(
      "href",
      "/blueprint/services",
    )
    await expect(page.getByRole("link", { name: "Next: How you develop DJs" })).toHaveAttribute(
      "href",
      "/blueprint/development",
    )
    await expect(page.getByText("The next sections are coming soon.")).toHaveCount(0)
    await expect(page.locator('#q-N2 input[name="n2"]')).toHaveValue("80")

    await page.locator('#q-N1 input[name="n1"]').fill("250000")
    await page.getByRole("radio", { name: "Last year’s total" }).check()
    await page.locator('#q-N3 input[name="n3"]').fill("1800")
    await page.getByRole("button", { name: "Save your business today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.getByRole("radio", { name: "Flat amount per event" }).check()
    await page.locator('#q-N5 input[name="n5"]').fill("400")
    await page.locator("#q-N6").getByRole("checkbox", { name: "None" }).check()
    await page.getByRole("button", { name: "Save what events cost you" }).click()
    await expect(page.locator("form[data-card='costs'] .bp-save")).toHaveText("Saved")

    await page.getByRole("radio", { name: "Increase revenue" }).check()
    await page.getByRole("button", { name: "Save your financial goals" }).click()
    await expect(page.locator("form[data-card='goals'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Complete")

    await page.getByRole("link", { name: "Next: How you develop DJs" }).click()
    await expect(page).toHaveURL("/blueprint/development")
    await expect(page.getByText("Section 6 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "How you develop DJs" })).toBeVisible()
    await expect(
      page.getByText(
        "Now how you develop DJs: how people join, how they learn, and what you want Blueprint to improve. This is intake only — no training plan yet.",
      ),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Previous: Your numbers" })).toHaveAttribute("href", "/blueprint/numbers")
    await expect(page.getByText("The next sections are coming soon.")).toBeVisible()
    await expect(page.getByText("This is your own time each week, not the whole team’s training time.")).toBeVisible()

    await page.getByRole("radio", { name: "A mix" }).check()
    await page.locator("#q-D2").getByRole("checkbox", { name: "Shadow experienced DJs" }).check()
    await page.locator("#q-D2").getByRole("checkbox", { name: "Assist at events" }).check()
    await page.getByRole("radio", { name: "Owner", exact: true }).check()
    await page.locator("#q-D4").getByRole("checkbox", { name: "Successfully assist at events" }).check()
    await page.locator("#q-D4").getByRole("checkbox", { name: "Trainer or owner approval" }).check()
    await page.getByRole("button", { name: "Save your training today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Needs attention")

    await page.locator("#q-D5").getByRole("checkbox", { name: "Written instructions or checklists" }).check()
    await page.getByRole("radio", { name: "Shared company equipment" }).check()
    await page.locator("#q-D7").getByRole("checkbox", { name: "Observe live events" }).check()
    await page.getByRole("button", { name: "Save your training resources" }).click()
    await expect(page.locator("form[data-card='resources'] .bp-save")).toHaveText("Saved")

    await page.locator("#q-D8").getByRole("checkbox", { name: "Finding time to train" }).check()
    await page.locator("#q-D8").getByRole("checkbox", { name: "Knowing when someone is ready" }).check()
    await page.locator("#q-D9").getByRole("checkbox", { name: "Make training more organized" }).check()
    await page.locator("#q-D9").getByRole("checkbox", { name: "Reduce owner involvement" }).check()
    await page.getByRole("radio", { name: "1–2 hours per week" }).check()
    await page.getByRole("button", { name: "Save your development goals" }).click()
    await expect(page.locator("form[data-card='goals'] .bp-save")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Complete")

    await page.getByRole("link", { name: "Back to your Blueprint" }).first().click()
    await expect(page).toHaveURL("/blueprint")
    await expect(doneText(page)).toHaveText("6 of 8 sections complete")
    await expect(row(page, "Your goals").getByText("Complete")).toBeVisible()
    await expect(row(page, "Your team today").getByText("Complete")).toBeVisible()
    await expect(row(page, "Your events").getByText("Complete")).toBeVisible()
    await expect(row(page, "Your services and market").getByText("Complete")).toBeVisible()
    await expect(row(page, "Your numbers").getByText("Complete")).toBeVisible()
    await expect(row(page, "How you develop DJs").getByText("Complete")).toBeVisible()
    await expect(page.getByText("You’ve finished the sections that are ready. More are coming soon.")).toBeVisible()
    await expect(page.locator(".bp-btn--primary")).toHaveCount(0)
    await expect(page.getByRole("link", { name: /(Start|Continue) your Blueprint/ })).toHaveCount(0)

    await page.goto("/")
    const blueprint = page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "Your Company Blueprint" }) })
    await expect(blueprint.getByText("6 of 8 sections complete")).toBeVisible()
    await expect(blueprint.getByRole("link", { name: "Review your Blueprint" })).toHaveAttribute("href", "/blueprint")
    await expect(page.locator(".bp-btn--primary")).toHaveCount(0)
    await expect(page.locator("form[data-saved-owner-goal], form[data-saved-current-dj-count], form[data-saved-desired-dj-count]")).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 2, name: "Your goals" })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "Main goal" }).getByText("Scale", { exact: true })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "DJs (not counting you)" }).getByText("6", { exact: true })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "DJs you’d like (not counting you)" }).getByText("8", { exact: true })).toBeVisible()
  })

  test("the count and the resume link follow what is saved", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint")
    const done = await doneCount(page)
    expect(done).toBeGreaterThanOrEqual(0)
    expect(done).toBeLessThanOrEqual(6)

    const start = page.getByRole("link", { name: "Start your Blueprint" })
    const cont = page.getByRole("link", { name: "Continue your Blueprint" })
    if (done === 6) {
      await expect(start).toHaveCount(0)
      await expect(cont).toHaveCount(0)
    } else {
      await expect(start.or(cont)).toHaveCount(1)
      await expect(start.or(cont)).toHaveClass(/\bbp-btn--primary\b/)
      await expect(start.or(cont)).toHaveAttribute("href", /^\/blueprint\/(goals|team|events|services|numbers|development)(#q-[A-Z0-9]+)?$/)
    }
  })

  test("other and coming-soon paths go back to the overview", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    for (const slug of ["ideal-dj", "review", "not-a-section", "Goals"]) {
      await page.goto(`/blueprint/${slug}`)
      await expect(page).toHaveURL("/blueprint")
      await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toBeVisible()
    }
  })

  test("query strings and cookies cannot switch the Blueprint on or change the company", async ({ page, context }) => {
    await signIn(page, "owner-b@blueprint.test")
    await context.addCookies([
      { name: "BLUEPRINT_GUIDED_COMPANY_IDS", value: "*", url: "http://127.0.0.1:3000" },
      { name: "guided", value: "1", url: "http://127.0.0.1:3000" },
    ])
    for (const url of [
      "/blueprint?guided=1",
      "/blueprint?BLUEPRINT_GUIDED_COMPANY_IDS=*",
      "/blueprint?companyId=00000000-0000-4000-8000-0000000000a1",
      "/blueprint/goals?company=a",
    ]) {
      const response = await page.goto(url)
      expect(response?.status()).toBe(404)
      await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toHaveCount(0)
      await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
    }
    await page.goto("/")
    await expect(page.getByText("Your Company Blueprint", { exact: true })).toHaveCount(0)
  })

  test("Company B owner (switch off) gets not found for every Blueprint path and keeps today's home", async ({ page }) => {
    await signIn(page, "owner-b@blueprint.test")
    for (const path of ["/blueprint", "/blueprint/goals", "/blueprint/team", "/blueprint/events", "/blueprint/services", "/blueprint/numbers", "/blueprint/development", "/blueprint/nope"]) {
      const response = await page.goto(path)
      expect(response?.status()).toBe(404)
      await expect(page).toHaveURL(path)
      await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toHaveCount(0)
      await expect(page.locator("form[data-saved-owner-goal]")).toHaveCount(0)
    }
    await page.goto("/")
    await expect(page.locator("form[data-saved-owner-goal]")).toHaveCount(1)
    await expect(page.getByRole("link")).toHaveCount(0)
  })

  test("Company A manager is sent home from every Blueprint path and sees today's read-only home", async ({ page }) => {
    await signIn(page, "manager-a@blueprint.test")
    for (const path of ["/blueprint", "/blueprint/goals", "/blueprint/team", "/blueprint/events", "/blueprint/services", "/blueprint/numbers", "/blueprint/development", "/blueprint/nope"]) {
      await page.goto(path)
      await expect(page).toHaveURL("/")
      await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible()
      await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toHaveCount(0)
    }
    await expect(page.getByText("Signed in as Manager")).toBeVisible()
    await expect(page.getByRole("link")).toHaveCount(0)
    await expect(page.getByText("Only the company owner can change these.")).toHaveCount(2)
    await expect(page.locator("form")).toHaveCount(1) // the Sign out form only
  })
})
