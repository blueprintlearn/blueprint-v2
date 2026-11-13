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

test.describe("Your services and market", () => {
  test("saves a custom service, market perceptions, and a growth goal", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/services")
    await expect(page.getByRole("heading", { level: 1, name: "Your services and market" })).toBeVisible()
    await expect(
      page.getByText("Now your services: what you offer today, how you sit in the market, and what you want to grow."),
    ).toBeVisible()

    await page.locator("#q-S1").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.locator("#q-S1").getByRole("checkbox", { name: "Other" }).check()
    await page.locator("#q-S1").getByLabel("Other service").fill("Laser shows")
    await expect(page.locator("#q-S2").getByRole("checkbox", { name: "Laser shows" })).toBeVisible()
    await page.locator("#q-S2").getByRole("checkbox", { name: "Laser shows" }).check()
    await page.locator("#q-S3").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.getByRole("button", { name: "Save your services today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-s1", "dj_mc,other")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-s1-other", "Laser shows")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-s2", "other")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-s2-other", "Laser shows")
    await expect(sectionStatus(page)).toHaveText("Needs attention")
    await page.screenshot({ path: `${SHOTS}/slice6_services_today_named.png`, fullPage: true })

    await expect(page.locator("#q-S8").getByRole("checkbox", { name: "Laser shows" })).toBeVisible()
    await expect(page.locator("#q-S8").getByRole("checkbox", { name: "Other" })).toHaveCount(0)
    await expect(page.locator("#q-S7").getByRole("checkbox", { name: "Other" })).toBeVisible()

    await page.getByRole("radio", { name: "Mid-market" }).check()
    await page.locator("#q-S5").getByRole("checkbox", { name: "DJ talent and personality" }).check()
    await page.locator("#q-S5").getByRole("checkbox", { name: "Professionalism and reliability" }).check()
    await page.locator("#q-S5").getByRole("checkbox", { name: "Music expertise" }).check()
    await page.locator("#q-S5").getByRole("checkbox", { name: "Reputation and referrals" }).click()
    await expect(page.locator("#q-S5").getByRole("checkbox", { name: "DJ talent and personality" })).toBeChecked()
    await expect(page.locator("#q-S5").getByRole("checkbox", { name: "Professionalism and reliability" })).toBeChecked()
    await expect(page.locator("#q-S5").getByRole("checkbox", { name: "Music expertise" })).toBeChecked()
    await expect(page.locator("#q-S5").getByRole("checkbox", { name: "Reputation and referrals" })).not.toBeChecked()
    await page.locator("#q-S6").getByRole("checkbox", { name: "Finding qualified DJs" }).check()
    await page.getByRole("button", { name: "Save your place in the market" }).click()
    await expect(page.locator("form[data-card='market'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='market']")).toHaveAttribute("data-saved-s4", "mid_market")
    await expect(page.locator("form[data-card='market']")).toHaveAttribute(
      "data-saved-s5",
      "dj_talent,professionalism,music_expertise",
    )

    await page.locator("#q-S7").getByRole("checkbox", { name: "Photo booths" }).check()
    await page.locator("#q-S8").getByRole("checkbox", { name: "Laser shows" }).check()
    await page.getByRole("radio", { name: "Train more DJs to deliver existing services" }).check()
    await page.getByRole("button", { name: "Save where you want to grow" }).click()
    await expect(page.locator("form[data-card='grow'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='grow']")).toHaveAttribute("data-saved-s7", "photo_booths")
    await expect(page.locator("form[data-card='grow']")).toHaveAttribute("data-saved-s8", "other")
    await expect(page.locator("form[data-card='grow']")).toHaveAttribute("data-saved-s8-other", "Laser shows")
    await expect(page.locator("form[data-card='grow']")).toHaveAttribute("data-saved-s9", "train_djs")
    await expect(sectionStatus(page)).toHaveText("Complete")
  })

  test("skips a later question and resumes to it from Needs attention", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/services")
    await page.locator("#q-S1").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.getByRole("button", { name: "Save your services today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await page.locator("#q-S4").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-S4").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-S4").getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.locator("ol li").filter({ hasText: "Your services and market" }).getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/services#q-S4",
    )
    await page.locator("ol li").filter({ hasText: "Your services and market" }).getByRole("link", { name: "1 skipped" }).click()
    await expect(page).toHaveURL(/\/blueprint\/services#q-S4/)
    await expect(page.locator("#q-S4").getByText("You skipped this for now.")).toBeVisible()
  })

  test("rejects overlapping new services and keeps the earlier answer", async ({ page }) => {
    resetGuidedCompanyData(COMPANY_A_ID)
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/services")
    await page.locator("#q-S1").getByRole("checkbox", { name: "DJ and MC" }).check()
    await page.getByRole("button", { name: "Save your services today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-s1", "dj_mc")
    await expect(page.locator("#q-S7").getByRole("checkbox", { name: "DJ and MC" })).toHaveCount(0)
    await expect(page.locator("#q-S7").getByRole("checkbox", { name: "Photo booths" })).toBeVisible()
  })
})
