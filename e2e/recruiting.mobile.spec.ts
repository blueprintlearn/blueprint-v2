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

test.describe("Recruiting page on a phone", () => {
  test("fits the owner editor and a published join page", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruit")
    const need = page.locator('form[data-recruit-form="need"]')
    await need.getByRole("radio", { name: "Growth: we need additional DJs" }).check()
    await need.locator("#hiringTarget").fill("2")
    await need.getByRole("button", { name: "Save hiring need" }).click()
    const approve = page.locator('form[data-recruit-form="approve"]')
    await approve.getByRole("checkbox", { name: "I have reviewed this strategy and want to approve it" }).check()
    await approve.getByRole("button", { name: "Approve recruiting strategy" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "approved")

    await page.goto("/blueprint/recruiting")
    await expect(page.getByRole("heading", { level: 1, name: "Job ads and recruiting page" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    const save = page.getByRole("button", { name: "Save draft" })
    await save.scrollIntoViewIfNeeded()
    expect(await hitTargetHeight(save)).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `${SHOTS}/stage32_recruiting_editor_mobile.png`, fullPage: true })

    const editor = page.locator('form[data-recruiting-form="editor"]')
    await editor.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
    await editor.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await expect(page.getByText("Applications are not open yet")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage32_public_join_mobile.png`, fullPage: true })
  })
})
