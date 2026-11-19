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

test.describe("Business findings", () => {
  test("shows approved answers, never invents gaps, and withholds stale findings", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/findings")
    await expect(page.getByRole("heading", { level: 1, name: "Business findings" })).toBeVisible()
    await expect(page.locator("[data-findings-gate]")).toHaveAttribute("data-findings-gate", "needs_approval")
    await expect(page.getByRole("heading", { level: 2, name: "Approve your Blueprint first" })).toBeVisible()
    await expect(
      page.getByText("Findings come from the version you approve, not from guesses."),
    ).toBeVisible()
    await expect(page.locator("[data-findings-key]")).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Review your Blueprint" })).toHaveAttribute("href", "/blueprint/review")
    await page.screenshot({ path: `${SHOTS}/stage21_findings_needs_approval.png`, fullPage: true })

    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/review")
    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")
    await expect(page.getByRole("link", { name: "Next: Business findings" })).toHaveAttribute(
      "href",
      "/blueprint/findings",
    )

    await page.goto("/blueprint/findings")
    await expect(page.locator("[data-findings-gate]")).toHaveAttribute("data-findings-gate", "current")
    await expect(page.locator("[data-findings-key='E2']")).toHaveAttribute("data-findings-kind", "confirmed")
    await expect(page.locator("[data-findings-key='E2'] .bp-fact__value")).toHaveText("80")
    await expect(page.locator("[data-findings-key='E1'] .bp-fact__value")).toHaveText("Weddings")
    await expect(page.locator("[data-findings-key='G1'] .bp-fact__value")).toHaveText("Not answered yet")
    await expect(page.getByRole("heading", { level: 2, name: "Current team" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Desired growth" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Event demand" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Pricing" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Training resources" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Needs clarification" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Not collected yet" })).toBeVisible()
    await expect(page.getByText("Named competitors")).toBeVisible()
    await expect(page.getByText(/Scale|we recommend|you need \d+ DJs|training plan/)).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Goals" })).toHaveAttribute("href", "/blueprint/goals#q-G1")
    await page.locator("[data-findings-key='E2']").scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${SHOTS}/stage21_findings_current_demand.png` })
    await page.screenshot({ path: `${SHOTS}/stage21_findings_current.png`, fullPage: true })

    await page.goto("/")
    await expect(page.getByRole("link", { name: "See business findings" })).toHaveAttribute(
      "href",
      "/blueprint/findings",
    )

    await page.goto("/blueprint/events")
    await page.locator('#q-E2 input[name="e2"]').fill("90")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/findings")
    await expect(page.locator("[data-findings-gate]")).toHaveAttribute("data-findings-gate", "stale")
    await expect(page.locator("[data-findings-key]")).toHaveCount(0)
    await expect(
      page.getByText("You changed an earlier answer, so this is no longer the approved version."),
    ).toBeVisible()
    await expect(page.getByText("Blueprint will not show the old summary as if it were still current.")).toBeVisible()
    await expect(page.getByText("80")).toHaveCount(0)
    await expect(page.getByText("90")).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage21_findings_stale.png`, fullPage: true })

    await page.goto("/")
    await expect(page.getByRole("link", { name: "See business findings" })).toHaveCount(0)

    await page.goto("/blueprint/review")
    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")

    await page.goto("/blueprint/findings")
    await expect(page.locator("[data-findings-gate]")).toHaveAttribute("data-findings-gate", "current")
    await expect(page.locator("[data-findings-key='E2'] .bp-fact__value")).toHaveText("90")
    await expect(page.locator("[data-findings-key='E2'] .bp-fact__value")).not.toHaveText("80")
  })

  test("Company B cannot open another company’s findings", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/findings")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Business findings" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
    await expect(page.getByText(/\bCompany C\b/)).toHaveCount(0)
  })
})
