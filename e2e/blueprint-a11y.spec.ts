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
    await expect(page.getByRole("list")).toBeVisible()
    await expect(page.getByRole("listitem")).toHaveCount(3)
    const open = await new AxeBuilder({ page }).analyze()
    expect(open.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])

    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now. When you’re ready, choose your goals above and press Save goals.")).toBeVisible()
    const skipped = await new AxeBuilder({ page }).analyze()
    expect(skipped.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])
  })

  test("overview with a skipped count has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/goals")
    await page.getByRole("button", { name: "I’m not sure" }).click()
    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now. When you’re ready, choose your goals above and press Save goals.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.getByText("1 skipped")).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])
  })

  test("Your events with the estimate helper open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/events")
    await page.locator("#q-E2").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: About how many events/ })).toBeVisible()
    await expect(page.getByLabel("Events in a typical month")).toBeVisible()
    const open = await new AxeBuilder({ page }).analyze()
    expect(open.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])

    await page.locator("#q-E2").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-E2").getByText("You skipped this for now.")).toBeVisible()
    const skipped = await new AxeBuilder({ page }).analyze()
    expect(skipped.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])
  })

  test("Your services with a market skip panel open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/services")
    await page.locator("#q-S4").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: How would you describe/ })).toBeVisible()
    const open = await new AxeBuilder({ page }).analyze()
    expect(open.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])

    await page.locator("#q-S4").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-S4").getByText("You skipped this for now.")).toBeVisible()
    const skipped = await new AxeBuilder({ page }).analyze()
    expect(skipped.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([])
  })
})
