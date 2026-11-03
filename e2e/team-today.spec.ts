import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

import { COMPANY_A_ID, OWNER_C_EMAIL, resetGuidedCompanyData, seedLegacyTeamCount } from "./empty-guided-company"

const password = "blueprint-local-password"
const uniqueDjCount = "247"
const nextDjCount = "19"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

async function signUpNewOwner(page: Page, slug: string, companyPrefix: string) {
  await page.goto("/sign-up")
  await page.getByLabel("Email").fill(`${slug}-${randomUUID()}@blueprint.test`)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL("/")
  await page.getByLabel("Company name").fill(`${companyPrefix} ${randomUUID()}`)
  await page.getByRole("button", { name: "Create company" }).click()
  await expect(teamTodayHeading(page)).toBeVisible()
}

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")

async function openGuidedTeamPage(page: Page) {
  await page.goto("/blueprint/team")
  await expect(page.getByRole("heading", { level: 1, name: "Your team today" })).toBeVisible()
}

const teamTodayHeading = (page: Page) => page.getByRole("heading", { level: 2, name: "Team today" })
const teamTodayStatus = (page: Page) =>
  page.locator("section").filter({ has: teamTodayHeading(page) }).locator(".bp-status")

const t1Label = /Not counting yourself, how many DJs work events for your company/

