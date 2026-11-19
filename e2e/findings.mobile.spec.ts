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

test.describe("Business findings on a phone", () => {
  test("fits the screen before and after approval", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/findings")
    await expect(page.getByRole("heading", { level: 1, name: "Business findings" })).toBeVisible()
    const overflowBefore = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflowBefore).toBeLessThanOrEqual(0)
    const review = page.getByRole("link", { name: "Review your Blueprint" })
    await review.scrollIntoViewIfNeeded()
    expect(await hitTargetHeight(review)).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `${SHOTS}/stage21_findings_mobile_needs_approval.png`, fullPage: true })

    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await page.goto("/blueprint/review")
    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")

    await page.goto("/blueprint/findings")
    await expect(page.locator("[data-findings-gate]")).toHaveAttribute("data-findings-gate", "current")
    await expect(page.locator("[data-findings-key='E2'] .bp-fact__value")).toHaveText("80")
    const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflowAfter).toBeLessThanOrEqual(0)
    const back = page.getByRole("link", { name: "Back to your Blueprint" }).first()
    await back.scrollIntoViewIfNeeded()
    expect(await hitTargetHeight(back)).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `${SHOTS}/stage21_findings_mobile_current.png`, fullPage: true })
  })
})
