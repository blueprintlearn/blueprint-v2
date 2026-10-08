import { expect, test, type Page } from "@playwright/test"

const password = "blueprint-local-password"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

test.describe("tenant isolation in the browser", () => {
  test("signed-out home does not show tenant records", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Blueprint" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible()
    await expect(page.getByText("Company A")).toHaveCount(0)
    await expect(page.getByText("Company B")).toHaveCount(0)
  })

  test("Company A owner sees A and not B", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await expect(page.getByText("Company:")).toBeVisible()
    await expect(page.locator("strong").filter({ hasText: "Company A" })).toBeVisible()
    await expect(page.locator("strong").filter({ hasText: "owner_admin" })).toBeVisible()
    await expect(page.getByText("Company B")).toHaveCount(0)
  })

  test("sign out hides tenant records", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Company A")).toHaveCount(0)
    await expect(page.getByText("Company B")).toHaveCount(0)
  })

  test("Company B owner sees B and not A", async ({ page }) => {
    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByText("Company:")).toBeVisible()
    await expect(page.locator("strong").filter({ hasText: "Company B" })).toBeVisible()
    await expect(page.locator("strong").filter({ hasText: "owner_admin" })).toBeVisible()
    await expect(page.getByText("Company A")).toHaveCount(0)
  })
})
