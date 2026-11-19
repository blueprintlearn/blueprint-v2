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

async function publishRecruitingPage(page: Page) {
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

  await page.goto("/blueprint/recruiting")
  const editor = page.locator('form[data-recruiting-form="editor"]')
  await editor.getByLabel("Additional application questions").fill("Can you work New Year's Eve?")
  await editor.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
  await editor.getByRole("button", { name: "Publish recruiting page" }).click()
  await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")
}

async function fillApplication(page: Page) {
  await page.getByLabel("First name").fill("Maya")
  await page.getByLabel("Last name").fill("Chen")
  await page.getByLabel("Email").fill("maya.c@example.com")
  await page.getByLabel("Phone").fill("555-010-0199")
  await page.getByLabel("General location or service area").fill("Austin, TX")
  await page.getByLabel("Availability for events").fill("Most Saturday nights.")
  await page.getByLabel("Previous DJ or event experience").fill("I have DJed friends' parties.")
  await page.getByLabel("Why do you want to work with this company?").fill("I want to learn weddings.")
  await page.getByLabel("Can you work New Year's Eve?").fill("Yes, I can.")
  await page.getByRole("checkbox", { name: /privacy notice/ }).check()
}

test.describe("Applications and applicant Kanban", () => {
  test("lets a candidate apply and the owner track them", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await publishRecruitingPage(page)

    await page.goto("/join/company-c")
    await expect(page.getByRole("heading", { level: 2, name: "Apply" })).toBeVisible()
    await fillApplication(page)
    await page.screenshot({ path: `${SHOTS}/stage33_application_form.png`, fullPage: true })
    await page.locator('form[data-join-apply="form"]').getByRole("button", { name: "Submit application" }).click()
    await expect(page.getByText("We received your application")).toBeVisible()

    await page.goto("/blueprint/applicants")
    await expect(page.getByRole("heading", { level: 1, name: "Applicants" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Maya Chen" })).toBeVisible()
    await expect(page.locator("[data-applicant-column=new_application]")).toContainText("Maya Chen")
    await page.screenshot({ path: `${SHOTS}/stage33_applicant_kanban.png`, fullPage: true })

    await page.getByRole("link", { name: "Maya Chen" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Maya Chen" })).toBeVisible()
    await expect(page.getByText("Most Saturday nights.")).toBeVisible()
    await expect(page.getByText("Can you work New Year's Eve?")).toBeVisible()
    await expect(page.getByText("Yes, I can.")).toBeVisible()
    await expect(page.getByText("Entered New Application")).toBeVisible()
    await page.locator('form[data-applicant-form="note"]').getByLabel("Private note").fill("Strong weekend availability.")
    await page.getByRole("button", { name: "Add note" }).click()
    await expect(page.getByText("Strong weekend availability.")).toBeVisible()
    const stage = page.locator('form[data-applicant-form="stage"]')
    await stage.getByLabel("Pipeline stage").selectOption("screening")
    await stage.getByRole("button", { name: "Update stage" }).click()
    await expect(page.getByText("New Application → Screening")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage33_applicant_profile.png`, fullPage: true })

    await page.goto("/blueprint/recruiting")
    await page.getByRole("button", { name: "Edit a new draft" }).click()
    const draft = page.locator('form[data-recruiting-form="editor"]')
    await expect(draft).toBeVisible()
    await draft.getByLabel("Additional application questions").fill("What is your favorite wedding song?")
    await draft.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
    await draft.getByRole("button", { name: "Publish recruiting page" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

    await page.goto("/blueprint/applicants")
    await page.getByRole("link", { name: "Maya Chen" }).click()
    await expect(page.getByText("Can you work New Year's Eve?")).toBeVisible()
    await expect(page.getByText("Yes, I can.")).toBeVisible()
    await expect(page.getByText("What is your favorite wedding song?")).toHaveCount(0)
  })

  test("unpublished pages stop accepting applications", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await publishRecruitingPage(page)
    await page.getByRole("button", { name: "Unpublish" }).click()
    await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "unpublished")
    const gone = await page.goto("/join/company-c")
    expect(gone?.status()).toBe(404)
    await expect(page.getByRole("button", { name: "Submit application" })).toHaveCount(0)
  })

  test("Company B cannot open another company’s applicants", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/applicants")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Applicants" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })
})
