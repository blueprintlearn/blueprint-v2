import { expect, test, type Page } from "@playwright/test"

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
  ["Your team today", "How many DJs you have, and how many you’d like"],
  ["Your events", "How many events you book, who works them, and your busiest dates"],
  ["Your services and market", "What your DJs handle at events, and where your prices sit"],
  ["Your numbers", "What each event really earns, private to you"],
  ["How you develop DJs", "How you hire and train today, and what to keep"],
  ["Your ideal DJ", "Your core values and the skills you hire for"],
  ["Your Blueprint", "Blueprint’s recommendations, for you to approve or change"],
] as const

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")
const doneText = (page: Page) => page.getByText(/^\d of 8 sections done$/)
const row = (page: Page, name: string) =>
  page.locator("ol li").filter({ has: page.getByText(name, { exact: true }) })

async function doneCount(page: Page) {
  const line = (await doneText(page).textContent()) ?? ""
  return Number(line.match(/^(\d)/)?.[1])
}

test.describe("guided Blueprint (switch on for Company A, off for Company B)", () => {
  test("signed-out visitors go home, whatever the path", async ({ page }) => {
    for (const path of ["/blueprint", "/blueprint/goals", "/blueprint/team", "/blueprint/events", "/blueprint/nope"]) {
      await page.goto(path)
      await expect(page).toHaveURL("/")
      await expect(page.getByRole("heading", { name: "Blueprint" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
    }
  })

  test("Company A owner walks the guided Blueprint and every save shows up without a manual reload", async ({ page }) => {
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
    await expect(page.locator("ol li a")).toHaveCount(2)
    await expect(row(page, "Your goals").getByRole("link")).toHaveAttribute("href", "/blueprint/goals")
    await expect(row(page, "Your team today").getByRole("link")).toHaveAttribute("href", "/blueprint/team")
    for (const name of ["Your events", "Your services and market", "Your numbers", "How you develop DJs", "Your ideal DJ", "Your Blueprint"]) {
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
    await expect(sectionStatus(page)).toHaveText("Done")

    // Team: current first, then desired
    await page.getByRole("link", { name: "Next: Your team today" }).click()
    await expect(page).toHaveURL("/blueprint/team")
    await expect(page.getByText("Section 2 of 8")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Your team today" })).toBeVisible()
    await expect(page.getByText("Now your team: how many DJs you have, and how many you’d like.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Previous: Your goals" })).toHaveAttribute("href", "/blueprint/goals")
    await expect(page.getByRole("link", { name: "Back to your Blueprint" })).toHaveCount(2)
    await expect(page.getByText("The next sections are coming soon.")).toBeVisible()
    await expect(page.locator("form[data-saved-current-dj-count]")).toHaveCount(1)
    await expect(page.locator("form[data-saved-desired-dj-count]")).toHaveCount(1)
    await expect(page.locator(".bp-btn--primary")).toHaveCount(0)

    await page.getByLabel("Current DJ count", { exact: true }).fill("6")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(page.locator("form[data-saved-current-dj-count]").getByRole("status")).toHaveText("Saved")
    const desiredSaved = await page.locator("form[data-saved-desired-dj-count]").getAttribute("data-saved-desired-dj-count")
    await expect(sectionStatus(page)).toHaveText(desiredSaved === "" ? "In progress" : "Done")

    await page.getByLabel("Desired DJ count").fill("8")
    await page.getByRole("button", { name: "Save desired DJ count", exact: true }).click()
    await expect(page.locator("form[data-saved-desired-dj-count]").getByRole("status")).toHaveText("Saved")
    await expect(sectionStatus(page)).toHaveText("Done")

    // Overview: both live sections done, so no primary action and a soft way back
    await page.getByRole("link", { name: "Back to your Blueprint" }).first().click()
    await expect(page).toHaveURL("/blueprint")
    await expect(doneText(page)).toHaveText("2 of 8 sections done")
    await expect(row(page, "Your goals").getByText("Done")).toBeVisible()
    await expect(row(page, "Your team today").getByText("Done")).toBeVisible()
    await expect(page.getByText("You’ve finished the sections that are ready. More are coming soon.")).toBeVisible()
    await expect(page.locator(".bp-btn--primary")).toHaveCount(0)
    await expect(page.getByRole("link", { name: /(Start|Continue) your Blueprint/ })).toHaveCount(0)

    // Owner home: the same saved facts, no forms, one soft way back in
    await page.goto("/")
    const blueprint = page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "Your Company Blueprint" }) })
    await expect(blueprint.getByText("2 of 8 sections done")).toBeVisible()
    await expect(blueprint.getByRole("link", { name: "Review your Blueprint" })).toHaveAttribute("href", "/blueprint")
    await expect(page.locator(".bp-btn--primary")).toHaveCount(0)
    await expect(page.locator("form[data-saved-owner-goal], form[data-saved-current-dj-count], form[data-saved-desired-dj-count]")).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 2, name: "Your goals" })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "Main goal" }).getByText("Scale", { exact: true })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "Current DJ count" }).getByText("6", { exact: true })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "Desired DJ count" }).getByText("8", { exact: true })).toBeVisible()
  })

  test("the count and the resume link follow what is saved", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint")
    const done = await doneCount(page)
    expect(done).toBeGreaterThanOrEqual(0)
    expect(done).toBeLessThanOrEqual(2)

    const start = page.getByRole("link", { name: "Start your Blueprint" })
    const cont = page.getByRole("link", { name: "Continue your Blueprint" })
    if (done === 2) {
      await expect(start).toHaveCount(0)
      await expect(cont).toHaveCount(0)
    } else {
      await expect(start.or(cont)).toHaveCount(1)
      await expect(start.or(cont)).toHaveClass(/\bbp-btn--primary\b/)
      await expect(start.or(cont)).toHaveAttribute("href", /^\/blueprint\/(goals|team)$/)
    }
  })

  test("other and coming-soon paths go back to the overview", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    for (const slug of ["events", "services", "numbers", "development", "ideal-dj", "review", "not-a-section", "Goals"]) {
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
    for (const path of ["/blueprint", "/blueprint/goals", "/blueprint/team", "/blueprint/events", "/blueprint/nope"]) {
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
    for (const path of ["/blueprint", "/blueprint/goals", "/blueprint/team", "/blueprint/events", "/blueprint/nope"]) {
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
