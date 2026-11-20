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

async function publishAndApply(page: Page) {
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
  await editor.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
  await editor.getByRole("button", { name: "Publish recruiting page" }).click()
  await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

  await page.goto("/join/company-c")
  await page.getByLabel("First name").fill("Jordan")
  await page.getByLabel("Last name").fill("Lee")
  await page.getByLabel("Email").fill("jordan.train@example.com")
  await page.getByLabel("Phone").fill("555-010-0211")
  await page.getByLabel("General location or service area").fill("Austin, TX")
  await page.getByLabel("Availability for events").fill("Most Saturday nights.")
  await page.getByLabel("Previous DJ or event experience").fill("I have DJed friends' parties.")
  await page.getByLabel("Why do you want to work with this company?").fill("I want to learn weddings.")
  await page.getByRole("checkbox", { name: /privacy notice/ }).check()
  await page.locator('form[data-join-apply="form"]').getByRole("button", { name: "Submit application" }).click()
  await expect(page.getByText("We received your application")).toBeVisible()
  await expect(page.getByText("Training preparation")).toHaveCount(0)
  await expect(page.getByText("Prepare for Training")).toHaveCount(0)
}

test.describe("Recruitment-to-training handoff", () => {
  test("owner prepares and approves a training handoff without enrollment", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await publishAndApply(page)

    await page.goto("/blueprint/applicants")
    await expect(page.locator("[data-applicant-column]")).toHaveCount(6)
    await page.getByRole("link", { name: "Jordan Lee" }).click()
    await expect(page.getByRole("heading", { name: "Training preparation" })).toBeVisible()
    await expect(page.locator("[data-training-preparation][data-training-readiness=not_prepared]")).toBeVisible()
    await expect(page.getByRole("button", { name: "Prepare for Training" })).toHaveCount(0)
    await expect(page.getByText("Prepare for Training is available after you record a current Hired outcome.")).toBeVisible()

    const decision = page.locator('form[data-review-form="decision"]')
    await decision.getByLabel("Owner decision").selectOption("hired")
    await decision.getByLabel("Intended role").fill("Wedding DJ")
    await decision.getByLabel("Planned start date").fill("2026-05-01")
    await decision.getByLabel("Intended W-2 or 1099 engagement").selectOption("w2")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-hiring-outcome=hired]")).toBeVisible()

    await expect(page.getByRole("button", { name: "Prepare for Training" })).toBeVisible()
    await page.getByRole("button", { name: "Prepare for Training" }).click()
    await expect(page.locator("[data-training-preparation][data-training-readiness=draft]")).toBeVisible()
    await expect(page.getByLabel("Intended training role")).toHaveValue("Wedding DJ")
    await expect(page.getByLabel("Training approach")).toHaveValue("full")
    await page.getByLabel("Intended training role").fill("Lead wedding DJ")
    await page.getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator("[data-training-readiness-review]")).toContainText("Lead wedding DJ")
    await expect(page.getByLabel("Intended training role")).toHaveValue("Lead wedding DJ")
    await expect(page.locator('[aria-labelledby="applicant-answers-title"]')).toContainText("I have DJed friends' parties.")
    await expect(page.locator("[data-training-readiness-review]")).toContainText("Full training")
    await expect(page.locator("[data-training-readiness-review]")).toContainText("advisory")
    await page.locator("#training-intended-role").evaluate((el) => el.scrollIntoView({ block: "center" }))
    await page.screenshot({ path: `${SHOTS}/stage37_training_preparation.png` })
    await page.locator("[data-training-readiness-review]").screenshot({ path: `${SHOTS}/stage37_readiness_review.png` })

    const approve = page.locator('form[data-training-form="approve"]')
    await approve.getByRole("checkbox", { name: "I have reviewed this preparation and want to approve the training handoff" }).check()
    await approve.getByRole("button", { name: "Approve training handoff" }).click()
    await expect(page.locator("[data-training-preparation][data-training-readiness=ready]")).toBeVisible()
    await expect(page.locator("[data-training-handoff-approved]")).toContainText("Lead wedding DJ")
    await expect(page.getByText("does not enroll anyone").first()).toBeVisible()
    await page.locator("[data-training-handoff-approved]").screenshot({ path: `${SHOTS}/stage37_approved_handoff.png` })

    await page.goto("/blueprint/applicants")
    const hiredCard = page.locator("[data-applicant-column=hired] [data-applicant-card]").filter({ hasText: "Jordan Lee" })
    await expect(hiredCard.locator("[data-training-readiness=ready]")).toBeVisible()
    await expect(page.locator("[data-applicant-column]")).toHaveCount(6)
    await page.locator("[data-applicant-board]").screenshot({ path: `${SHOTS}/stage37_hired_kanban.png` })

    await page.getByRole("link", { name: "Jordan Lee" }).click()
    await decision.getByLabel("Owner decision").selectOption("hold")
    await decision.getByLabel("Reason or note").fill("Need one more conversation.")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-hiring-outcome=reversed]")).toBeVisible()
    await expect(page.locator("[data-training-handoff-history]")).toContainText("Ready for training")
    await expect(page.getByRole("button", { name: "Prepare for Training" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Approve training handoff" })).toHaveCount(0)
    await expect(page.getByText("This hiring decision was reversed")).toBeVisible()
  })
})
