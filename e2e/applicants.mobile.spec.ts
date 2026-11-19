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

test.describe("Applications on a phone", () => {
  test("fits the public form and the owner Kanban", async ({ page }) => {
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
    const editor = page.locator('form[data-recruiting-form="editor"]')
    await editor.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
    await editor.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 2, name: "Apply" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await page.getByLabel("First name").fill("Maya")
    await page.getByLabel("Last name").fill("Chen")
    await page.getByLabel("Email").fill("maya.mobile@example.com")
    await page.getByLabel("Phone").fill("555-010-0199")
    await page.getByLabel("General location or service area").fill("Austin, TX")
    await page.getByLabel("Availability for events").fill("Sunday afternoons.")
    await page.getByLabel("Previous DJ or event experience").fill("New to DJing.")
    await page.getByLabel("Why do you want to work with this company?").fill("I want weekend work.")
    await page.getByRole("checkbox", { name: /privacy notice/ }).check()
    const submit = page.getByRole("button", { name: "Submit application" })
    expect(await hitTargetHeight(submit)).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `${SHOTS}/stage33_application_form_mobile.png`, fullPage: true })
    await submit.click()
    await expect(page.getByText("We received your application")).toBeVisible()

    await page.goto("/blueprint/applicants")
    await expect(page.getByRole("link", { name: "Maya Chen" })).toHaveCount(1)
    await expect(page.getByLabel("Move to").first()).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage33_applicant_kanban_mobile.png`, fullPage: true })
  })
})
