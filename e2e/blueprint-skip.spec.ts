import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

async function signIn(page: Page, email: string, password = OWNER_C_PASSWORD) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const row = (page: Page, name: string) =>
  page.locator("ol li").filter({ has: page.getByText(name, { exact: true }) })

test.describe("skip workflow on an empty local company", () => {
  test.beforeAll(() => {
    ensureEmptyGuidedCompany()
  })

  test("owner C can skip G1, move on, resume past the skip, then complete later", async ({ page }) => {
    await signIn(page, OWNER_C_EMAIL)
    await page.goto("/blueprint/goals")

    await page.getByRole("button", { name: "I’m not sure" }).click()
    await expect(page.getByRole("region", { name: "Help with: What do you want Blueprint to help you do?" })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/slice3_g1_not_sure_panel.png`, fullPage: true })
    await page.getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(
      page.getByText("You skipped this for now. When you’re ready, choose your goals above and press Save goals."),
    ).toBeVisible()
    await expect(page.getByRole("region", { name: /Help with:/ })).toHaveCount(0)
    await expect(page.locator("#q-G1").getByRole("button", { name: "I’m not sure" })).toBeVisible()
    await expect(page.locator("div:has(> h1) > .bp-status")).toHaveText("Needs attention")
    await expect(page.locator("#blueprint-next")).toBeFocused()
    await page.screenshot({ path: `${SHOTS}/slice3_g1_skipped.png`, fullPage: true })

    await page.getByRole("link", { name: "Next: Your team today" }).click()
    await expect(page).toHaveURL(/\/blueprint\/team/)
    await page.locator("#q-T1").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-T1").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await page.getByLabel(/only as assistants/).fill("2")
    await page.getByRole("radio", { name: "No", exact: true }).check()
    await page.getByRole("button", { name: "Save your team today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint")
    await expect(page.getByText("0 of 8 sections complete · 2 started")).toBeVisible()
    await expect(row(page, "Your goals").getByText("Needs attention")).toBeVisible()
    await expect(row(page, "Your goals").getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/goals#q-G1",
    )
    await row(page, "Your goals").getByRole("link", { name: "1 skipped" }).click()
    await expect(page).toHaveURL(/\/blueprint\/goals#q-G1/)
    await expect(page.locator("#q-G1").getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(row(page, "Your team today").getByText("Needs attention")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/slice3_overview_needs_attention_skipped.png`, fullPage: true })

    await page.goto("/")
    const blueprint = page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "Your Company Blueprint" }) })
    await expect(page.getByText("Pick up where you left off. These answers shape what Blueprint recommends.")).toBeVisible()
    await expect(blueprint.getByRole("link", { name: "Continue your Blueprint" })).toHaveAttribute(
      "href",
      "/blueprint/team#q-T4",
    )
    await page.screenshot({ path: `${SHOTS}/slice3_owner_home_continue.png`, fullPage: true })
    await blueprint.getByRole("link", { name: "Continue your Blueprint" }).click()
    await expect(page).toHaveURL(/\/blueprint\/team/)

    await page.getByRole("checkbox", { name: "A manager" }).check()
    await page.getByRole("checkbox", { name: "Finding good candidates" }).check()
    await expect(page.getByRole("checkbox", { name: "A manager" })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: "Finding good candidates" })).toBeChecked()
    await page.getByRole("button", { name: "Save how your team runs" }).click()
    await expect(page.locator("form[data-card='runs'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='runs']")).toHaveAttribute("data-saved-t4", "manager")
    await expect(page.locator("form[data-card='runs']")).toHaveAttribute("data-saved-t5", "finding_candidates")
    await page.getByLabel(/DJs would you like|Earlier you said/).fill("5")
    await page.getByRole("button", { name: "Save the team you want" }).click()
    await expect(page.locator("form[data-card='wanted'] .bp-save")).toHaveText("Saved")

    await page.goto("/")
    await expect(blueprint.getByRole("link", { name: "Continue your Blueprint" })).toHaveAttribute(
      "href",
      "/blueprint/events#q-E1",
    )
    await page.goto("/blueprint")
    await expect(page.getByRole("heading", { level: 1, name: "Your Company Blueprint" })).toBeVisible()

    await row(page, "Your goals").getByRole("link", { name: "Your goals" }).click()
    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("button", { name: "Save goals", exact: true }).click()
    await expect(page.locator("form[data-saved-company-goals] .bp-save")).toHaveText("Saved")
    await expect(page.locator("div:has(> h1) > .bp-status")).toHaveText("Complete")

    await page.locator(".bp-more-detail > summary").click()
    const timeframe = page.getByRole("radio", { name: "No set date" })
    await timeframe.check()
    await expect(timeframe).toBeChecked()
    const radioLook = await timeframe.evaluate((el) => {
      const style = getComputedStyle(el)
      const dot = getComputedStyle(el, "::before")
      return { fill: style.backgroundColor, dot: dot.backgroundColor, dotWidth: dot.width }
    })
    expect(radioLook.fill).not.toBe("rgba(0, 0, 0, 0)")
    expect(radioLook.dot).not.toBe("rgba(0, 0, 0, 0)")
    expect(parseFloat(radioLook.dotWidth)).toBeGreaterThan(0)
    await page.screenshot({ path: `${SHOTS}/slice3_g3_timeframe.png`, fullPage: true })
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect(page.locator("form[data-saved-g3] .bp-save")).toHaveText("Saved")
    await expect(page.locator("div:has(> h1) > .bp-status")).toHaveText("Complete")

    await page.goto("/blueprint")
    await expect(page.getByText("1 of 8 sections complete · 1 started")).toBeVisible()
    await expect(row(page, "Your goals").getByText("Complete")).toBeVisible()
    await expect(row(page, "Your team today").getByText("Needs attention")).toBeVisible()
    await expect(row(page, "Your team today").getByText("1 skipped")).toBeVisible()
  })

  test("G2 guidance has no Skip, and keyboard opens and closes the panel", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL)
    await page.goto("/blueprint/goals")
    await page.getByRole("checkbox", { name: /Scale/ }).check()
    await page.getByRole("checkbox", { name: /Expand/ }).check()
    const g2Help = page.locator("#q-G2").getByRole("button", { name: "I’m not sure" })
    await g2Help.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("region", { name: "Help with: Which one matters most right now?" })).toBeVisible()
    await expect(
      page.getByRole("region", { name: "Help with: Which one matters most right now?" }).getByText(
        "When your goals pull in different directions, Blueprint follows your main goal first.",
      ),
    ).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/slice3_g2_not_sure_panel.png`, fullPage: true })
    await expect(page.locator("#q-G2").getByRole("button", { name: /Skip for now/ })).toHaveCount(0)
    await page.locator("#q-G2").getByRole("button", { name: "Hide help" }).press("Enter")
    await expect(page.getByRole("region", { name: "Help with: Which one matters most right now?" })).toHaveCount(0)
  })
})
