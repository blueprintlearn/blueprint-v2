import { expect, test, type Page } from "@playwright/test"

const password = "blueprint-local-password"
const uniqueOtherGoal = "Synthetic A-only goal"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")
const goalsForm = (page: Page) => page.locator("form[data-saved-company-goals]")

test.describe("owner goals in the browser", () => {
  test("Company A owner can save several goals that Company B cannot see", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/goals")
    await expect(page.getByRole("heading", { level: 1, name: "Your goals" })).toBeVisible()

    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("checkbox", { name: /Expand/ }).check()
    await page.getByRole("checkbox", { name: /^Other/ }).check()
    await expect(page.getByLabel("Which one matters most right now?")).toBeVisible()
    await page.getByLabel("Which one matters most right now?").selectOption("scale")
    await page.getByLabel("Other goal").fill(uniqueOtherGoal)
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(goalsForm(page).locator(".bp-save")).toHaveText("Saved")
    await expect(goalsForm(page)).toHaveAttribute("data-saved-primary", "scale")
    await expect(goalsForm(page)).toHaveAttribute("data-saved-other-text", uniqueOtherGoal)
    await expect(sectionStatus(page)).toHaveText("Done")

    await page.reload()
    await expect(page.getByRole("checkbox", { name: /Scale/ })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: /Expand/ })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: /^Other/ })).toBeChecked()
    await expect(page.getByLabel("Which one matters most right now?")).toHaveValue("scale")
    await expect(page.getByLabel("Other goal")).toHaveValue(uniqueOtherGoal)

    await page.getByRole("checkbox", { name: /Scale/ }).uncheck()
    await expect(page.getByLabel("Which one matters most right now?")).toHaveValue("")
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(goalsForm(page).getByRole("alert")).toHaveText("Choose which goal matters most.")
    await page.getByLabel("Which one matters most right now?").selectOption("expand")
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(goalsForm(page).locator(".bp-save")).toHaveText("Saved")
    await expect(goalsForm(page)).toHaveAttribute("data-saved-primary", "expand")

    await page.goto("/")
    await expect(page.getByRole("heading", { level: 2, name: "Your goals" })).toBeVisible()
    await expect(page.locator(".bp-fact").filter({ hasText: "Main goal" }).getByText("Expand")).toBeVisible()
    await expect(page.getByText(/Also:/)).toBeVisible()
    await expect(page.getByText(uniqueOtherGoal)).toBeVisible()

    await page.goto("/blueprint")
    await expect(page.locator("ol li").filter({ has: page.getByText("Your goals", { exact: true }) }).getByText("Done")).toBeVisible()

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByRole("heading", { level: 2, name: "Your goal" })).toBeVisible()
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)
    await expect(page.locator("form[data-saved-owner-goal]")).toHaveCount(1)
    await expect(page.getByText("Also:")).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })

  test("unchecking everything asks for at least one goal, and DJ less excludes Stop DJing", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/goals")

    for (const box of await page.getByRole("checkbox").all()) {
      if (await box.isChecked()) await box.uncheck()
    }
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(goalsForm(page).getByRole("alert")).toHaveText("Choose at least one goal.")

    await page.getByRole("checkbox", { name: /DJ less/ }).check()
    await page.getByRole("checkbox", { name: /Stop DJing/ }).check()
    await expect(page.getByRole("checkbox", { name: /DJ less/ })).not.toBeChecked()
    await expect(page.getByRole("checkbox", { name: /Stop DJing/ })).toBeChecked()
    await expect(page.getByRole("status").filter({ hasText: "Stop DJing includes DJing less." })).toBeVisible()
  })

  test("a failed Other save keeps the typed words", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/goals")
    const savedGoals = (await goalsForm(page).getAttribute("data-saved-company-goals")) ?? ""
    const savedOther = (await goalsForm(page).getAttribute("data-saved-other-text")) ?? ""

    await page.getByRole("checkbox", { name: /^Other/ }).check()
    const tooLong = "x".repeat(81)
    await page.getByLabel("Other goal").evaluate((el, value) => {
      const input = el as HTMLInputElement
      input.removeAttribute("maxlength")
      input.value = value
    }, tooLong)
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(page.getByLabel("Other goal")).toHaveValue(tooLong)
    await expect(goalsForm(page).locator(".bp-save")).not.toHaveText("Saved")
    await expect(goalsForm(page)).toHaveAttribute("data-saved-company-goals", savedGoals)
    await expect(goalsForm(page)).toHaveAttribute("data-saved-other-text", savedOther)
  })
})

test.describe("manager and switch-off isolation", () => {
  test("Manager A sees only the primary goal and no Also line", async ({ page }) => {
    await signIn(page, "manager-a@blueprint.test")
    await expect(page.getByRole("heading", { level: 2, name: "Company goal" })).toBeVisible()
    await expect(page.getByText("Also:")).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 2, name: "Your goals" })).toHaveCount(0)
    await expect(page.locator("form[data-saved-company-goals]")).toHaveCount(0)
    await expect(page.getByRole("checkbox")).toHaveCount(0)
  })
})
