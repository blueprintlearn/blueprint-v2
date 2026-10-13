import { expect, test, type Page } from "@playwright/test"

const password = "blueprint-local-password"
const uniqueDjCount = "247"
const nextDjCount = "19"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

test.describe("team today in the browser", () => {
  test("Company A owner can save a DJ count that Company B cannot see", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByText("DJs today:")).toBeVisible()
    await page.getByLabel("Current DJ count").fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save DJ count" }).click()
    const teamTodayForm = page.locator("form").filter({ has: page.getByLabel("Current DJ count") })
    await expect(page.locator("p").filter({ hasText: "DJs today:" })).toContainText(uniqueDjCount)
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(page.getByLabel("Current DJ count")).toHaveValue(uniqueDjCount)
    await expect(page.getByText("Company B")).toHaveCount(0)

    await page.getByLabel("Current DJ count").fill(nextDjCount)
    await expect(page.getByLabel("Current DJ count")).toHaveValue(nextDjCount)
    await page.getByRole("button", { name: "Save DJ count" }).click()
    await expect(page.locator("p").filter({ hasText: "DJs today:" })).toContainText(nextDjCount)
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count")).toHaveValue(nextDjCount)
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)
    await expect(page.getByText(nextDjCount)).toHaveCount(0)
    await expect(page.getByText("DJs today:")).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByText("DJs today:")).toBeVisible()
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)
    await expect(page.getByText(nextDjCount)).toHaveCount(0)
    const companyBForm = page.locator("form").filter({ has: page.getByLabel("Current DJ count") })
    await expect(companyBForm).not.toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(companyBForm).not.toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count")).not.toHaveValue(uniqueDjCount)
    await expect(page.getByLabel("Current DJ count")).not.toHaveValue(nextDjCount)
    await expect(page.getByText("Company A")).toHaveCount(0)
  })
})
