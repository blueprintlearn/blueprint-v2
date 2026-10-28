import { expect, test, type Page } from "@playwright/test"

const password = "blueprint-local-password"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

function card(page: Page, title: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: title }) })
}

test.describe("owner home in the browser", () => {
  test("Company A owner sees the header and both cards with their forms", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")

    await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible()
    await expect(page.locator(".bp-chip").filter({ hasText: "Role: owner_admin" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0)
    await expect(page.getByRole("link")).toHaveCount(0)

    const teamToday = card(page, "Team today")
    await expect(teamToday.getByText("DJs today:")).toBeVisible()
    await expect(teamToday.getByText("Desired DJs:")).toBeVisible()
    await expect(teamToday.getByLabel("Current DJ count", { exact: true })).toBeVisible()
    await expect(teamToday.getByLabel("Desired DJ count")).toBeVisible()
    await expect(teamToday.locator("form[data-saved-current-dj-count]")).toHaveCount(1)
    await expect(teamToday.locator("form[data-saved-desired-dj-count]")).toHaveCount(1)
    await expect(teamToday.getByRole("button", { name: "Save DJ count", exact: true })).toHaveClass(/\bbp-btn\b/)
    await expect(teamToday.getByRole("button", { name: "Save desired DJ count" })).toHaveClass(/\bbp-btn\b/)

    const ownerGoal = card(page, "Your goal")
    await expect(ownerGoal.getByText("Owner goal:")).toBeVisible()
    await expect(ownerGoal.getByLabel("Owner goal")).toBeVisible()
    await expect(ownerGoal.locator("form[data-saved-owner-goal]")).toHaveCount(1)
    await expect(ownerGoal.getByRole("button", { name: "Save owner goal", exact: true })).toHaveClass(/\bbp-btn\b/)

    await expect(page.getByText("Only the company owner can change these.")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveClass(/\bbp-btn--plain\b/)
  })

  test("Company A manager sees the facts but no editing controls", async ({ page }) => {
    await signIn(page, "manager-a@blueprint.test")

    await expect(page.locator("strong").filter({ hasText: "Company A" })).toBeVisible()
    await expect(page.locator(".bp-chip").filter({ hasText: "Role: manager" })).toBeVisible()
    await expect(page.getByText("Company B")).toHaveCount(0)

    const teamToday = card(page, "Team today")
    await expect(teamToday.getByText("DJs today:")).toBeVisible()
    await expect(teamToday.getByText("Desired DJs:")).toBeVisible()
    await expect(teamToday.getByText("Only the company owner can change these.")).toBeVisible()
    await expect(card(page, "Your goal").getByText("Owner goal:")).toBeVisible()
    await expect(card(page, "Your goal").getByText("Only the company owner can change these.")).toBeVisible()

    await expect(page.locator("form[data-saved-current-dj-count]")).toHaveCount(0)
    await expect(page.locator("form[data-saved-desired-dj-count]")).toHaveCount(0)
    await expect(page.locator("form[data-saved-owner-goal]")).toHaveCount(0)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Desired DJ count")).toHaveCount(0)
    await expect(page.getByLabel("Owner goal")).toHaveCount(0)
    await expect(page.getByLabel("Other goal")).toHaveCount(0)
    for (const name of ["Save DJ count", "Save desired DJ count", "Save owner goal"]) {
      await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0)
    }

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("DJs today:")).toHaveCount(0)
  })
})
