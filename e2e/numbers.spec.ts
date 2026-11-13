import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { COMPANY_A_ID, ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD, resetGuidedCompanyData } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })
const password = "blueprint-local-password"

async function signIn(page: Page, email: string, pwd = password) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(pwd)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")

test.describe("Your numbers", () => {
  test("estimates revenue, confirms shared volume, and saves costs without scoring", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)

    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e2", "80")

    await page.goto("/blueprint/numbers")
    await expect(page.getByRole("heading", { level: 1, name: "Your numbers" })).toBeVisible()
    await expect(
      page.getByText("Now your numbers: approximate is fine. These stay private to you, and Blueprint will not turn them into scores or recommendations yet."),
    ).toBeVisible()
    await expect(page.getByText(/financial health|health score|net profit/i)).toHaveCount(0)
    await expect(page.getByText(/connect (your )?bank|accounting integration/i)).toHaveCount(0)

    await expect(page.locator('#q-N2 input[name="n2"]')).toHaveValue("80")
    await page.locator("#q-N1").getByRole("button", { name: "I’m not sure" }).click()
    await page.getByLabel("Typical monthly sales").fill("20000")
    await page.getByRole("button", { name: "Use $240,000" }).click()
    await expect(page.locator('#q-N1 input[name="n1"]')).toHaveValue("240000")
    await expect(page.locator("#q-N1").getByText("Blueprint estimated this. Change it any time.")).toBeVisible()
    await page.getByRole("radio", { name: "Last year’s total" }).check()
    await page.locator('#q-N2 input[name="n2"]').fill("90")
    await page.locator('#q-N3 input[name="n3"]').fill("1800")
    await page.getByRole("button", { name: "Save your business today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-n1", "240000")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-n1-period", "last_year")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-n1-state", "estimated")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-n2", "90")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-n3", "1800")
    await page.screenshot({ path: `${SHOTS}/slice7_numbers_today_estimated.png`, fullPage: true })

    await page.goto("/blueprint/events")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e2", "90")

    await page.goto("/blueprint/numbers")
    await page.getByRole("radio", { name: "Flat amount per event" }).check()
    await page.locator('#q-N5 input[name="n5"]').fill("400")
    await page.locator("#q-N6").getByRole("checkbox", { name: "Travel" }).check()
    await page.locator("#q-N6").getByRole("checkbox", { name: "Supplies" }).check()
    await page.locator('#q-N7 input[name="n7"]').fill("150")
    await page.getByRole("button", { name: "Save what events cost you" }).click()
    await expect(page.locator("form[data-card='costs'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='costs']")).toHaveAttribute("data-saved-n4", "flat")
    await expect(page.locator("form[data-card='costs']")).toHaveAttribute("data-saved-n5", "400")
    await expect(page.locator("form[data-card='costs']")).toHaveAttribute("data-saved-n5-unit", "usd")
    await expect(page.locator("form[data-card='costs']")).toHaveAttribute("data-saved-n6", "travel,supplies")
    await expect(page.locator("form[data-card='costs']")).toHaveAttribute("data-saved-n7", "150")

    await page.getByRole("radio", { name: "Increase revenue" }).check()
    await page.locator('#q-N9 input[name="n9"]').fill("400000")
    await page.getByRole("button", { name: "Save your financial goals" }).click()
    await expect(page.locator("form[data-card='goals'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='goals']")).toHaveAttribute("data-saved-n8", "increase_revenue")
    await expect(page.locator("form[data-card='goals']")).toHaveAttribute("data-saved-n9", "400000")
    await expect(sectionStatus(page)).toHaveText("Complete")
  })

  test("skips a later question and resumes to it from Needs attention", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/numbers")
    await page.locator('#q-N1 input[name="n1"]').fill("250000")
    await page.getByRole("radio", { name: "Last year’s total" }).check()
    await page.getByRole("button", { name: "Save your business today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await page.locator("#q-N4").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-N4").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-N4").getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.locator("ol li").filter({ hasText: "Your numbers" }).getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/numbers#q-N4",
    )
    await page.locator("ol li").filter({ hasText: "Your numbers" }).getByRole("link", { name: "1 skipped" }).click()
    await expect(page).toHaveURL(/\/blueprint\/numbers#q-N4/)
    await expect(page.locator("#q-N4").getByText("You skipped this for now.")).toBeVisible()
  })

  test("does not skip shared volume once E2 is already answered", async ({ page }) => {
    resetGuidedCompanyData(COMPANY_A_ID)
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e2", "80")
    await page.goto("/blueprint/numbers")
    await expect(page.locator('#q-N2 input[name="n2"]')).toHaveValue("80")
    await page.locator("#q-N2").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.locator("#q-N2").getByRole("button", { name: "Skip for now. You can answer it later." })).toHaveCount(0)
  })
})
