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

async function assertNoSeriousAxeIssues(page: Page) {
  await page.waitForLoadState("networkidle")
  await expect(page).toHaveTitle(/Blueprint/)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical")
    if (serious.length === 0) return
    const onlyMissingTitle = serious.every((item) => item.id === "document-title")
    if (!onlyMissingTitle || attempt === 2) {
      expect(serious).toEqual([])
      return
    }
    await expect(page).toHaveTitle(/Blueprint/)
  }
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
    await assertNoSeriousAxeIssues(page)

    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now. When you’re ready, choose your goals above and press Save goals.")).toBeVisible()
    await assertNoSeriousAxeIssues(page)
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
    await assertNoSeriousAxeIssues(page)
  })

  test("Your events with the estimate helper open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/events")
    await page.locator("#q-E2").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: About how many events/ })).toBeVisible()
    await expect(page.getByLabel("Events in a typical month")).toBeVisible()
    await assertNoSeriousAxeIssues(page)

    await page.locator("#q-E2").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-E2").getByText("You skipped this for now.")).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Your services with a market skip panel open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/services")
    await page.locator("#q-S4").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: How would you describe/ })).toBeVisible()
    await assertNoSeriousAxeIssues(page)

    await page.locator("#q-S4").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-S4").getByText("You skipped this for now.")).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("How you develop DJs with a skip panel open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/development")
    await page.locator("#q-D5").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: What training materials/ })).toBeVisible()
    await assertNoSeriousAxeIssues(page)

    await page.locator("#q-D5").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-D5").getByText("You skipped this for now.")).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Your ideal DJ with a skip panel open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/ideal-dj")
    await page.locator("#q-I5").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: What experience should applicants/ })).toBeVisible()
    await assertNoSeriousAxeIssues(page)

    await page.locator("#q-I5").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-I5").getByText("You skipped this for now.")).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Your Blueprint with a skip panel open has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/review")
    await page.locator("#q-R1").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: Approve this snapshot/ })).toBeVisible()
    await assertNoSeriousAxeIssues(page)

    await page.locator("#q-R1").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-R1").getByText("You skipped this for now.")).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Business findings before approval has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/findings")
    await expect(page.getByRole("heading", { level: 1, name: "Business findings" })).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Growth planning before approval has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/growth")
    await expect(page.getByRole("heading", { level: 1, name: "Growth planning" })).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Growth plan before approval has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/growth-plan")
    await expect(page.getByRole("heading", { level: 1, name: "Growth plan" })).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Recruiting before a hiring need is saved has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruit")
    await expect(page.getByRole("heading", { level: 1, name: "Recruiting" })).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })

  test("Staffing and demand before approval has no serious or critical axe issues", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/staffing")
    await expect(page.getByRole("heading", { level: 1, name: "Staffing & demand" })).toBeVisible()
    await assertNoSeriousAxeIssues(page)
  })
})
