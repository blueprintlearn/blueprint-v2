import { expect, test, type Locator, type Page } from "@playwright/test"

const password = "blueprint-local-password"

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

/** sm buttons are 38px visually and reach 44px through their ::after hit area. */
async function hitTargetHeight(button: Locator) {
  return button.evaluate((el) => {
    const after = getComputedStyle(el, "::after")
    return Math.max(el.getBoundingClientRect().height, after.content === "none" ? 0 : parseFloat(after.height) || 0)
  })
}

test.describe("owner home on a phone", () => {
  test("Company A owner home fits the screen with the cards stacked", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")

    await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible()
    await expect(page.locator("main").getByText("Company A", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Team today" })).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    const teamToday = await page.getByRole("heading", { level: 2, name: "Team today" }).boundingBox()
    const ownerGoal = await page.getByRole("heading", { level: 2, name: "Your goal" }).boundingBox()
    expect(teamToday && ownerGoal).toBeTruthy()
    expect(ownerGoal!.y).toBeGreaterThan(teamToday!.y)
    expect(Math.abs(ownerGoal!.x - teamToday!.x)).toBeLessThan(2)

    const current = await page.getByLabel("Current DJ count", { exact: true }).boundingBox()
    const desired = await page.getByLabel("Desired DJ count").boundingBox()
    expect(current!.height).toBeGreaterThanOrEqual(44)
    expect(desired!.y).toBeGreaterThan(current!.y)

    const viewportWidth = page.viewportSize()!.width
    for (const name of ["Save DJ count", "Save desired DJ count", "Save owner goal", "Sign out"]) {
      const button = page.getByRole("button", { name, exact: true })
      await button.scrollIntoViewIfNeeded()
      await expect(button).toBeVisible()
      const box = (await button.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth)
      expect(await hitTargetHeight(button)).toBeGreaterThanOrEqual(44)
    }
    await expect(page.locator("header.bp-nav").getByRole("button", { name: "Sign out" })).toBeVisible()

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
  })
})
