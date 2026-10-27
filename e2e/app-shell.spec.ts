import { expect, test, type Page } from "@playwright/test"

const password = "blueprint-local-password"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

test.describe("application shell", () => {
  test("signed-out home keeps one heading and the existing auth links", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Blueprint" })).toHaveCount(1)
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(1)
    await expect(page.getByRole("link", { name: "Sign up" })).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
  })

  test("signed-in home has exactly one Sign out in the shell", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(1)
    await expect(page.getByRole("link", { name: "Blueprint" })).toBeVisible()
    await expect(page.getByText("DJs today:")).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
    await expect(page.getByLabel("Current DJ count", { exact: true })).toBeVisible()
  })
})
