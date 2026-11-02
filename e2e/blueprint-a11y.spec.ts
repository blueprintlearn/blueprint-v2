import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

async function signIn(page: Page) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(OWNER_C_EMAIL)
  await page.getByLabel("Password").fill(OWNER_C_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

test.describe("guided Blueprint accessibility", () => {
  test.beforeAll(() => {
    ensureEmptyGuidedCompany()
  })

  test("section 1 with the panel open and G1 skipped has no serious or critical axe issues", async ({ page }) => {
    await signIn(page)
    await page.goto("/blueprint/goals")
    await page.getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with:/ })).toBeVisible()
    const open = await new AxeBuilder({ page }).analyze()
    expect(open.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])

    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now.")).toBeVisible()
    const skipped = await new AxeBuilder({ page }).analyze()
    expect(skipped.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])
  })

  test("overview with a skipped count has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/goals")
    await page.getByRole("button", { name: "I’m not sure" }).click()
    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.getByText("1 skipped")).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])
  })
})
