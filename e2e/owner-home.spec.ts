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
    await expect(page.locator("main").getByText("Company A", { exact: true })).toBeVisible()
    await expect(page.getByText("Signed in as Owner")).toBeVisible()
    await expect(page.getByText("owner_admin")).toHaveCount(0)
    await expect(page.locator(".bp-chip")).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0)
    await expect(page.getByRole("link")).toHaveCount(0)

    await expect(page.locator("header.bp-nav.bp-nav--no-tabs")).toBeVisible()
    await expect(page.getByRole("navigation")).toHaveCount(0)

    const teamToday = card(page, "Team today")
    await expect(teamToday.locator(".bp-fact")).toHaveCount(0)
    await expect(teamToday.getByLabel("Current DJ count", { exact: true })).toBeVisible()
    await expect(teamToday.getByLabel("Desired DJ count")).toBeVisible()
    await expect(teamToday.locator("form[data-saved-current-dj-count]")).toHaveCount(1)
    await expect(teamToday.locator("form[data-saved-desired-dj-count]")).toHaveCount(1)
    for (const name of ["Save DJ count", "Save desired DJ count"]) {
      const button = teamToday.getByRole("button", { name, exact: true })
      await expect(button).toHaveClass(/\bbp-btn\b/)
      await expect(button).toHaveClass(/\bbp-btn--soft\b/)
      await expect(button).toHaveClass(/\bbp-btn--sm\b/)
    }

    const ownerGoal = card(page, "Your goal")
    await expect(ownerGoal.locator(".bp-fact")).toHaveCount(0)
    await expect(ownerGoal.getByLabel("Owner goal")).toBeVisible()
    await expect(ownerGoal.locator("form[data-saved-owner-goal]")).toHaveCount(1)
    const saveGoal = ownerGoal.getByRole("button", { name: "Save owner goal", exact: true })
    await expect(saveGoal).toHaveClass(/\bbp-btn\b/)
    await expect(saveGoal).toHaveClass(/\bbp-btn--primary\b/)
    await expect(page.locator(".bp-btn--primary")).toHaveCount(1)

    await expect(page.getByText("Only the company owner can change these.")).toHaveCount(0)
    const signOut = page.locator("header.bp-nav").getByRole("button", { name: "Sign out" })
    await expect(signOut).toBeVisible()
    await expect(signOut).toHaveClass(/\bbp-btn--plain\b/)
  })

  test("Other goal shows only while Other is selected", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    const ownerGoal = card(page, "Your goal")
    const savedGoal = await ownerGoal.locator("form[data-saved-owner-goal]").getAttribute("data-saved-owner-goal")

    if (savedGoal !== "other") await expect(page.getByLabel("Other goal")).toHaveCount(0)
    await page.getByLabel("Owner goal").selectOption("other")
    await expect(page.getByLabel("Other goal")).toBeVisible()
    await page.getByLabel("Owner goal").selectOption("scale")
    await expect(page.getByLabel("Other goal")).toHaveCount(0)
    await expect(ownerGoal.locator("form[data-saved-owner-goal]")).toHaveAttribute("data-saved-owner-goal", savedGoal ?? "")
  })

  test("Company A manager sees the facts but no editing controls", async ({ page }) => {
    await signIn(page, "manager-a@blueprint.test")

    await expect(page.locator("main").getByText("Company A", { exact: true })).toBeVisible()
    await expect(page.getByText("Signed in as Manager")).toBeVisible()
    await expect(page.getByText("manager", { exact: true })).toHaveCount(0)
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    await expect(page.getByText("Here’s what your company has shared so far.")).toBeVisible()

    const teamToday = card(page, "Team today")
    await expect(teamToday.locator(".bp-fact")).toHaveCount(2)
    await expect(teamToday.locator(".bp-fact").filter({ hasText: "Current DJ count" })).toHaveCount(1)
    await expect(teamToday.locator(".bp-fact").filter({ hasText: "Desired DJ count" })).toHaveCount(1)
    await expect(teamToday.getByText("Only the company owner can change these.")).toBeVisible()
    const companyGoal = card(page, "Company goal")
    await expect(companyGoal.locator(".bp-fact").filter({ hasText: "Goal" })).toHaveCount(1)
    await expect(companyGoal.getByText("Only the company owner can change these.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Your goal" })).toHaveCount(0)

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
    await expect(page.getByRole("heading", { name: "Team today" })).toHaveCount(0)
  })
})
