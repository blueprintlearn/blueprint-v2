import { expect, test, type Page } from "@playwright/test"

const password = "blueprint-local-password"
const uniqueOtherGoal = "Synthetic A-only goal"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

test.describe("owner goal in the browser", () => {
  test("Company A owner can save a goal that Company B cannot see", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByText("Owner goal:")).toBeVisible()
    await page.getByLabel("Owner goal").selectOption("other")
    await page.getByLabel("Other goal").fill(uniqueOtherGoal)
    await page.getByRole("button", { name: "Save owner goal" }).click()
    await expect(page.locator("p").filter({ hasText: "Owner goal:" })).toContainText(uniqueOtherGoal)
    await expect(page.getByText("Company B")).toHaveCount(0)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)
    await expect(page.getByText("Owner goal:")).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByText("Owner goal:")).toBeVisible()
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)
    await expect(page.getByText("Company A")).toHaveCount(0)
  })
})
