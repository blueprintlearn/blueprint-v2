import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

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

test.describe("Growth planning", () => {
  test("asks follow-ups, withholds unapproved data, and lets the owner override a recommendation", async ({
    page,
  }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/growth")
    await expect(page.getByRole("heading", { level: 1, name: "Growth planning" })).toBeVisible()
    await expect(page.locator("[data-growth-gate]")).toHaveAttribute("data-growth-gate", "needs_approval")
    await expect(page.locator("[data-growth-rec]")).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage23a_growth_needs_approval.png`, fullPage: true })

    await page.goto("/blueprint/team")
    await page.locator('#q-T1 input[name="t1"]').fill("4")
    await expect(page.locator('#q-T3 input[name="t3"]')).toBeVisible()
    await page.locator('#q-T1b input[name="t1b"]').fill("2")
    await page.getByRole("radio", { name: "Yes, regularly" }).check()
    await page.locator('#q-T3 input[name="t3"]').fill("3")
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await page.getByLabel(/DJs would you like|Earlier you said/).fill("6")
    await page.getByRole("button", { name: "Save the team you want" }).click()
    await expect(page.locator("form[data-card='wanted'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/review")
    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")

    await page.goto("/blueprint/growth")
    await expect(page.locator("[data-growth-gate]")).toHaveAttribute("data-growth-gate", "current")
    await expect(page.locator("[data-growth-rec]")).toHaveAttribute("data-growth-rec", "unavailable")
    await expect(page.getByText(/not a confirmed forecast|planning proxy/).first()).toBeVisible()

    await page.locator("#typicalLeadCapacity").fill("40.5")
    await page.getByRole("button", { name: "Save planning answers" }).click()
    await expect(page.locator('form[data-growth-form="inputs"]').getByRole("alert")).toHaveText(
      "Enter a whole number from 0 to 9,999.",
    )

    await page.locator("#typicalLeadCapacity").fill("40")
    await page.locator("#targetAnnualBookings").fill("80")
    await page.locator("#expectedBookingsWithoutExpansion").fill("80")
    await page.getByRole("radio", { name: "Yes, we can train new DJs" }).check()
    await page.getByRole("button", { name: "Save planning answers" }).click()
    await expect(page.locator("[data-growth-rec]")).toHaveAttribute("data-growth-rec", "demand")
    await expect(page.getByText(/does not change the team size or goal|not silently change/)).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage23a_growth_current.png`, fullPage: true })

    await page.getByRole("radio", { name: "Modify it" }).check()
    await page.getByLabel("Use this next step instead").selectOption("recruit")
    await page.getByRole("button", { name: "Save your decision" }).click()
    await expect(page.locator("[data-growth-owner-response]")).toHaveAttribute("data-growth-owner-response", "modified")
    await expect(page.getByText("Saved goals were not changed.")).toBeVisible()

    await page.goto("/blueprint/staffing")
    await expect(page.getByRole("link", { name: "Next: Growth planning" })).toHaveAttribute("href", "/blueprint/growth")
  })

  test("Company B cannot open another company’s growth planning", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/growth")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Growth planning" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })
})
