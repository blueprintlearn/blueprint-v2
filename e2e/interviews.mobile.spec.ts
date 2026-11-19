import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

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

test.describe("Video interview on a phone", () => {
  test("applicant recorder fits the viewport", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruiting/interview/preview")
    await expect(page.getByRole("heading", { level: 1, name: "Video interview" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Start recording" })).toBeVisible()
    const recorder = page.locator("[data-interview-recorder]")
    const box = await recorder.boundingBox()
    expect(box).not.toBeNull()
    expect((box?.width ?? 0) <= 430).toBe(true)
  })
})
