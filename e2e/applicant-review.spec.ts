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
  await editor.getByLabel("Additional application questions").fill("Can you work New Year's Eve?")
  await editor.getByRole("checkbox", { name: /I have reviewed this recruiting page/ }).check()
  await editor.getByRole("button", { name: "Publish recruiting page" }).click()
  await expect(page.locator("[data-recruiting-status]")).toHaveAttribute("data-recruiting-status", "published")

  await page.goto("/join/company-c")
  await page.getByLabel("First name").fill("Maya")
  await page.getByLabel("Last name").fill("Chen")
  await page.getByLabel("Email").fill("maya.review@example.com")
  await page.getByLabel("Phone").fill("555-010-0199")
  await page.getByLabel("General location or service area").fill("Austin, TX")
  await page.getByLabel("Availability for events").fill("Most Saturday nights.")
  await page.getByLabel("Previous DJ or event experience").fill("I have DJed friends' parties.")
  await page.getByLabel("Why do you want to work with this company?").fill("I want to learn weddings.")
  await page.getByLabel("Can you work New Year's Eve?").fill("Yes, I can.")
  await page.getByRole("checkbox", { name: /privacy notice/ }).check()
  await page.locator('form[data-join-apply="form"]').getByRole("button", { name: "Submit application" }).click()
  await expect(page.getByText("We received your application")).toBeVisible()
  await expect(page.getByText("Human evaluation")).toHaveCount(0)
  await expect(page.getByText("Owner decision")).toHaveCount(0)
}

test.describe("Candidate review and owner decisions", () => {
  test("owner reviews, evaluates, decides, and follows up without auto-scoring", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await publishAndApply(page)

    await page.goto("/blueprint/applicants")
    await expect(page.getByRole("heading", { level: 1, name: "Applicants" })).toBeVisible()
    const card = page.locator("[data-applicant-card]").filter({ hasText: "Maya Chen" })
    await expect(card.locator("[data-review-status=needs_review]")).toBeVisible()
    await expect(card.locator("[data-evaluation-status=not_started]")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage35_applicant_kanban.png`, fullPage: true })

    await page.getByRole("link", { name: "Maya Chen" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Maya Chen" })).toBeVisible()
    await expect(page.getByText("Most Saturday nights.")).toBeVisible()
    await expect(page.getByText("Can you work New Year's Eve?")).toBeVisible()
    await expect(page.getByText("Yes, I can.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Human evaluation" })).toBeVisible()
    await expect(page.getByText("There is no overall score.")).toBeVisible()
    await expect(page.getByText(/does not add them up/i)).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage35_candidate_review.png`, fullPage: true })

    const evaluation = page.locator('form[data-review-form="evaluation"]')
    await evaluation.getByLabel("Communication (your rating)").selectOption("4")
    await evaluation.getByLabel("Notes for Communication").fill("Clear written answers.")
    await evaluation.getByRole("button", { name: "Save human evaluation" }).click()
    await expect(page.locator("[data-evaluation-status=incomplete]")).toBeVisible()

    await evaluation.getByLabel("Relevant experience (your rating)").selectOption("3")
    await evaluation.getByLabel("Availability (your rating)").selectOption("5")
    await evaluation.getByLabel("Job-related skills (your rating)").selectOption("4")
    await evaluation.getByLabel("Evidence from application and interview (your rating)").selectOption("4")
    await evaluation.getByRole("button", { name: "Save human evaluation" }).click()
    await expect(page.locator("[data-evaluation-status=complete]")).toBeVisible()
    await expect(page.getByText("There is no overall score.")).toBeVisible()
    await expect(page.getByText(/\boverall rating\b|\bscore:\s*\d/i)).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage35_human_scorecard.png`, fullPage: true })

    await page.goto("/blueprint/recruiting/scorecard")
    await expect(page.getByRole("heading", { level: 1, name: "Evaluation categories" })).toBeVisible()
    await page.locator("#category-0").fill("Weekend reliability")
    await page.getByRole("button", { name: "Save categories" }).click()
    await expect(page.getByText("Saved")).toBeVisible()
    await page.goto("/blueprint/applicants")
    await page.getByRole("link", { name: "Maya Chen" }).click()
    await expect(page.getByLabel("Communication (your rating)")).toBeVisible()
    await expect(page.getByLabel("Weekend reliability (your rating)")).toHaveCount(0)

    const decision = page.locator('form[data-review-form="decision"]')
    await decision.getByLabel("Owner decision").selectOption("hold")
    await decision.getByLabel("Reason or note").fill("Review the video first.")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-decision-history]")).toContainText("Hold for later review")
    await expect(page.locator("[data-decision-history]")).toContainText("Review the video first.")

    await decision.getByLabel("Owner decision").selectOption("advance")
    await decision.getByLabel("Reason or note").fill("Move into screening.")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-decision-history]")).toContainText("Advance to next step")
    await expect(page.getByText("New Application → Screening").first()).toBeVisible()

    await decision.getByLabel("Owner decision").selectOption("reject")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-decision-history]")).toContainText("Reject")

    await decision.getByLabel("Owner decision").selectOption("hired")
    await decision.getByLabel("Reason or note").fill("Reversing after a conversation.")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-decision-history]")).toContainText("Mark hired")
    await expect(page.locator("[data-decision-history]")).toContainText("Reversing after a conversation.")
    await expect(page.getByText("does not email the applicant")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage35_decision_workflow.png`, fullPage: true })

    const followUp = page.locator('form[data-review-form="follow-up"]')
    await followUp.getByLabel("Next action").selectOption("review_video")
    await followUp.getByLabel("Due date").fill("2026-04-01")
    await followUp.getByRole("button", { name: "Save follow-up" }).click()
    await expect(page.locator("[data-follow-up-pending=review_video]")).toContainText("Review video")

    await expect(page.getByText("Can you work New Year's Eve?")).toBeVisible()
    await expect(page.getByText("Yes, I can.")).toBeVisible()

    await page.goto("/blueprint/applicants")
    await expect(page.locator("[data-applicant-column=hired]")).toContainText("Maya Chen")
    const hiredCard = page.locator("[data-applicant-card]").filter({ hasText: "Maya Chen" })
    await expect(hiredCard.locator("[data-latest-decision=hired]")).toBeVisible()
    await expect(hiredCard.locator("[data-follow-up=review_video]")).toBeVisible()

    const filters = page.locator('form[data-applicant-form="filters"]')
    await filters.getByLabel("Outstanding follow-ups").check()
    await filters.getByRole("button", { name: "Filter" }).click()
    await expect(page.getByRole("link", { name: "Maya Chen" })).toBeVisible()
    await expect(page).toHaveURL(/followup=1/)
  })

  test("Company B cannot open another company’s scorecard", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/recruiting/scorecard")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Evaluation categories" })).toHaveCount(0)
  })
})
