import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

const THEMES = ["light", "dark"] as const
const WIDTHS = [390, 1440] as const
type ReviewState = "g1_help" | "g1_skipped" | "g2_help" | "overview" | "owner_home" | "g3_timeframe"

async function signIn(page: Page) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(OWNER_C_EMAIL)
  await page.getByLabel("Password").fill(OWNER_C_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

async function freezeMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}",
  })
}

async function applyTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
  await page.evaluate((next) => document.documentElement.setAttribute("data-theme", next), theme)
}

async function captureMatrix(page: Page, state: ReviewState) {
  await freezeMotion(page)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const theme of THEMES) {
      await applyTheme(page, theme)
      await page.screenshot({
        path: `${SHOTS}/slice3r2_${state}_${theme}_${width}.png`,
        fullPage: true,
        animations: "disabled",
      })
    }
  }
}

test.describe("Slice 3 design-review screenshot matrix", () => {
  test("captures required states in light and dark at 390 and 1440", async ({ page }) => {
    test.setTimeout(90_000)
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/goals")
    await page.getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: /Help with:/ })).toBeVisible()
    await captureMatrix(page, "g1_help")

    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.getByText("You skipped this for now. When you’re ready, choose your goals above and press Save goals.")).toBeVisible()
    await expect(page.getByRole("region", { name: /Help with:/ })).toHaveCount(0)
    await captureMatrix(page, "g1_skipped")

    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("checkbox", { name: /Expand/ }).check()
    await page.locator("#q-G2").getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: "Help with: Which one matters most right now?" })).toBeVisible()
    await captureMatrix(page, "g2_help")

    await page.getByRole("link", { name: "Next: Your team today" }).click()
    await page.getByLabel(/Not counting yourself, how many DJs work events/).fill("3")
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint")
    await expect(page.getByText("1 skipped")).toBeVisible()
    await captureMatrix(page, "overview")

    await page.goto("/")
    await expect(page.getByRole("link", { name: "Continue your Blueprint" })).toBeVisible()
    await captureMatrix(page, "owner_home")

    await page.goto("/blueprint/goals")
    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(page.locator("form[data-saved-company-goals] .bp-save")).toHaveText("Saved")
    await page.locator(".bp-more-detail > summary").click()
    const timeframe = page.getByRole("radio", { name: "No set date" })
    await timeframe.check()
    await expect(timeframe).toBeChecked()
    await captureMatrix(page, "g3_timeframe")
  })
})
