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

test.describe("owner goal in the browser", () => {
  test("Company A owner can save a goal that Company B cannot see", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/goals")
    await expect(page.getByRole("heading", { level: 1, name: "Your goal" })).toBeVisible()
    const ownerGoalForm = page.locator("form[data-saved-owner-goal]")
    const savedBefore = (await ownerGoalForm.getAttribute("data-saved-owner-goal")) ?? ""

    await page.getByLabel("Owner goal").selectOption("other")
    await page.getByLabel("Other goal").fill("")
    await page.getByRole("button", { name: "Save owner goal", exact: true }).click()
    const otherError = ownerGoalForm.getByRole("alert")
    await expect(otherError).toHaveText("Add a few words about your goal.")
    await expect(page.getByLabel("Other goal")).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByLabel("Owner goal")).not.toHaveAttribute("aria-invalid", "true")
    const otherBox = (await page.getByLabel("Other goal").boundingBox())!
    expect((await otherError.boundingBox())!.y).toBeGreaterThan(otherBox.y)
    await expect(page.getByLabel("Owner goal")).toHaveValue("other")
    await expect(ownerGoalForm.getByRole("status")).not.toHaveText("Saved")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal", savedBefore)

    await page.getByLabel("Other goal").fill(uniqueOtherGoal)
    await page.getByRole("button", { name: "Save owner goal", exact: true }).click()
    await expect(ownerGoalForm.getByRole("status")).toHaveText("Saved")
    await expect(ownerGoalForm.getByRole("alert")).toHaveCount(0)
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal", "other")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal-other", uniqueOtherGoal)
    await expect(page.getByLabel("Owner goal")).toHaveValue("other")
    await expect(page.getByLabel("Other goal")).toHaveValue(uniqueOtherGoal)
    await expect(page.getByText(/\bCompany B\b/)).toHaveCount(0)
    await expect(sectionStatus(page)).toHaveText("Done")

    await page.goto("/blueprint")
    await expect(page.getByText(/\d of 8 sections done/)).toBeVisible()
    await expect(page.locator("ol li").filter({ has: page.getByText("Your goal", { exact: true }) }).getByText("Done")).toBeVisible()
    await page.goto("/")
    await expect(page.getByText(uniqueOtherGoal)).toBeVisible()
    await expect(page.locator("form[data-saved-owner-goal]")).toHaveCount(0)
    await page.goto("/blueprint/goals")

    await page.reload()
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal", "other")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal-other", uniqueOtherGoal)
    await expect(page.getByLabel("Owner goal")).toHaveValue("other")
    await expect(page.getByLabel("Other goal")).toHaveValue(uniqueOtherGoal)

    await page.getByLabel("Owner goal").selectOption("scale")
    await expect(page.getByLabel("Owner goal")).toHaveValue("scale")
    await expect(page.getByLabel("Other goal")).toHaveCount(0)
    await page.getByRole("button", { name: "Save owner goal", exact: true }).click()
    await expect(ownerGoalForm.getByRole("status")).toHaveText("Saved")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal", "scale")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal-other", "")
    await expect(page.getByLabel("Owner goal")).toHaveValue("scale")
    await expect(page.getByLabel("Other goal")).toHaveCount(0)
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)

    await page.reload()
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal", "scale")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal-other", "")
    await expect(page.getByLabel("Owner goal")).toHaveValue("scale")
    await expect(page.getByLabel("Other goal")).toHaveCount(0)

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Your goal" })).toHaveCount(0)

    await signIn(page, "owner-b@blueprint.test")
    await expect(page.getByRole("heading", { level: 2, name: "Your goal" })).toBeVisible()
    await expect(page.getByText(uniqueOtherGoal)).toHaveCount(0)
    const companyBForm = page.locator("form[data-saved-owner-goal]")
    await expect(companyBForm).not.toHaveAttribute("data-saved-owner-goal-other", uniqueOtherGoal)
    const companyBOther = page.getByLabel("Other goal")
    expect((await companyBOther.count()) === 0 || (await companyBOther.inputValue()) !== uniqueOtherGoal).toBe(true)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })

  test("a failed save keeps the chosen goal and the Other text", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    await page.goto("/blueprint/goals")
    await expect(page.getByRole("heading", { level: 1, name: "Your goal" })).toBeVisible()
    const ownerGoalForm = page.locator("form[data-saved-owner-goal]")
    const savedGoal = (await ownerGoalForm.getAttribute("data-saved-owner-goal")) ?? ""
    const savedOther = (await ownerGoalForm.getAttribute("data-saved-owner-goal-other")) ?? ""
    const tooLong = "x".repeat(81)

    await page.getByLabel("Owner goal").selectOption("other")
    // maxLength stops typing past 80, so the over-long value is set the way a script or paste would.
    await page.getByLabel("Other goal").evaluate((el, value) => {
      const input = el as HTMLInputElement
      input.removeAttribute("maxlength")
      input.value = value
    }, tooLong)
    await page.getByRole("button", { name: "Save owner goal", exact: true }).click()
    await expect(ownerGoalForm.getByRole("alert")).toHaveText("Choose a goal from the list.")
    await expect(page.getByLabel("Owner goal")).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByLabel("Owner goal")).toHaveValue("other")
    await expect(page.getByLabel("Other goal")).toHaveValue(tooLong)
    await expect(ownerGoalForm.getByRole("status")).not.toHaveText("Saved")
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal", savedGoal)
    await expect(ownerGoalForm).toHaveAttribute("data-saved-owner-goal-other", savedOther)
  })
})
