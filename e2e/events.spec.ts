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

test.describe("Your events", () => {
  test("saves a custom type, estimates volume, skips a later question, and resumes to edit", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/events")
    await expect(page.getByRole("heading", { level: 1, name: "Your events" })).toBeVisible()

    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator("#q-E1").getByRole("checkbox", { name: "Other" }).check()
    await page.locator("#q-E1").getByLabel("Other event type").fill("Bar mitzvahs")
    await expect(page.locator("#q-E3").getByRole("checkbox", { name: "Bar mitzvahs" })).toBeVisible()
    await page.locator("#q-E2").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with: About how many events/ })).toBeVisible()
    await page.getByLabel("Events in a typical month").fill("8")
    await page.getByRole("button", { name: "Use 96" }).click()
    await expect(page.locator('#q-E2 input[name="e2"]')).toHaveValue("96")
    await expect(page.getByText("Blueprint estimated this. Change it any time.")).toBeVisible()
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1", "wedding,other")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1-other", "Bar mitzvahs")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e2", "96")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e2-state", "estimated")
    await expect(sectionStatus(page)).toHaveText("Needs attention")
    await page.screenshot({ path: `${SHOTS}/slice5_events_today_estimated.png`, fullPage: true })

    await expect(page.locator("#q-E4").getByRole("checkbox", { name: "Bar mitzvahs" })).toBeVisible()
    await expect(page.locator("#q-E5").getByRole("checkbox", { name: "Bar mitzvahs" })).toBeVisible()
    await expect(page.locator("#q-E7").getByRole("checkbox", { name: "Bar mitzvahs" })).toBeVisible()
    await expect(page.locator("#q-E4").getByRole("checkbox", { name: "Other" })).toHaveCount(0)
    await expect(page.locator("#q-E8").getByRole("checkbox", { name: "Other" })).toBeVisible()
    await page.locator("#q-E4").getByRole("checkbox", { name: "Bar mitzvahs" }).check()
    await page.locator("#q-E6").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-E6").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-E6").getByText("You skipped this for now.")).toBeVisible()
    await page.locator("#q-E4").getByRole("checkbox", { name: "Weddings" }).check()
    await page.getByRole("button", { name: "Save how you staff events" }).click()
    await expect(page.locator("form[data-card='staff'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='staff']")).toHaveAttribute("data-saved-e4", "wedding,other")
    await expect(page.locator("form[data-card='staff']")).toHaveAttribute("data-saved-e4-other", "Bar mitzvahs")
    await expect(sectionStatus(page)).toHaveText("Needs attention")

    await page.goto("/blueprint")
    await expect(page.getByText(/0 of 8 sections complete · \d started/)).toBeVisible()
    await expect(page.locator("ol li").filter({ hasText: "Your events" }).getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/events#q-E6",
    )
    await page.getByRole("link", { name: "Continue your Blueprint" }).click()
    await expect(page).toHaveURL(/\/blueprint\/events#q-E/)
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1", "wedding,other")
    await expect(page.locator('#q-E2 input[name="e2"]')).toHaveValue("96")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Corporate events" }).check()
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1", "wedding,corporate,other")
    await expect(page.getByLabel("Other event type").first()).toHaveValue("Bar mitzvahs")
  })

  test("rejects an impossible annual volume and keeps earlier answers", async ({ page }) => {
    resetGuidedCompanyData(COMPANY_A_ID)
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1", "wedding")

    await page.locator('#q-E2 input[name="e2"]').fill("10000")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.getByText("Enter a whole number from 0 to 9,999.")).toBeVisible()
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-e1", "wedding")
  })

  test("keyboard can open help, skip, and tab to the next section", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/events")
    const help = page.locator("#q-E1").getByRole("button", { name: "I’m not sure" })
    await help.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("region", { name: /Help with: What kinds of events/ })).toBeVisible()
    await page.locator("#q-E1").getByRole("button", { name: "Skip for now. You can answer it later." }).focus()
    await page.keyboard.press("Enter")
    await expect(page.locator("#q-E1").getByText("You skipped this for now.")).toBeVisible()
    await expect(sectionStatus(page)).toHaveText("Needs attention")
  })
})
