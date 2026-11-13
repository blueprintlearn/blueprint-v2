import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })
const password = "blueprint-local-password"

async function signIn(page: Page, email: string, pwd = password) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(pwd)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")

test.describe("How you develop DJs", () => {
  test("saves training today, resources, and goals, including a solo operator with no process", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/development")
    await expect(page.getByRole("heading", { level: 1, name: "How you develop DJs" })).toBeVisible()
    await expect(
      page.getByText(
        "Now how you develop DJs: how people join, how they learn, and what you want Blueprint to improve. This is intake only — no training plan yet.",
      ),
    ).toBeVisible()

    await page.getByRole("radio", { name: "I haven’t recruited anyone yet" }).check()
    await page.locator("#q-D2").getByRole("checkbox", { name: "Shadow experienced DJs" }).check()
    await page.locator("#q-D2").getByRole("checkbox", { name: "No formal training process" }).check()
    await expect(page.locator("#q-D2").getByRole("checkbox", { name: "Shadow experienced DJs" })).not.toBeChecked()
    await expect(page.locator("#q-D2").getByRole("checkbox", { name: "No formal training process" })).toBeChecked()
    await page.getByRole("radio", { name: "Nobody yet" }).check()
    await page.locator("#q-D4").getByRole("checkbox", { name: "No defined process yet" }).check()
    await page.getByRole("button", { name: "Save your training today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-d1", "not_yet")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-d2", "no_formal")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-d3", "nobody")
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-d4", "no_process")
    await expect(sectionStatus(page)).toHaveText("Needs attention")
    await page.screenshot({ path: `${SHOTS}/slice8_development_today_none.png`, fullPage: true })

    await page.locator("#q-D5").getByRole("checkbox", { name: "Nothing documented yet" }).check()
    await page.getByRole("radio", { name: "Limited or no equipment access" }).check()
    await page.locator("#q-D7").getByRole("checkbox", { name: "No regular opportunities yet" }).check()
    await page.getByRole("button", { name: "Save your training resources" }).click()
    await expect(page.locator("form[data-card='resources'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='resources']")).toHaveAttribute("data-saved-d5", "nothing")
    await expect(page.locator("form[data-card='resources']")).toHaveAttribute("data-saved-d6", "limited")
    await expect(page.locator("form[data-card='resources']")).toHaveAttribute("data-saved-d7", "no_opportunities")

    await page.locator("#q-D8").getByRole("checkbox", { name: "Finding time to train" }).check()
    await page.locator("#q-D8").getByRole("checkbox", { name: "Knowing when someone is ready" }).check()
    await page.locator("#q-D8").getByRole("checkbox", { name: "Creating training materials" }).check()
    await page.locator("#q-D8").getByRole("checkbox", { name: "Keeping trainees engaged" }).click()
    await expect(page.locator("#q-D8").getByRole("checkbox", { name: "Finding time to train" })).toBeChecked()
    await expect(page.locator("#q-D8").getByRole("checkbox", { name: "Knowing when someone is ready" })).toBeChecked()
    await expect(page.locator("#q-D8").getByRole("checkbox", { name: "Creating training materials" })).toBeChecked()
    await expect(page.locator("#q-D8").getByRole("checkbox", { name: "Keeping trainees engaged" })).not.toBeChecked()
    await page.locator("#q-D9").getByRole("checkbox", { name: "Make training more organized" }).check()
    await page.locator("#q-D9").getByRole("checkbox", { name: "Reduce owner involvement" }).check()
    await page.getByRole("radio", { name: "1–2 hours per week" }).check()
    await page.getByRole("button", { name: "Save your development goals" }).click()
    await expect(page.locator("form[data-card='goals'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='goals']")).toHaveAttribute("data-saved-d8", "time,readiness,materials")
    await expect(page.locator("form[data-card='goals']")).toHaveAttribute("data-saved-d9", "less_owner,organized")
    await expect(page.locator("form[data-card='goals']")).toHaveAttribute("data-saved-d10", "one_to_two")
    await expect(sectionStatus(page)).toHaveText("Complete")
  })

  test("editing a saved process to none keeps the exclusive answer", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/development")
    await page.getByRole("radio", { name: "A mix" }).check()
    await page.locator("#q-D2").getByRole("checkbox", { name: "Shadow experienced DJs" }).check()
    await page.locator("#q-D2").getByRole("checkbox", { name: "Assist at events" }).check()
    await page.getByRole("radio", { name: "Owner" }).check()
    await page.locator("#q-D4").getByRole("checkbox", { name: "Successfully assist at events" }).check()
    await page.getByRole("button", { name: "Save your training today" }).click()
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-d2", "shadow,assist")

    await page.locator("#q-D2").getByRole("checkbox", { name: "No formal training process" }).check()
    await expect(page.locator("#q-D2").getByRole("checkbox", { name: "Shadow experienced DJs" })).not.toBeChecked()
    await page.locator("#q-D8").getByRole("checkbox", { name: "Finding time to train" }).check()
    await page.locator("#q-D8").getByRole("checkbox", { name: "No major challenge yet" }).check()
    await expect(page.locator("#q-D8").getByRole("checkbox", { name: "Finding time to train" })).not.toBeChecked()
    await page.getByRole("button", { name: "Save your training today" }).click()
    await expect(page.locator("form[data-card='today']")).toHaveAttribute("data-saved-d2", "no_formal")
    await page.getByRole("button", { name: "Save your development goals" }).click()
    await expect(page.locator("form[data-card='goals']")).toHaveAttribute("data-saved-d8", "no_major")
  })

  test("skips a later question and resumes to it from Needs attention", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/development")
    await page.getByRole("radio", { name: "A mix" }).check()
    await page.getByRole("button", { name: "Save your training today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
    await page.locator("#q-D5").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-D5").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-D5").getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.locator("ol li").filter({ hasText: "How you develop DJs" }).getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/development#q-D5",
    )
    await page.locator("ol li").filter({ hasText: "How you develop DJs" }).getByRole("link", { name: "1 skipped" }).click()
    await expect(page).toHaveURL(/\/blueprint\/development#q-D5/)
    await expect(page.locator("#q-D5").getByText("You skipped this for now.")).toBeVisible()
  })
})
