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
  await page.getByLabel("Email").fill("jordan.hire@example.com")
  await page.getByLabel("Phone").fill("555-010-0211")
  await page.getByLabel("General location or service area").fill("Austin, TX")
  await page.getByLabel("Availability for events").fill("Most Saturday nights.")
  await page.getByLabel("Previous DJ or event experience").fill("I have DJed friends' parties.")
  await page.getByLabel("Why do you want to work with this company?").fill("I want to learn weddings.")
  await page.getByRole("checkbox", { name: /privacy notice/ }).check()
  await page.locator('form[data-join-apply="form"]').getByRole("button", { name: "Submit application" }).click()
  await expect(page.getByText("We received your application")).toBeVisible()
  await expect(page.getByText("Hiring path and checklist")).toHaveCount(0)
  await expect(page.getByText("Candidate conversations")).toHaveCount(0)
  await expect(page.getByText("Practical audition")).toHaveCount(0)
}

test.describe("Conversations, auditions, and hiring workflow", () => {
  test("owner follows a hiring path without auto-hiring or training enrollment", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await publishAndApply(page)

    await page.goto("/blueprint/applicants")
    const card = page.locator("[data-applicant-card]").filter({ hasText: "Jordan Lee" })
    await expect(card.locator("[data-hiring-path=beginner]")).toBeVisible()
    await expect(card.locator("[data-hiring-checklist='0/5']")).toBeVisible()
    await expect(page.locator("[data-applicant-column]")).toHaveCount(6)

    await page.getByRole("link", { name: "Jordan Lee" }).click()
    await expect(page.getByRole("heading", { name: "Hiring path and checklist" })).toBeVisible()
    await expect(page.locator("[data-hiring-activity=review_application]")).toBeVisible()
    await expect(page.locator("[data-hiring-activity=practical_audition]")).toHaveCount(0)
    await expect(page.getByText("Checking an item does not email the applicant")).toBeVisible()

    const pathForm = page.locator('form[data-hiring-form="path"]')
    await pathForm.getByLabel("Hiring path").selectOption("experienced")
    await pathForm.getByRole("button", { name: "Save hiring path" }).click()
    await expect(page.locator("[data-hiring-path=experienced]")).toBeVisible()
    await expect(page.locator("[data-hiring-activity=practical_audition]")).toBeVisible()
    await expect(page.locator("[data-hiring-activity=practical_audition]")).toContainText("Optional")

    const review = page.locator("[data-hiring-activity=review_application]")
    await review.getByRole("button", { name: "Mark complete" }).click()
    await expect(page.locator("[data-hiring-activity-status=complete]").first()).toBeVisible()

    const video = page.locator("[data-hiring-activity=video_interview]")
    await video.getByLabel("Skip reason").fill("We already spoke in person.")
    await video.getByRole("button", { name: "Skip activity" }).click()
    await expect(page.locator("[data-hiring-activity=video_interview]")).toContainText("Skipped")
    await page.locator("[data-hiring-activity=video_interview]").getByRole("button", { name: "Reopen activity" }).click()
    await expect(page.locator("[data-hiring-activity=video_interview]")).toContainText("Optional")

    const custom = page.locator('form[data-hiring-form="custom-activity"]')
    await custom.getByLabel("Add a custom activity").fill("Shadow a wedding")
    await custom.getByRole("button", { name: "Add activity" }).click()
    await expect(page.locator("[data-hiring-activity=custom]")).toContainText("Shadow a wedding")
    await page.locator("div[data-hiring-checklist]").screenshot({ path: `${SHOTS}/stage36_hiring_checklist.png` })

    const addConversation = page.locator('form[data-hiring-form="conversation"][data-conversation-id=new]')
    await addConversation.getByLabel("Conversation type").selectOption("phone")
    await addConversation.getByLabel("Planned date and time").fill("2026-04-02T15:00")
    await addConversation.getByLabel("Private notes").fill("Ask about weekend availability.")
    await addConversation.getByLabel("Next action").fill("Offer an audition if the call goes well.")
    await addConversation.getByLabel("Person responsible").fill("Alex")
    await addConversation.getByRole("button", { name: "Save conversation" }).click()
    await expect(page.locator("[data-hiring-conversations]")).toContainText("Ask about weekend availability.")
    await page.locator("[data-hiring-conversations]").screenshot({ path: `${SHOTS}/stage36_conversations.png` })

    const addAudition = page.locator('form[data-hiring-form="audition"][data-audition-id=new]')
    await addAudition.getByLabel("Audition title").fill("Saturday setup check")
    await addAudition.getByLabel("Description").fill("Set up two speakers and a microphone.")
    await addAudition.getByLabel("Location or remote format").fill("Studio")
    await addAudition.getByLabel("Assigned evaluator").fill("Alex")
    await addAudition.getByLabel("Completion status").selectOption("completed")
    await addAudition.getByLabel("Equipment setup (your rating)").selectOption("4")
    await addAudition.getByLabel("Private notes and observations").fill("Clear setup. Mixing still developing.")
    await addAudition.getByRole("button", { name: "Save audition" }).click()
    await expect(page.locator("[data-hiring-auditions]")).toContainText("Saturday setup check")
    await expect(page.locator("[data-hiring-auditions]")).toContainText("does not grade the audition")
    await expect(page.getByText(/auto-grade|certification standard|test-out requirement/i)).toHaveCount(0)
    await page.locator("[data-hiring-auditions]").screenshot({ path: `${SHOTS}/stage36_audition.png` })

    const decision = page.locator('form[data-review-form="decision"]')
    await decision.getByLabel("Owner decision").selectOption("hired")
    await expect(page.locator("[data-hiring-outcome-fields]")).toBeVisible()
    await decision.getByLabel("Intended role").fill("Wedding DJ")
    await decision.getByLabel("Planned start date").fill("2026-05-01")
    await decision.getByLabel("Intended W-2 or 1099 engagement").selectOption("w2")
    await decision.getByLabel("Private hiring notes").fill("Start after the May wedding.")
    await page.locator("[data-hiring-outcome-fields]").screenshot({ path: `${SHOTS}/stage36_hiring_outcome_form.png` })
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-hiring-outcome=hired]")).toContainText("Wedding DJ")
    await expect(page.locator("[data-hiring-outcome=hired]")).toContainText("Intended W-2")
    await expect(page.locator("[data-decision-history]")).toContainText("Mark hired")
    await expect(page.getByText("does not create an employee account").first()).toBeVisible()
    await page.locator('[aria-labelledby="applicant-decision-title"]').screenshot({
      path: `${SHOTS}/stage36_hiring_outcome.png`,
    })

    await decision.getByLabel("Owner decision").selectOption("hold")
    await decision.getByLabel("Reason or note").fill("Need one more conversation.")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-hiring-outcome=reversed]")).toBeVisible()
    await expect(page.locator("[data-hiring-outcome=hired]")).toBeVisible()
    await expect(page.locator("[data-decision-history]")).toContainText("Hold for later review")

    await page.goto("/blueprint/applicants")
    const boardCard = page.locator("[data-applicant-card]").filter({ hasText: "Jordan Lee" })
    await expect(boardCard.locator("[data-hiring-path=experienced]")).toBeVisible()
    await expect(boardCard.locator("[data-conversation-status=planned]")).toBeVisible()
    await expect(boardCard.locator("[data-audition-status=completed]")).toBeVisible()
    await expect(page.locator("[data-applicant-column]")).toHaveCount(6)
    await page.locator("[data-applicant-board]").screenshot({ path: `${SHOTS}/stage36_applicant_kanban.png` })
  })
})