test.describe("team today in the browser", () => {
  test("Company A owner can save a DJ count that Company B cannot see", async ({ page }) => {
    resetGuidedCompanyData(COMPANY_A_ID)
    await signIn(page, "owner-a@blueprint.test")
    await openGuidedTeamPage(page)
    const todayForm = page.locator("form[data-card='today']")
    const wantedForm = page.locator("form[data-card='wanted']")
    await page.getByLabel(t1Label).fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(todayForm.locator(".bp-save")).toHaveText("Saved")
    await expect(todayForm).toHaveAttribute("data-saved-t1", uniqueDjCount)
    await expect(page.getByLabel(t1Label)).toHaveValue(uniqueDjCount)
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    await expect(sectionStatus(page)).toHaveText("Needs attention")

    await page.reload()
    await expect(todayForm).toHaveAttribute("data-saved-t1", uniqueDjCount)
    await expect(page.getByLabel(t1Label)).toHaveValue(uniqueDjCount)
    await expect(todayForm.locator(".bp-save")).not.toHaveText("Saved")

    await page.getByLabel(t1Label).fill(nextDjCount)
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(todayForm.locator(".bp-save")).toHaveText("Saved")
    await expect(todayForm).toHaveAttribute("data-saved-t1", nextDjCount)
    await expect(page.getByLabel(t1Label)).toHaveValue(nextDjCount)
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)

    await wantedForm.getByLabel(/DJs would you like|Earlier you said/).fill("5")
    await expect(todayForm.locator(".bp-save")).toHaveText("Saved")
    await page.getByLabel(t1Label).fill("20")
    await expect(todayForm.locator(".bp-save")).not.toHaveText("Saved")

    await page.reload()
    await expect(todayForm).toHaveAttribute("data-saved-t1", nextDjCount)
    await expect(page.getByLabel(t1Label)).toHaveValue(nextDjCount)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)
    await expect(page.getByText(nextDjCount)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Team today" })).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(teamTodayHeading(page)).toBeVisible()
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)
    await expect(page.getByText(nextDjCount)).toHaveCount(0)
    const companyBForm = page.locator("form[data-saved-current-dj-count]")
    await expect(companyBForm).not.toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(companyBForm).not.toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).not.toHaveValue(uniqueDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).not.toHaveValue(nextDjCount)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })

  test("a new owner sees an empty field until a saved 0", async ({ page }) => {
    await signUpNewOwner(page, "zero-dj", "Zero Count")
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    const current = page.getByLabel("Current DJ count", { exact: true })
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "")
    await expect(current).toHaveValue("")
    await expect(current).toHaveAttribute("placeholder", "e.g. 6")
    await expect(teamTodayForm.getByRole("status")).not.toHaveText("Saved")
    await expect(teamTodayStatus(page)).toHaveText("Not answered yet")

    await current.fill("0")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(teamTodayForm.getByRole("status")).toHaveText("Saved")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "0")
    await expect(current).toHaveValue("0")
    await expect(teamTodayStatus(page)).toHaveText("Partly answered")

    await page.reload()
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "0")
    await expect(current).toHaveValue("0")
    await expect(teamTodayStatus(page)).toHaveText("Partly answered")
  })

  test("Company A owner can save a desired DJ count that Company B cannot see", async ({
    page,
  }) => {
    const uniqueDesired = "612"
    const nextDesired = "183"

    resetGuidedCompanyData(COMPANY_A_ID)
    await signIn(page, "owner-a@blueprint.test")
    await openGuidedTeamPage(page)
    const wantedForm = page.locator("form[data-card='wanted']")
    const t6 = page.getByLabel(/DJs would you like|Earlier you said/)
    await t6.fill(uniqueDesired)
    await page.getByRole("button", { name: "Save the team you want" }).click()
    await expect(wantedForm.locator(".bp-save")).toHaveText("Saved")
    await expect(wantedForm).toHaveAttribute("data-saved-t6", uniqueDesired)
    await expect(t6).toHaveValue(uniqueDesired)
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    await expect(sectionStatus(page)).toHaveText("Needs attention")

    await t6.fill(nextDesired)
    await expect(t6).toHaveValue(nextDesired)
    await expect(wantedForm.locator(".bp-save")).not.toHaveText("Saved")
    await page.getByRole("button", { name: "Save the team you want" }).click()
    await expect(wantedForm.locator(".bp-save")).toHaveText("Saved")
    await expect(wantedForm).toHaveAttribute("data-saved-t6", nextDesired)
    await expect(t6).toHaveValue(nextDesired)
    await expect(page.getByText(uniqueDesired)).toHaveCount(0)

    await page.reload()
    await expect(wantedForm).toHaveAttribute("data-saved-t6", nextDesired)
    await expect(page.getByLabel(/DJs would you like|Earlier you said/)).toHaveValue(nextDesired)

    await page.getByLabel(/DJs would you like|Earlier you said/).fill("1200")
    await page.getByRole("button", { name: "Save the team you want" }).click()
    await expect(wantedForm.getByRole("alert")).toHaveText("Enter a whole number from 0 to 999.")
    await expect(page.getByLabel(/DJs would you like|Earlier you said/)).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByLabel(/DJs would you like|Earlier you said/)).toHaveValue("1200")
    await expect(wantedForm.locator(".bp-save")).not.toHaveText("Saved")
    await expect(wantedForm).toHaveAttribute("data-saved-t6", nextDesired)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Team today" })).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(teamTodayHeading(page)).toBeVisible()
    await expect(page.getByText(uniqueDesired)).toHaveCount(0)
    await expect(page.getByText(nextDesired)).toHaveCount(0)
    const companyBDesired = page.locator("form[data-saved-desired-dj-count]")
    await expect(companyBDesired).not.toHaveAttribute("data-saved-desired-dj-count", uniqueDesired)
    await expect(companyBDesired).not.toHaveAttribute("data-saved-desired-dj-count", nextDesired)
    await expect(page.getByLabel("Desired DJ count")).not.toHaveValue(uniqueDesired)
    await expect(page.getByLabel("Desired DJ count")).not.toHaveValue(nextDesired)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })

  test("a new owner must save current DJ count before desired 0", async ({ page }) => {
    await signUpNewOwner(page, "desired-zero", "Desired Zero")
    const desiredForm = page.locator("form[data-saved-desired-dj-count]")
    const desired = page.getByLabel("Desired DJ count")
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "")
    await expect(desiredForm.getByText("Save your current DJ count first.")).toBeVisible()

    await desired.fill("4")
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(desiredForm.getByRole("alert")).toHaveText("Save your current DJ count first.")
    await expect(desired).toHaveAttribute("aria-invalid", "true")
    await expect(desired).toHaveValue("4")
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "")
    await expect(desiredForm.getByRole("status")).not.toHaveText("Saved")

    await page.getByLabel("Current DJ count", { exact: true }).fill("3")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "3")
    await expect(desiredForm.getByText("How many you’d like to have.")).toBeVisible()

    await desired.fill("0")
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(desiredForm.getByRole("status")).toHaveText("Saved")
    await expect(desiredForm.getByRole("alert")).toHaveCount(0)
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "0")
    await expect(desired).toHaveValue("0")
    await expect(teamTodayStatus(page)).toHaveText("Answered")

    await page.reload()
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "0")
    await expect(desired).toHaveValue("0")
    await expect(teamTodayStatus(page)).toHaveText("Answered")
  })

  test("T0 Yes keeps the stored count and asks for a team-only T1", async ({ page }) => {
    seedLegacyTeamCount(6, 8)
    await signIn(page, OWNER_C_EMAIL)
    await expect(page.getByText("Does this include you?")).toBeVisible()
    await page.getByRole("link", { name: "Confirm in your Blueprint" }).click()
    await expect(page).toHaveURL(/\/blueprint\/team#q-T0/)
    await expect(page.getByText("Earlier you told us you have 6 DJs. Did that number include you?")).toBeVisible()
    await page.getByRole("radio", { name: "Yes, it included me" }).check()
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-basis", "includes_owner")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-t1", "")
    await expect(page.getByLabel(/Not counting yourself, how many DJs work events/)).toHaveValue("")
    await expect(page.getByText("You told us 6 included you. Enter how many DJs you have, not counting yourself.")).toBeVisible()
    await expect(page.getByRole("region", { name: "Your team at a glance" })).toHaveCount(0)

    await page.getByLabel(/Not counting yourself, how many DJs work events/).fill("5")
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-t1", "5")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-basis", "excludes_owner")
  })
})
