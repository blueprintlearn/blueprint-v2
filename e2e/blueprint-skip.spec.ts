import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

async function signIn(page: Page, email: string, password = OWNER_C_PASSWORD) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const row = (page: Page, name: string) =>
  page.locator("ol li").filter({ has: page.getByText(name, { exact: true }) })

test.describe("skip workflow on an empty local company", () => {
  test.beforeAll(() => {
    ensureEmptyGuidedCompany()
  })

  test("owner C can skip G1, move on, resume past the skip, then complete later", async ({ page }) => {
    await signIn(page, OWNER_C_EMAIL)
    await page.goto("/blueprint/goals")

    await page.getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: "Help with: What do you want Blueprint to help you do?" })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/slice3_g1_not_sure_panel.png`, fullPage: true })
    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now. Your goals shape every recommendation")).toBeVisible()
    await expect(page.locator("div:has(> h1) > .bp-status")).toHaveText("Needs attention")
    await page.screenshot({ path: `${SHOTS}/slice3_g1_skipped.png`, fullPage: true })

    await page.getByRole("link", { name: "Next: Your team today" }).click()
    await expect(page).toHaveURL(/\/blueprint\/team/)
    await page.getByLabel("Current DJ count", { exact: true }).fill("3")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(page.locator("form[data-saved-current-dj-count]").getByRole("status")).toHaveText("Saved")

    await page.goto("/blueprint")
    await expect(page.getByText("0 of 8 sections complete")).toBeVisible()
    await expect(row(page, "Your goals").getByText("Needs attention")).toBeVisible()
    await expect(row(page, "Your goals").getByText("1 skipped")).toBeVisible()
    await expect(row(page, "Your team today").getByText("Needs attention")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/slice3_overview_needs_attention_skipped.png`, fullPage: true })

    await page.goto("/")
    const blueprint = page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "Your Company Blueprint" }) })
    await expect(blueprint.getByRole("link", { name: "Continue your Blueprint" })).toHaveAttribute(
      "href",
      "/blueprint/team#q-TL6",
    )
    await page.screenshot({ path: `${SHOTS}/slice3_owner_home_continue.png`, fullPage: true })
    await blueprint.getByRole("link", { name: "Continue your Blueprint" }).click()
    await expect(page).toHaveURL(/\/blueprint\/team/)

    await page.getByLabel("Desired DJ count").fill("5")
    await page.getByRole("button", { name: "Save desired DJ count", exact: true }).click()
    await expect(page.locator("form[data-saved-desired-dj-count]").getByRole("status")).toHaveText("Saved")

    await page.goto("/")
    await expect(blueprint.getByRole("link", { name: "Review your Blueprint" })).toHaveAttribute("href", "/blueprint")
    await blueprint.getByRole("link", { name: "Review your Blueprint" }).click()
    await expect(page).toHaveURL("/blueprint")
    await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toBeVisible()

    await row(page, "Your goals").getByRole("link").click()
    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(page.locator("form[data-saved-company-goals] .bp-save")).toHaveText("Saved")
    await expect(page.locator("div:has(> h1) > .bp-status")).toHaveText("Complete")

    await page.locator(".bp-more-detail > summary").click()
    await page.getByRole("radio", { name: "No set date" }).check()
    await page.screenshot({ path: `${SHOTS}/slice3_g3_timeframe.png`, fullPage: true })
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect(page.locator("form[data-saved-g3] .bp-save")).toHaveText("Saved")
    await expect(page.locator("div:has(> h1) > .bp-status")).toHaveText("Complete")

    await page.goto("/blueprint")
    await expect(page.getByText("2 of 8 sections complete")).toBeVisible()
    await expect(row(page, "Your goals").getByText("Complete")).toBeVisible()
    await expect(row(page, "Your team today").getByText("Complete")).toBeVisible()
  })

  test("G2 guidance has no Skip, and keyboard opens and closes the panel", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL)
    await page.goto("/blueprint/goals")
    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("checkbox", { name: /Expand/ }).check()
    const g2Help = page.locator("#q-G2").getByRole("button", { name: "I’m not sure" })
    await g2Help.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("region", { name: "Help with: Which one matters most right now?" })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/slice3_g2_not_sure_panel.png`, fullPage: true })
    await expect(page.locator("#q-G2").getByRole("button", { name: /Skip for now/ })).toHaveCount(0)
    await page.locator("#q-G2").getByRole("button", { name: "Hide help" }).press("Enter")
    await expect(page.getByRole("region", { name: "Help with: Which one matters most right now?" })).toHaveCount(0)
  })
})
