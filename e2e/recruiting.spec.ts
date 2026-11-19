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

async function approveStrategy(page: Page) {
  await page.goto("/blueprint/recruit")
  const need = page.locator('form[data-recruit-form="need"]')
  await need.getByRole("radio", { name: "Growth: we need additional DJs" }).check()
  await need.locator("#hiringTarget").fill("2")
  await need.getByLabel("Beginner or experienced").selectOption("beginner")
  await need.getByRole("button", { name: "Save hiring need" }).click()
  const approve = page.locator('form[data-recruit-form="approve"]')
  await approve.getByRole("checkbox", { name: "I have reviewed this strategy and want to approve it" }).check()
  await approve.getByRole("button", { name: "Approve recruiting strategy" }).click()
  await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "approved")
}

test.describe("Job ads and recruiting pages", () => {
  test("sends the owner to Stage 3.1 when no approved strategy exists", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruiting")
    await expect(page.getByRole("heading", { level: 1, name: "Job ads and recruiting page" })).toBeVisible()
    await expect(page.locator("[data-recruiting-strategy]")).toHaveAttribute("data-recruiting-strategy", "missing")
    await expect(page.getByRole("link", { name: "Go to recruiting strategy" })).toHaveAttribute("href", "/blueprint/recruit")
    await page.screenshot({ path: `${SHOTS}/stage32_recruiting_needs_strategy.png`, fullPage: true })
  })

  test("lets the owner edit ads, save a draft, preview privately, then publish", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await approveStrategy(page)
    await page.goto("/blueprint/recruiting")
    await expect(page.locator("[data-recruiting-strategy]")).toHaveAttribute("data-recruiting-strategy", "current")
    const editor = page.locator('form[data-recruiting-form="editor"]')
    await expect(editor.getByLabel("Public URL")).toHaveValue("company-c")
    await expect(page.locator("[data-ad-channel=indeed]")).toBeVisible()
    await expect(page.locator("[data-ad-channel=social]")).toBeVisible()
    await expect(page.locator("[data-ad-channel=referral]")).toBeVisible()
    await expect(page.locator("[data-ad-channel=general]")).toBeVisible()
    await editor.getByLabel("Headline").fill("Company C is hiring DJs for upcoming events")
    await editor.getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "draft")
    await page.screenshot({ path: `${SHOTS}/stage32_recruiting_editor.png`, fullPage: true })

    await page.goto("/blueprint/recruiting/preview")
    await expect(page.getByText("Preview only. This draft is not public.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Company C is hiring DJs for upcoming events" })).toBeVisible()
    await expect(page.getByText("Applications are not open yet")).toBeVisible()
    await expect(page.getByRole("button", { name: /apply/i })).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage32_recruiting_preview.png`, fullPage: true })

    const draftPublic = await page.goto("/join/company-c")
    expect(draftPublic?.status()).toBe(404)

    await page.goto("/blueprint/recruiting")
    const publish = page.locator('form[data-recruiting-form="editor"]')
    await publish.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(publish.getByRole("alert")).toHaveText(
      "Confirm that you have reviewed this page before publishing it.",
    )
    await publish.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
    await publish.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 1, name: "Company C is hiring DJs for upcoming events" })).toBeVisible()
    await expect(page.getByText("Applications are not open yet")).toBeVisible()
    await expect(page.getByRole("link", { name: /apply/i })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /apply/i })).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage32_public_join_page.png`, fullPage: true })
  })

  test("keeps the live page until an explicit publish and restores it after a strategy change", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await approveStrategy(page)
    await page.goto("/blueprint/recruiting")
    const editor = page.locator('form[data-recruiting-form="editor"]')
    await editor.getByLabel("Headline").fill("Original live headline")
    await editor.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
    await editor.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

    await page.getByRole("button", { name: "Edit a new draft" }).click()
    const draft = page.locator('form[data-recruiting-form="editor"]')
    await expect(draft).toBeVisible()
    await draft.getByLabel("Headline").fill("Draft only headline")
    await draft.getByRole("button", { name: "Save draft" }).click()
    await expect(draft.getByLabel("Headline")).toHaveValue("Draft only headline")
    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 1, name: "Original live headline" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Draft only headline" })).toHaveCount(0)

    await page.goto("/blueprint/recruiting")
    const update = page.locator('form[data-recruiting-form="editor"]')
    await expect(update.getByLabel("Headline")).toHaveValue("Draft only headline")
    await update.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
    await update.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(page.locator('form[data-recruiting-form="editor"]')).toHaveCount(0)
    await expect(page.getByText("Draft only headline").first()).toBeVisible()
    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 1, name: "Draft only headline" })).toBeVisible()

    await page.goto("/blueprint/recruit")
    await page.getByRole("button", { name: "Revise this strategy" }).click()
    const need = page.locator('form[data-recruit-form="need"]')
    await need.locator("#hiringTarget").fill("4")
    await need.getByRole("button", { name: "Save hiring need" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "needs_review")

    await page.goto("/blueprint/recruiting")
    await expect(page.locator("[data-recruiting-needs-review]")).toBeVisible()
    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 1, name: "Draft only headline" })).toBeVisible()

    await page.goto("/blueprint/recruiting")
    await page.getByRole("button", { name: "Unpublish" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "unpublished")
    const gone = await page.goto("/join/company-c")
    expect(gone?.status()).toBe(404)
  })

  test("rejects an invalid public URL", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await approveStrategy(page)
    await page.goto("/blueprint/recruiting")
    const editor = page.locator('form[data-recruiting-form="editor"]')
    await editor.getByLabel("Public URL").fill("JOIN")
    await editor.getByRole("button", { name: "Save draft" }).click()
    await expect(editor.getByRole("alert")).toHaveText(
      "Use a public URL of 3–48 lowercase letters, numbers, and hyphens.",
    )
  })

  test("Company B cannot open another company’s recruiting editor", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/recruiting")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Job ads and recruiting page" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })
})
