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

test.describe("team today in the browser", () => {
  test("Company A owner can save a DJ count that Company B cannot see", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByText("DJs today:")).toBeVisible()
    await page.getByLabel("Current DJ count", { exact: true }).fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(page.locator("p").filter({ hasText: "DJs today:" })).toContainText(uniqueDjCount)
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue(uniqueDjCount)
    await expect(page.getByText("Company B")).toHaveCount(0)

    await teamTodayForm.getByLabel("Current DJ count", { exact: true }).fill(nextDjCount)
    await teamTodayForm.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(page.locator("p").filter({ hasText: "DJs today:" })).toContainText(nextDjCount)
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue(nextDjCount)
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)
    await expect(page.getByText(nextDjCount)).toHaveCount(0)
    await expect(page.getByText("DJs today:")).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByText("DJs today:")).toBeVisible()
    await expect(page.getByText(uniqueDjCount)).toHaveCount(0)
    await expect(page.getByText(nextDjCount)).toHaveCount(0)
    const companyBForm = page.locator("form[data-saved-current-dj-count]")
    await expect(companyBForm).not.toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)
    await expect(companyBForm).not.toHaveAttribute("data-saved-current-dj-count", nextDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).not.toHaveValue(uniqueDjCount)
    await expect(page.getByLabel("Current DJ count", { exact: true })).not.toHaveValue(nextDjCount)
    await expect(page.getByText("Company A")).toHaveCount(0)
  })

  test("a new owner sees Not set until a saved 0", async ({ page }) => {
    const email = `zero-dj-${randomUUID()}@blueprint.test`
    await page.goto("/sign-up")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL("/")
    await page.getByLabel("Company name").fill(`Zero Count ${randomUUID()}`)
    await page.getByRole("button", { name: "Create company" }).click()
    await expect(page.getByText("DJs today:")).toBeVisible()
    const djsToday = page.locator("p").filter({ hasText: "DJs today:" })
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(djsToday).toHaveText(/DJs today:\s*Not set/)
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "")
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue("")

    await page.getByLabel("Current DJ count", { exact: true }).fill("0")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    await expect(djsToday).toHaveText(/DJs today:\s*0$/)
    await expect(djsToday).not.toContainText("Not set")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "0")
    await expect(page.getByLabel("Current DJ count", { exact: true })).toHaveValue("0")
  })

  test("Company A owner can save a desired DJ count that Company B cannot see", async ({
    page,
  }) => {
    const uniqueDesired = "612"
    const nextDesired = "183"

    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByText("Desired DJs:")).toBeVisible()
    await page.getByLabel("Current DJ count", { exact: true }).fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)

    await page.getByLabel("Desired DJ count").fill(uniqueDesired)
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    const desiredForm = page.locator("form[data-saved-desired-dj-count]")
    await expect(page.locator("p").filter({ hasText: "Desired DJs:" })).toContainText(uniqueDesired)
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", uniqueDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(uniqueDesired)
    await expect(page.getByText("Company B")).toHaveCount(0)

    await page.getByLabel("Desired DJ count").fill(nextDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(nextDesired)
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(page.locator("p").filter({ hasText: "Desired DJs:" })).toContainText(nextDesired)
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", nextDesired)
    await expect(page.getByLabel("Desired DJ count")).toHaveValue(nextDesired)
    await expect(page.getByText(uniqueDesired)).toHaveCount(0)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Desired DJs:")).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByText("Desired DJs:")).toBeVisible()
    await expect(page.getByText(uniqueDesired)).toHaveCount(0)
    await expect(page.getByText(nextDesired)).toHaveCount(0)
    const companyBDesired = page.locator("form[data-saved-desired-dj-count]")
    await expect(companyBDesired).not.toHaveAttribute("data-saved-desired-dj-count", uniqueDesired)
    await expect(companyBDesired).not.toHaveAttribute("data-saved-desired-dj-count", nextDesired)
    await expect(page.getByLabel("Desired DJ count")).not.toHaveValue(uniqueDesired)
    await expect(page.getByLabel("Desired DJ count")).not.toHaveValue(nextDesired)
    await expect(page.getByText("Company A")).toHaveCount(0)
  })

  test("a new owner must save current DJ count before desired 0", async ({ page }) => {
    const email = `desired-zero-${randomUUID()}@blueprint.test`
    await page.goto("/sign-up")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL("/")
    await page.getByLabel("Company name").fill(`Desired Zero ${randomUUID()}`)
    await page.getByRole("button", { name: "Create company" }).click()
    const desiredDjs = page.locator("p").filter({ hasText: "Desired DJs:" })
    const desiredForm = page.locator("form[data-saved-desired-dj-count]")
    await expect(desiredDjs).toHaveText(/Desired DJs:\s*Not set/)
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "")

    await page.getByLabel("Desired DJ count").fill("4")
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Save current DJ count first." })).toBeVisible()
    await expect(desiredDjs).toHaveText(/Desired DJs:\s*Not set/)

    await page.getByLabel("Current DJ count", { exact: true }).fill("3")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "3")

    await page.getByLabel("Desired DJ count").fill("0")
    await page.getByRole("button", { name: "Save desired DJ count" }).click()
    await expect(desiredDjs).toHaveText(/Desired DJs:\s*0$/)
    await expect(desiredDjs).not.toContainText("Not set")
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "0")
    await expect(page.getByLabel("Desired DJ count")).toHaveValue("0")

    await page.reload()
    await expect(desiredDjs).toHaveText(/Desired DJs:\s*0$/)
    await expect(desiredForm).toHaveAttribute("data-saved-desired-dj-count", "0")
    await expect(page.getByLabel("Desired DJ count")).toHaveValue("0")
  })

  test("Company A owner can save a trainer count that Company B cannot see", async ({
    page,
  }) => {
    const uniqueTrainers = "731"
    const nextTrainers = "56"

    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByText("Trainers today:")).toBeVisible()
    await page.getByLabel("Current DJ count", { exact: true }).fill(uniqueDjCount)
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", uniqueDjCount)

    await page.getByLabel("Current trainer count", { exact: true }).fill(uniqueTrainers)
    await page.getByRole("button", { name: "Save trainer count", exact: true }).click()
    const trainerForm = page.locator("form[data-saved-current-trainer-count]")
    await expect(page.locator("p").filter({ hasText: "Trainers today:" })).toContainText(
      uniqueTrainers,
    )
    await expect(trainerForm).toHaveAttribute("data-saved-current-trainer-count", uniqueTrainers)
    await expect(page.getByLabel("Current trainer count", { exact: true })).toHaveValue(
      uniqueTrainers,
    )
    await expect(page.getByText("Company B")).toHaveCount(0)

    await page.getByLabel("Current trainer count", { exact: true }).fill(nextTrainers)
    await page.getByRole("button", { name: "Save trainer count", exact: true }).click()
    await expect(page.locator("p").filter({ hasText: "Trainers today:" })).toContainText(
      nextTrainers,
    )
    await expect(trainerForm).toHaveAttribute("data-saved-current-trainer-count", nextTrainers)
    await expect(page.getByLabel("Current trainer count", { exact: true })).toHaveValue(
      nextTrainers,
    )
    await expect(page.getByText(uniqueTrainers)).toHaveCount(0)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Trainers today:")).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByText("Trainers today:")).toBeVisible()
    await expect(page.getByText(uniqueTrainers)).toHaveCount(0)
    await expect(page.getByText(nextTrainers)).toHaveCount(0)
    const companyBTrainers = page.locator("form[data-saved-current-trainer-count]")
    await expect(companyBTrainers).not.toHaveAttribute(
      "data-saved-current-trainer-count",
      uniqueTrainers,
    )
    await expect(companyBTrainers).not.toHaveAttribute(
      "data-saved-current-trainer-count",
      nextTrainers,
    )
    await expect(page.getByLabel("Current trainer count", { exact: true })).not.toHaveValue(
      uniqueTrainers,
    )
    await expect(page.getByLabel("Current trainer count", { exact: true })).not.toHaveValue(
      nextTrainers,
    )
    await expect(page.getByText("Company A")).toHaveCount(0)
  })

  test("a new owner must save current DJ count before trainer 0", async ({ page }) => {
    const email = `trainer-zero-${randomUUID()}@blueprint.test`
    await page.goto("/sign-up")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL("/")
    await page.getByLabel("Company name").fill(`Trainer Zero ${randomUUID()}`)
    await page.getByRole("button", { name: "Create company" }).click()
    const trainersToday = page.locator("p").filter({ hasText: "Trainers today:" })
    const trainerForm = page.locator("form[data-saved-current-trainer-count]")
    await expect(trainersToday).toHaveText(/Trainers today:\s*Not set/)
    await expect(trainerForm).toHaveAttribute("data-saved-current-trainer-count", "")

    await page.getByLabel("Current trainer count", { exact: true }).fill("4")
    await page.getByRole("button", { name: "Save trainer count", exact: true }).click()
    await expect(
      page.getByRole("alert").filter({ hasText: "Save current DJ count first." }),
    ).toBeVisible()
    await expect(trainersToday).toHaveText(/Trainers today:\s*Not set/)

    await page.getByLabel("Current DJ count", { exact: true }).fill("3")
    await page.getByRole("button", { name: "Save DJ count", exact: true }).click()
    const teamTodayForm = page.locator("form[data-saved-current-dj-count]")
    await expect(teamTodayForm).toHaveAttribute("data-saved-current-dj-count", "3")

    await page.getByLabel("Current trainer count", { exact: true }).fill("0")
    await page.getByRole("button", { name: "Save trainer count", exact: true }).click()
    await expect(trainersToday).toHaveText(/Trainers today:\s*0$/)
    await expect(trainersToday).not.toContainText("Not set")
    await expect(trainerForm).toHaveAttribute("data-saved-current-trainer-count", "0")
    await expect(page.getByLabel("Current trainer count", { exact: true })).toHaveValue("0")

    await page.reload()
    await expect(trainersToday).toHaveText(/Trainers today:\s*0$/)
    await expect(trainerForm).toHaveAttribute("data-saved-current-trainer-count", "0")
    await expect(page.getByLabel("Current trainer count", { exact: true })).toHaveValue("0")
  })
})
