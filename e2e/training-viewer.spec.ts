import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import {
  ensureEmptyGuidedCompany,
  ensureLocalTraineeUser,
  OWNER_C_EMAIL,
  OWNER_C_PASSWORD,
  setLocalTraineeMembershipStatus,
  TRAINEE_C_EMAIL,
  TRAINEE_C_PASSWORD,
} from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

async function adoptPublishedCourse(page: Page) {
  await page.goto("/blueprint/training")
  await expect(page.getByRole("heading", { name: "Training library" })).toBeVisible()
  await page.locator("[data-training-starter=catalog]").getByRole("button", { name: "Add to my library" }).click()
  await expect(page.locator("[data-training-section=courses]").getByRole("link", { name: "MC Foundations" })).toBeVisible()
}

test.describe("Trainee frozen-content viewer", () => {
  test("trainee reads the frozen published snapshot, including later lessons, without submitting work", async ({
    page,
  }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await adoptPublishedCourse(page)

    await page.goto("/blueprint/training/enrollments")
    const staff = page.locator('form[data-enrollment-form="staff"]')
    await staff.getByLabel("Company staff member").selectOption({ label: "owner-c@blueprint.test · Owner" })
    await staff.getByLabel("Published course or path").selectOption({ label: "Course · MC Foundations · version 1" })
    await staff.getByRole("checkbox", { name: /reviewed this assignment/ }).check()
    await staff.getByRole("button", { name: "Enroll staff member" }).click()
    await expect(staff.locator(".bp-save")).toHaveText("Saved")

    await page.goto("/training")
    await expect(page.locator("[data-trainee-assignments]")).toContainText("MC Foundations")
    await page.getByRole("link", { name: "Open assigned version" }).click()
    await expect(page.getByRole("heading", { name: "MC Foundations" })).toBeVisible()
    await expect(page.locator("[data-training-viewer]")).toHaveAttribute("data-training-version", "1")
    await expect(page.getByText("Lessons can be opened in any order. Completion is not enabled.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Open lesson: Welcome" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Open lesson: Microphone check" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Open lesson: First announcements" })).toBeVisible()

    await page.getByRole("link", { name: "Open lesson: Microphone check" }).click()
    await expect(page.getByRole("heading", { name: "Microphone check" })).toBeVisible()
    await expect(page.getByText("When should you test the microphone?")).toBeVisible()
    await expect(page.locator("[data-quiz-option]")).toContainText(["Before guests arrive", "During the first dance"])
    await expect(page.locator("[data-quiz-correct]")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /submit/i })).toHaveCount(0)
    await expect(page.getByText("This quiz is read-only. Answers cannot be submitted yet.")).toBeVisible()

    await page.getByRole("link", { name: "Back to MC Foundations" }).first().click()
    await page.getByRole("link", { name: "Open lesson: First announcements" }).click()
    await expect(page.getByText("Record a 30-second welcome for cocktail hour.")).toBeVisible()
    await expect(page.getByText("This assignment is read-only. Submissions are not enabled yet.")).toBeVisible()
    await expect(page.getByRole("button", { name: /submit/i })).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage44-trainee-assignment-readonly.png`, fullPage: true })

    await page.goto("/blueprint/training")
    await page.locator("[data-training-section=courses]").getByRole("link", { name: "MC Foundations" }).click()
    const editor = page.locator('form[data-training-form="course-editor"]')
    await editor.getByLabel("Course title").fill("Our MC Foundations")
    await editor.getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator('form[data-training-form="publish-course"]')).toBeVisible()
    const publish = page.locator('form[data-training-form="publish-course"]')
    await publish.getByRole("checkbox", { name: /reviewed this course/ }).check()
    await publish.getByRole("button", { name: "Publish version" }).click()
    await expect(page.locator('form[data-training-form="publish-course"]')).toHaveCount(0)

    await page.goto("/training")
    await page.getByRole("link", { name: "Open assigned version" }).click()
    await expect(page.getByRole("heading", { name: "MC Foundations" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Our MC Foundations" })).toHaveCount(0)
    await expect(page.locator("[data-training-viewer]")).toHaveAttribute("data-training-version", "1")
    await page.getByRole("link", { name: "Open lesson: Welcome" }).click()
    await expect(page.getByText("A clear welcome tells guests who you are and what happens next.")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage44-frozen-course-version.png`, fullPage: true })
  })

  test("an inactive membership cannot open assigned training content", async ({ page }) => {
    ensureEmptyGuidedCompany()
    ensureLocalTraineeUser()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await adoptPublishedCourse(page)

    await page.goto("/blueprint/training/enrollments")
    const invite = page.locator('form[data-enrollment-form="invitation"]')
    await invite.getByLabel("Trainee email").fill(TRAINEE_C_EMAIL)
    await invite.getByLabel("Published course or path").selectOption({ label: "Course · MC Foundations · version 1" })
    await invite.getByRole("checkbox", { name: /reviewed this assignment/ }).check()
    await invite.getByRole("button", { name: "Invite trainee" }).click()
    await expect(invite.getByText("Local invite link")).toBeVisible()
    const inviteUrl = await invite.locator("[data-invite-url]").getAttribute("data-invite-url")
    expect(inviteUrl).toContain("/training/invite/")

    await page.getByRole("button", { name: "Sign out" }).click()
    await signIn(page, TRAINEE_C_EMAIL, TRAINEE_C_PASSWORD)
    await page.goto(inviteUrl!)
    await page.locator('form[data-enrollment-form="accept"]').getByRole("button", { name: "Accept invitation" }).click()
    await expect(page.getByRole("link", { name: "Open assigned training" })).toBeVisible()
    await page.getByRole("link", { name: "Open assigned training" }).click()
    await page.getByRole("link", { name: "Open assigned version" }).click()
    await expect(page.getByRole("heading", { name: "MC Foundations" })).toBeVisible()
    const assignmentUrl = page.url()
    await page.getByRole("link", { name: "Open lesson: Welcome" }).click()
    await expect(page.getByText("A clear welcome tells guests who you are and what happens next.")).toBeVisible()
    const lessonUrl = page.url()

    setLocalTraineeMembershipStatus("inactive")
    await page.goto("/training")
    await expect(page).toHaveURL(/\/sign-in/)
    await signIn(page, TRAINEE_C_EMAIL, TRAINEE_C_PASSWORD)
    await page.goto(assignmentUrl)
    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.getByText("A clear welcome tells guests who you are and what happens next.")).toHaveCount(0)
    await page.goto(lessonUrl)
    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.locator("[data-training-lesson-view]")).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage44-inactive-membership-blocked.png`, fullPage: true })
  })
})
