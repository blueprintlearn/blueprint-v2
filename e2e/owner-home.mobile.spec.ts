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
  test("Company A owner home (switch on) fits the screen with the cards stacked", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")

    await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible()
    await expect(page.locator("main").getByText("Company A", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Team today" })).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    const teamToday = await page.getByRole("heading", { level: 2, name: "Team today" }).boundingBox()
    const ownerGoal = await page.getByRole("heading", { level: 2, name: "Your goals" }).boundingBox()
    expect(teamToday && ownerGoal).toBeTruthy()
    expect(ownerGoal!.y).toBeGreaterThan(teamToday!.y)
    expect(Math.abs(ownerGoal!.x - teamToday!.x)).toBeLessThan(2)

    const viewportWidth = page.viewportSize()!.width
    const blueprintCard = await page.getByRole("heading", { level: 2, name: "Your Company Blueprint" }).boundingBox()
    expect(blueprintCard!.y).toBeLessThan(teamToday!.y)

    const links = page.getByRole("link", { name: /^(Start|Continue|Review) your Blueprint|^Edit in your Blueprint/ })
    expect(await links.count()).toBe(3)
    for (const target of [...(await links.all()), page.getByRole("button", { name: "Sign out", exact: true })]) {
      await target.scrollIntoViewIfNeeded()
      await expect(target).toBeVisible()
      const box = (await target.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth)
      expect(await hitTargetHeight(target)).toBeGreaterThanOrEqual(44)
    }
    await expect(page.locator("header.bp-nav").getByRole("button", { name: "Sign out" })).toBeVisible()

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
  })

  test("Company A owner's Blueprint pages fit the screen and keep the forms usable", async ({ page }) => {
    await signIn(page, "owner-a@blueprint.test")
    const viewportWidth = page.viewportSize()!.width
    const noOverflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

    await page.goto("/blueprint")
    await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toBeVisible()
    await expect(page.locator("ol li")).toHaveCount(8)
    await noOverflow()

    await page.goto("/blueprint/team")
    await expect(page.getByRole("heading", { level: 1, name: "Your team today" })).toBeVisible()
    await noOverflow()
    const current = await page.getByLabel("Current DJ count", { exact: true }).boundingBox()
    const desired = await page.getByLabel("Desired DJ count").boundingBox()
    expect(current!.height).toBeGreaterThanOrEqual(44)
    expect(desired!.y).toBeGreaterThan(current!.y)

    for (const name of ["Save DJ count", "Save desired DJ count"]) {
      const button = page.getByRole("button", { name, exact: true })
      await button.scrollIntoViewIfNeeded()
      const box = (await button.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth)
      expect(await hitTargetHeight(button)).toBeGreaterThanOrEqual(44)
    }
    for (const name of ["Back to your Blueprint", "Previous: Your goals"]) {
      for (const link of await page.getByRole("link", { name, exact: true }).all()) {
        await link.scrollIntoViewIfNeeded()
        expect(await hitTargetHeight(link)).toBeGreaterThanOrEqual(44)
      }
    }

    await page.goto("/blueprint/goals")
    await expect(page.getByRole("heading", { level: 1, name: "Your goals" })).toBeVisible()
    await noOverflow()
    const firstRow = page.locator(".bp-check").first()
    expect((await firstRow.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const save = page.getByRole("button", { name: "Save goals", exact: true })
    await save.scrollIntoViewIfNeeded()
    const saveBox = (await save.boundingBox())!
    expect(saveBox.x + saveBox.width).toBeLessThanOrEqual(viewportWidth)
    expect(await hitTargetHeight(save)).toBeGreaterThanOrEqual(44)
    const next = page.getByRole("link", { name: "Next: Your team today", exact: true })
    await next.scrollIntoViewIfNeeded()
    expect(await hitTargetHeight(next)).toBeGreaterThanOrEqual(44)
  })

  test("Company B owner home (switch off) keeps the forms stacked and usable", async ({ page }) => {
    await signIn(page, "owner-b@blueprint.test")

    await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible()
    await expect(page.locator("main").getByText("Company B", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Team today" })).toBeVisible()
    await expect(page.getByRole("link")).toHaveCount(0)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    const teamToday = await page.getByRole("heading", { level: 2, name: "Team today" }).boundingBox()
    const ownerGoal = await page.getByRole("heading", { level: 2, name: "Your goal" }).boundingBox()
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
  })
})
