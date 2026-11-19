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

test.describe("Staffing & demand", () => {
  test("shows approved facts, withholds stale calculations, and does not invent missing inputs", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/staffing")
    await expect(page.getByRole("heading", { level: 1, name: "Staffing & demand" })).toBeVisible()
    await expect(page.locator("[data-staffing-gate]")).toHaveAttribute("data-staffing-gate", "needs_approval")
    await expect(page.locator("[data-staffing-calc]")).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage22_staffing_needs_approval.png`, fullPage: true })

    await page.goto("/blueprint/team")
    await page.locator('#q-T1 input[name="t1"]').fill("4")
    await expect(page.locator('#q-T3 input[name="t3"]')).toBeVisible()
    await page.locator('#q-T1b input[name="t1b"]').fill("2")
    await page.getByRole("radio", { name: "Yes, regularly" }).check()
    await page.locator('#q-T3 input[name="t3"]').fill("3")
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/review")
    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")

    await page.goto("/blueprint/staffing")
    await expect(page.locator("[data-staffing-gate]")).toHaveAttribute("data-staffing-gate", "current")
    await expect(page.locator("[data-staffing-calc='team-djs'] .bp-fact__value")).toHaveText("4")
    await expect(page.locator("[data-staffing-calc='leads'] .bp-fact__value")).toHaveText("3")
    await expect(page.locator("[data-staffing-calc='assistants'] .bp-fact__value")).toHaveText("2")
    await expect(page.locator("[data-staffing-calc='independent-leads'] .bp-fact__value")).toHaveText("3")
    await expect(page.locator("[data-staffing-calc='volume'] .bp-fact__value")).toHaveText("80")
    await expect(page.locator("[data-staffing-calc='owner'] .bp-fact__value")).toHaveText("Yes, regularly")
    await expect(page.locator("[data-staffing-calc='capacity']")).toHaveAttribute("data-staffing-status", "unavailable")
    await expect(page.locator("[data-staffing-calc='capacity'] .bp-fact__value")).toHaveText("Not available yet")
    await expect(page.locator("[data-staffing-calc='additional-bookings']")).toHaveAttribute(
      "data-staffing-status",
      "unavailable",
    )
    await expect(page.locator("[data-staffing-calc='leads-annual']")).toHaveAttribute("data-staffing-status", "unavailable")
    await expect(page.getByText(/not a confirmed forecast/).first()).toBeVisible()
    await expect(page.getByText(/historical planning proxy/).first()).toBeVisible()
    await expect(page.getByText("Closing rate", { exact: true })).toBeVisible()
    await expect(page.getByText(/we recommend|hire \d+ DJs/)).toHaveCount(0)
    await expect(
      page.getByText("Expected annual bookings without expansion is the current yearly event volume"),
    ).toHaveCount(0)
    await page.locator("[data-staffing-calc='independent-leads']").scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${SHOTS}/stage22_staffing_current.png` })
    await page.screenshot({ path: `${SHOTS}/stage22_staffing_current_full.png`, fullPage: true })

    await page.goto("/blueprint/findings")
    await expect(page.getByRole("link", { name: "Next: Staffing and demand" })).toHaveAttribute(
      "href",
      "/blueprint/staffing",
    )

    await page.goto("/blueprint/events")
    await page.locator('#q-E2 input[name="e2"]').fill("90")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/staffing")
    await expect(page.locator("[data-staffing-gate]")).toHaveAttribute("data-staffing-gate", "stale")
    await expect(page.locator("[data-staffing-calc]")).toHaveCount(0)
    await expect(page.getByText("80")).toHaveCount(0)
    await expect(page.getByText("90")).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage22_staffing_stale.png`, fullPage: true })
  })

  test("Company B cannot open another company’s staffing analysis", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/staffing")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Staffing & demand" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })
})
