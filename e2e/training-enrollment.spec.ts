import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import {
  ensureEmptyGuidedCompany,
  ensureLocalTraineeUser,
  OWNER_C_EMAIL,
  OWNER_C_PASSWORD,
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
  await expect(page.getByRole("link", { name: "Enroll people in training" })).toBeVisible()
  await page.locator("[data-training-starter=catalog]").getByRole("button", { name: "Add to my library" }).click()
  await expect(page.locator("[data-training-section=courses]").getByRole("link", { name: "MC Foundations" })).toBeVisible()
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
  await page.getByLabel("Email").fill("jordan.enroll@example.com")
  await page.getByLabel("Phone").fill("555-010-0211")
  await page.getByLabel("General location or service area").fill("Austin, TX")
  await page.getByLabel("Availability for events").fill("Most Saturday nights.")
  await page.getByLabel("Previous DJ or event experience").fill("I have DJed friends' parties.")
  await page.getByLabel("Why do you want to work with this company?").fill("I want to learn weddings.")
  await page.getByRole("checkbox", { name: /privacy notice/ }).check()
  await page.locator('form[data-join-apply="form"]').getByRole("button", { name: "Submit application" }).click()
  await expect(page.getByText("We received your application")).toBeVisible()
}

test.describe("Training enrollment", () => {
  test("owner enrolls staff, invites a trainee, and freezes the published version", async ({ page }) => {
    ensureEmptyGuidedCompany()
    ensureLocalTraineeUser()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await adoptPublishedCourse(page)

    await page.getByRole("link", { name: "Enroll people in training" }).click()
    await expect(page.getByRole("heading", { name: "Training enrollment" })).toBeVisible()
    await expect(page.getByText("No approved recruitment handoffs are waiting for enrollment.")).toBeVisible()

    const staff = page.locator('form[data-enrollment-form="staff"]')
    await staff.getByLabel("Company staff member").selectOption({ label: "owner-c@blueprint.test · Owner" })
    await staff.getByLabel("Published course or path").selectOption({ label: "Course · MC Foundations · version 1" })
    await staff.getByRole("checkbox", { name: /reviewed this assignment/ }).check()
    await staff.getByRole("button", { name: "Enroll staff member" }).click()
    await expect(staff.locator(".bp-save")).toHaveText("Saved")
    await page.reload()
    await expect(page.locator("[data-enrollment-list=active]")).toContainText("MC Foundations")
    await expect(page.locator("[data-enrollment-list=active] [data-enrollment]")).toHaveCount(1)

    await staff.getByLabel("Company staff member").selectOption({ label: "owner-c@blueprint.test · Owner" })
    await staff.getByLabel("Published course or path").selectOption({ label: "Course · MC Foundations · version 1" })
    await staff.getByRole("checkbox", { name: /reviewed this assignment/ }).check()
    await staff.getByRole("button", { name: "Enroll staff member" }).click()
    await expect(staff.locator(".bp-save")).toHaveText("Saved")
    await page.reload()
    await expect(page.locator("[data-enrollment-list=active] [data-enrollment]")).toHaveCount(1)

    await page.goto("/training")
    await expect(page.getByRole("heading", { name: "Your training" })).toBeVisible()
    await expect(page.locator("[data-trainee-assignments]")).toContainText("MC Foundations")
    await expect(page.locator("[data-trainee-assignments]")).toContainText("v1")

    await page.goto("/blueprint/training")
    await page.locator("[data-training-section=courses]").getByRole("link", { name: "MC Foundations" }).click()
    const editor = page.locator('form[data-training-form="course-editor"]')
    await editor.getByLabel("Course title").fill("Our MC Foundations")
    await editor.getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator('form[data-training-form="publish-course"]')).toBeVisible()
    await expect(editor.getByLabel("Course title")).toHaveValue("Our MC Foundations")
    const publish = page.locator('form[data-training-form="publish-course"]')
    await publish.getByRole("checkbox", { name: /reviewed this course/ }).check()
    await publish.getByRole("button", { name: "Publish version" }).click()
    await expect(page.locator('form[data-training-form="publish-course"]')).toHaveCount(0)

    await page.goto("/training")
    await expect(page.locator("[data-trainee-assignments]")).toContainText("MC Foundations")
    await expect(page.locator("[data-trainee-assignments]")).not.toContainText("Our MC Foundations")
    await expect(page.locator("[data-trainee-assignments]")).toContainText("v1")

    await page.goto("/blueprint/training/enrollments")
    const invite = page.locator('form[data-enrollment-form="invitation"]')
    await invite.getByLabel("Trainee email").fill(TRAINEE_C_EMAIL)
    await invite.getByLabel("Published course or path").selectOption({ index: 1 })
    await invite.getByRole("checkbox", { name: /reviewed this assignment/ }).check()
    await invite.getByRole("button", { name: "Invite trainee" }).click()
    await expect(invite.getByText("Local invite link")).toBeVisible()
    const inviteUrl = await invite.locator("[data-invite-url]").getAttribute("data-invite-url")
    expect(inviteUrl).toContain("/training/invite/")
    await page.screenshot({ path: `${SHOTS}/stage43-owner-enrollment.png`, fullPage: true })

    await page.getByRole("button", { name: "Sign out" }).click()
    await signIn(page, TRAINEE_C_EMAIL, TRAINEE_C_PASSWORD)
    await page.goto(inviteUrl!)
    await expect(page.getByRole("heading", { name: "Training invitation" })).toBeVisible()
    await page.locator('form[data-enrollment-form="accept"]').getByRole("button", { name: "Accept invitation" }).click()
    await expect(page.getByRole("link", { name: "Open assigned training" })).toBeVisible()
    await page.getByRole("link", { name: "Open assigned training" }).click()
    await expect(page.getByRole("heading", { name: "Your training" })).toBeVisible()
    await expect(page.locator("[data-trainee-assignments]")).toContainText("MC Foundations")
    await page.screenshot({ path: `${SHOTS}/stage43-trainee-assignments.png`, fullPage: true })

    await page.getByRole("button", { name: "Sign out" }).click()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/training/enrollments")
    await expect(page.locator("[data-enrollment-list=pending] [data-enrollment]")).toHaveCount(0)
    await expect(page.locator("[data-enrollment-list=active] [data-enrollment]")).toHaveCount(2)
    await page.locator("[data-enrollment-list=active] [data-enrollment]").filter({ hasText: TRAINEE_C_EMAIL }).getByRole("button", { name: "Cancel enrollment" }).click()
    await page.waitForLoadState("networkidle")
    await page.reload()
    await expect(page.locator("[data-enrollment-list=closed]")).toContainText("Cancelled")
    await expect(page.locator("[data-enrollment-list=active] [data-enrollment]")).toHaveCount(1)
  })

  test("approved recruitment handoff waits for owner confirmation and does not auto-enroll", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await adoptPublishedCourse(page)
    await publishAndApply(page)

    await page.goto("/blueprint/applicants")
    await page.getByRole("link", { name: "Jordan Lee" }).click()
    const decision = page.locator('form[data-review-form="decision"]')
    await decision.getByLabel("Owner decision").selectOption("hired")
    await decision.getByLabel("Intended role").fill("Wedding DJ")
    await decision.getByLabel("Planned start date").fill("2026-05-01")
    await decision.getByLabel("Intended W-2 or 1099 engagement").selectOption("w2")
    await decision.getByRole("button", { name: "Record decision" }).click()
    await expect(page.locator("[data-hiring-outcome=hired]")).toBeVisible()
    await page.getByRole("button", { name: "Prepare for Training" }).click()
    const approve = page.locator('form[data-training-form="approve"]')
    await approve.getByRole("checkbox", { name: "I have reviewed this preparation and want to approve the training handoff" }).check()
    await approve.getByRole("button", { name: "Approve training handoff" }).click()
    await expect(page.locator("[data-training-preparation][data-training-readiness=ready]")).toBeVisible()
    await expect(page.getByText("does not enroll anyone").first()).toBeVisible()
    await expect(page.locator("[data-enrollment-form=recruitment]")).toBeVisible()

    await page.goto("/blueprint/training/enrollments")
    await expect(page.locator("[data-enrollment-awaiting]")).toContainText("Jordan Lee")
    await expect(page.locator("[data-enrollment-list=active] [data-enrollment]")).toHaveCount(0)
    await expect(page.locator("[data-enrollment-list=pending] [data-enrollment]")).toHaveCount(0)

    const recruit = page.locator('form[data-enrollment-form="recruitment"]')
    await recruit.getByLabel("Published course or path").selectOption({ label: "Course · MC Foundations · version 1" })
    await recruit.getByRole("checkbox", { name: /reviewed this assignment/ }).check()
    await recruit.getByRole("button", { name: "Enroll in training" }).click()
    await expect(recruit.locator(".bp-save")).toHaveText("Saved")
    await expect(recruit.getByText("Local invite link")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage43-recruitment-enrollment.png`, fullPage: true })
    await page.reload()
    await expect(page.locator("[data-enrollment-awaiting]")).toContainText("No approved recruitment handoffs are waiting for enrollment.")
    await expect(page.locator("[data-enrollment-list=pending]")).toContainText("jordan.enroll@example.com")
    await expect(page.locator("[data-enrollment-list=pending]")).toContainText("MC Foundations")
    await expect(page.getByRole("link", { name: "Open approved handoff" })).toHaveCount(0)

    await page.goto("/blueprint/applicants")
    await page.getByRole("link", { name: "Jordan Lee" }).click()
    await expect(page.locator("[data-training-handoff-history]")).toContainText("Ready for training")
    await expect(page.locator("[data-training-handoff-approved]")).toContainText("Wedding DJ")
  })
})
