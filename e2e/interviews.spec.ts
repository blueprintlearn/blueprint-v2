import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  },
})

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
  await page.getByLabel("First name").fill("Maya")
  await page.getByLabel("Last name").fill("Chen")
  await page.getByLabel("Email").fill("maya.int@example.com")
  await page.getByLabel("Phone").fill("555-010-0199")
  await page.getByLabel("General location or service area").fill("Austin, TX")
  await page.getByLabel("Availability for events").fill("Most Saturday nights.")
  await page.getByLabel("Previous DJ or event experience").fill("I have DJed friends' parties.")
  await page.getByLabel("Why do you want to work with this company?").fill("I want to learn weddings.")
  await page.getByRole("checkbox", { name: /privacy notice/ }).check()
  await page.locator('form[data-join-apply="form"]').getByRole("button", { name: "Submit application" }).click()
  await expect(page.getByText("We received your application")).toBeVisible()
}

async function recordAnswer(page: Page) {
  await page.getByRole("button", { name: "Start recording" }).click()
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
  await page.waitForTimeout(2000)
  await page.getByRole("button", { name: "Stop" }).click()
  await expect(page.getByRole("button", { name: "Use this take" })).toBeVisible()
  await page.getByRole("button", { name: "Use this take" }).click()
  await expect(page.getByRole("button", { name: "Use this take" })).toHaveCount(0)
}

test.describe("One-way video interviews", () => {
  test("owner sets questions, applicant records, owner reviews without scores", async ({ page, browser }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await publishAndApply(page)

    await page.goto("/blueprint/recruiting/interview")
    await expect(page.getByRole("heading", { level: 1, name: "Video interview" })).toBeVisible()
    const questions = page.locator('form[data-interview-form="template"]')
    await questions.locator("#prompt-0").fill("Why do you want to DJ here?")
    await questions.locator("#timeLimit-0").selectOption("15")
    await questions.locator("#prompt-1").fill("Tell us about a recent event.")
    await questions.locator("#timeLimit-1").selectOption("15")
    await questions.locator("#prompt-2").fill("What if you were running late?")
    await questions.locator("#timeLimit-2").selectOption("15")
    await questions.getByRole("button", { name: "Save interview questions" }).click()
    await expect(page.getByText("Saved")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage34_owner_setup.png`, fullPage: true })

    await page.goto("/blueprint/applicants")
    await expect(page.locator("[data-interview-status=not_sent]")).toContainText("Interview Not Sent")
    await page.getByRole("link", { name: "Maya Chen" }).click()
    await page.locator('form[data-interview-form="invite"]').getByRole("button", { name: "Send interview invitation" }).click()
    const invite = page.locator("[data-interview-invite-url]")
    await expect(invite).toContainText("/interview/")
    const interviewUrl = (await invite.textContent())?.trim() ?? ""
    expect(interviewUrl).toMatch(/\/interview\/[A-Za-z0-9_-]+$/)

    await page.goto("/blueprint/applicants")
    await expect(page.locator("[data-interview-status=invited]")).toContainText("Invited")

    const applicantContext = await browser.newContext({
      permissions: ["camera", "microphone"],
    })
    const applicant = await applicantContext.newPage()
    await applicant.goto(interviewUrl)
    await expect(applicant.getByRole("heading", { level: 1, name: "Video interview" })).toBeVisible()
    await expect(applicant.getByText("Why do you want to DJ here?")).toBeVisible()
    await applicant.screenshot({ path: `${SHOTS}/stage34_applicant_recording.png`, fullPage: true })
    await recordAnswer(applicant)
    await expect(applicant.getByText("Tell us about a recent event.")).toBeVisible()
    await recordAnswer(applicant)
    await expect(applicant.getByText("What if you were running late?")).toBeVisible()
    await recordAnswer(applicant)
    await applicant.getByRole("button", { name: "Submit interview" }).click()
    await expect(applicant.getByText("Your interview is submitted")).toBeVisible()
    await applicant.goto(interviewUrl)
    await expect(applicant.locator("[data-interview-complete]")).toBeVisible()
    await applicantContext.close()

    await page.goto("/blueprint/applicants")
    await expect(page.locator("[data-applicant-column=new_application]")).toContainText("Maya Chen")
    await page.getByRole("link", { name: "Maya Chen" }).click()
    await expect(page.getByText("One-way video interview")).toBeVisible()
    await expect(page.locator("[data-interview-video]")).toHaveCount(3)
    await expect(page.getByText("Applicant said", { exact: true })).toHaveCount(3)
    await expect(page.getByText("AI summary", { exact: true })).toHaveCount(3)
    if ((await page.getByText("[Not a speech transcript]").count()) === 0) {
      await page.getByRole("button", { name: "Retry processing" }).click()
      await expect(page.getByText("[Not a speech transcript]")).toHaveCount(3)
    }
    await expect(page.getByText("[Not a speech transcript]")).toHaveCount(3)
    await expect(page.getByText("[AI summary unavailable]")).toHaveCount(4)
    await expect(page.getByText(/\b(score:|rating:|pass\/fail|recommend hiring)\b/i)).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage34_interview_review.png`, fullPage: true })
  })
})
