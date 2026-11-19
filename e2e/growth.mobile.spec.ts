import { mkdirSync } from "node:fs"

import { expect, test, type Locator, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

async function signIn(page: Page) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(OWNER_C_EMAIL)
  await page.getByLabel("Password").fill(OWNER_C_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

async function hitTargetHeight(button: Locator) {
  return button.evaluate((el) => {
    const after = getComputedStyle(el, "::after")
    return Math.max(el.getBoundingClientRect().height, after.content === "none" ? 0 : parseFloat(after.height) || 0)
  })
}

test.describe("Growth planning on a phone", () => {
  test("fits the screen before approval", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/growth")
    await expect(page.getByRole("heading", { level: 1, name: "Growth planning" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    const review = page.getByRole("link", { name: "Review your Blueprint" })
    await review.scrollIntoViewIfNeeded()
    expect(await hitTargetHeight(review)).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `${SHOTS}/stage23a_growth_mobile_needs_approval.png`, fullPage: true })
  })
})
