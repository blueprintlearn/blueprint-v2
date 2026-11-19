import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

async function signIn(page: Page, email = OWNER_C_EMAIL, password = OWNER_C_PASSWORD) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

test.describe("Training library", () => {
  test("platform admin manages private and starter master courses", async ({ page }) => {
    await signIn(page, "platform-admin@blueprint.test")
    await page.goto("/training-admin")
    await expect(page.getByRole("heading", { name: "Blueprint course library" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Legacy Beatmixing (import)" })).toBeVisible()
    await expect(page.getByRole("link", { name: "MC Foundations" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Old Photo Booth" })).toBeVisible()
    await expect(page.locator("[data-master-visibility=private]")).toContainText("Private")
    await expect(page.locator("[data-master-visibility=starter]")).toContainText("Starter Library")
    await page.screenshot({ path: `${SHOTS}/stage41-master-library.png`, fullPage: true })
    await page.getByRole("link", { name: "MC Foundations" }).click()
    await expect(page.getByRole("heading", { name: "MC Foundations" })).toBeVisible()
    await expect(page.getByLabel("Library visibility")).toHaveValue("starter")
  })

  test("owner adopts a starter course, edits independently, and organizes a path", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/training-admin")
    await expect(page.getByRole("heading", { name: "Blueprint course library" })).toHaveCount(0)

    await page.goto("/blueprint/training")
    await expect(page.getByRole("heading", { name: "Training library" })).toBeVisible()
    await expect(page.getByText("Trainee enrollment is not enabled yet")).toBeVisible()
    await expect(page.getByText("Legacy Beatmixing (import)")).toHaveCount(0)
    await expect(page.getByText("Old Photo Booth")).toHaveCount(0)
    await expect(page.locator("[data-training-starter=catalog]").getByText("MC Foundations")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage41-company-library.png`, fullPage: true })

    await page.locator("[data-training-starter=catalog]").getByRole("button", { name: "Add to my library" }).click()
    await expect(page.locator("[data-training-section=courses]").getByRole("link", { name: "MC Foundations" })).toBeVisible()
    await page.locator("[data-training-section=courses]").getByRole("link", { name: "MC Foundations" }).click()
    await expect(page.getByRole("heading", { name: "MC Foundations" })).toBeVisible()
    await page.getByLabel("Course title").fill("Our MC Foundations")
    await page.getByRole("button", { name: "Save draft" }).click()
    await expect(page.getByRole("heading", { name: "Our MC Foundations" })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage41-course-editor.png`, fullPage: true })

    await page.getByRole("button", { name: "Add lesson" }).click()
    await page.getByRole("link", { name: /New lesson/ }).click()
    await expect(page.getByLabel("Lesson title")).toBeVisible()
    await page.getByLabel("Lesson title").fill("House welcome")
    await page.getByRole("button", { name: "Save lesson" }).click()
    await expect(page.getByRole("heading", { name: "House welcome" })).toBeVisible()
    await page.getByRole("button", { name: "Add block" }).click()
    await expect(page.locator("[data-content-block=text]")).toBeVisible()
    await page.getByLabel("Text").fill("Welcome guests the way this company does it.")
    await page.getByRole("button", { name: "Save lesson" }).click()
    await expect(page.getByLabel("Text")).toHaveValue("Welcome guests the way this company does it.")
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: `${SHOTS}/stage41-lesson-editor.png`, fullPage: true })

    await page.getByRole("link", { name: "Back to course" }).click()
    await expect(page.getByRole("heading", { name: "Our MC Foundations" })).toBeVisible()
    await page.getByRole("link", { name: "Back to training library" }).click()
    await expect(page.getByRole("heading", { name: "Training library" })).toBeVisible()
    await expect(page.locator("[data-training-section=courses]").getByRole("link", { name: "Our MC Foundations" })).toBeVisible()
    await expect(page.locator("[data-training-starter=catalog]").getByText("MC Foundations")).toBeVisible()
    await page.getByLabel("New path title").fill("Wedding DJ beginner")
    await page.getByRole("button", { name: "Create a path" }).click()
    await page.locator("[data-training-paths=list]").getByRole("link", { name: "Wedding DJ beginner" }).click()
    await expect(page.getByLabel("Path title")).toHaveValue("Wedding DJ beginner")
    await page.getByLabel("Add a course from your library").selectOption({ label: "Our MC Foundations" })
    await page.getByRole("button", { name: "Add course to path" }).click()
    await expect(page.getByText("Our MC Foundations")).toBeVisible()
    await page.getByLabel("Intended role").fill("Wedding DJ")
    await page.locator('form[data-training-form="path-editor"]').getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator("[data-path-role]")).toHaveAttribute("data-path-role", "Wedding DJ")
    await page.getByRole("checkbox", { name: /reviewed this path/ }).check()
    await expect(page.getByRole("checkbox", { name: /reviewed this path/ })).toBeChecked()
    await page.locator('form[data-training-form="publish-path"]').getByRole("button", { name: "Publish version" }).click()
    await expect(page.locator("[data-path-status]")).toHaveAttribute("data-path-status", "published")
    await page.screenshot({ path: `${SHOTS}/stage41-training-paths.png`, fullPage: true })

    await page.goto("/blueprint/training")
    await expect(page.getByText("Trainee enrollment is not enabled yet")).toBeVisible()
    await expect(page.getByRole("button", { name: "Prepare for Training" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Invite trainee" })).toHaveCount(0)
  })
})
