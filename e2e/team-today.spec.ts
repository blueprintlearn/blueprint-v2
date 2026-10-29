import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

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

test.describe("team today in the browser", () => {
  test("Company A owner can save a DJ count that Company B cannot see", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await openGuidedTeamPage(page)
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    const desiredForm = page.locator("form[data-saved-desired-dj-count]")
    await page.getByLabel("Current DJ count", { exact: true }).fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(teamTodayForm.getByRole("status")).toHaveText("Saved")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue(uniqueDjCount)
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    const savedDesired = await desiredForm.getAttribute("data-saved-desired-dj-count")
    await expect(sectionStatus(page)).toHaveText(savedDesired === "" ? "In progress" : "Done")

    await page.reload()
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue(uniqueDjCount)
    await expect(teamTodayForm.getByRole("status")).not.toHaveText("Saved")

    await teamTodayForm.getByLabel("Current DJ count", { exact: true }).fill(nextDjCount)
    await teamTodayForm.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(teamTodayForm.getByRole("status")).toHaveText("Saved")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue(nextDjCount)
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)

    // Editing the other form leaves this Saved alone; editing this form clears it.
    await desiredForm.getByLabel("Desired DJ count").fill("5")
    await expect(teamTodayForm.getByRole("status")).toHaveText("Saved")
    await teamTodayForm.getByLabel("Current DJ count", { exact: true }).fill("20")
    await expect(teamTodayForm.getByRole("status")).not.toHaveText("Saved")
    await expect(desiredForm.getByRole("status")).not.toHaveText("Saved")

    await page.reload()
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue(nextDjCount)

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

    await signIn(page, "owner-a@blueprint.test")
    await openGuidedTeamPage(page)
    await page.getByLabel("Current DJ count", { exact: true }).fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)

    await page.getByLabel("Desired DJ count").fill(uniqueDesired)
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    const desiredForm = page.locator("form[data-saved-desired-dj-count]")
    await expect(desiredForm.getByRole("status")).toHaveText("Saved")
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", uniqueDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(uniqueDesired)
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    await expect(sectionStatus(page)).toHaveText("Done")

    await page.getByLabel("Desired DJ count").fill(nextDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(nextDesired)
    await expect(desiredForm.getByRole("status")).not.toHaveText("Saved")
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(desiredForm.getByRole("status")).toHaveText("Saved")
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", nextDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(nextDesired)
    await expect(page.getByText(uniqueDesired)).toHaveCount(0)

    await page.reload()
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", nextDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(nextDesired)

    await page.getByLabel("Desired DJ count").fill("1200")
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(desiredForm.getByRole("alert")).toHaveText("Enter a whole number from 0 to 999.")
    await expect(page.getByLabel("Desired DJ count")).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByLabel("Desired DJ count")).toHaveValue("1200")
    await expect(desiredForm.getByRole("status")).not.toHaveText("Saved")
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", nextDesired)

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
})
