import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })

async function signIn(page: Page) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(OWNER_C_EMAIL)
  await page.getByLabel("Password").fill(OWNER_C_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")

test.describe("Your Blueprint", () => {
  test("summarizes saved answers, describes future help, and records an approval", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/events")
    await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
    await page.locator('#q-E2 input[name="e2"]').fill("80")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/review")
    await expect(page.getByRole("heading", { level: 1, name: "Your Blueprint" })).toBeVisible()
    await expect(page.getByText("Section 8 of 8")).toBeVisible()
    await expect(
      page.getByText(
        "Here is your Company Blueprint as you described it. Check it, change anything that looks off, then approve it for now. This is a summary, not a set of recommendations.",
      ),
    ).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Your business snapshot" })).toBeVisible()
    await expect(page.locator("[data-snapshot-key='E1'] .bp-fact__value")).toHaveText("Weddings")
    await expect(page.locator("[data-snapshot-key='E2'] .bp-fact__value")).toHaveText("80")
    await expect(page.locator("[data-snapshot-key='G1'] .bp-fact__value")).toHaveText("Not answered yet")
    await expect(page.locator("[data-snapshot-key='D1'] .bp-fact__value")).toHaveText("Not answered yet")
    await expect(page.getByRole("link", { name: "Edit Your goals" })).toHaveAttribute("href", "/blueprint/goals")
    await expect(page.getByRole("link", { name: "Edit Your numbers" })).toHaveAttribute("href", "/blueprint/numbers")
    await expect(page.getByText("These numbers stay private to you.")).toBeVisible()
    await expect(page.getByText(/wedding|can_teach|yes_personality/)).toHaveCount(0)

    await expect(page.getByRole("heading", { level: 2, name: "Your next direction" })).toBeVisible()
    await expect(page.getByText("Recruiting DJs who fit the company")).toBeVisible()
    await expect(page.getByText("Training new and existing DJs")).toBeVisible()
    await expect(page.getByText("Building a repeatable path toward independent event work")).toBeVisible()
    await expect(
      page.getByText(/readiness|training plan|we recommend|Blueprint has evaluated|priority for you/i),
    ).toHaveCount(0)
    await expect(page.getByText("Those are not available yet, and nothing here is a personalized recommendation.")).toBeVisible()

    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")
    await expect(sectionStatus(page)).toHaveText("Complete")
    await page.screenshot({ path: `${SHOTS}/slice10_review_approved.png`, fullPage: true })

    await page.goto("/blueprint/events")
    await page.locator('#q-E2 input[name="e2"]').fill("90")
    await page.getByRole("button", { name: "Save your events today" }).click()
    await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

    await page.goto("/blueprint/review")
    await expect(page.locator("[data-snapshot-key='E2'] .bp-fact__value")).toHaveText("90")
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "")
    await expect(sectionStatus(page)).toHaveText("Needs attention")
    await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
    await page.getByRole("button", { name: "Save your approval" }).click()
    await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")
    await expect(sectionStatus(page)).toHaveText("Complete")
  })

  test("skips approval and resumes to R1 from Needs attention", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/review")
    await page.locator("#q-R1").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-R1").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-R1").getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.locator("ol li").filter({ hasText: "Your Blueprint" }).getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/review#q-R1",
    )
    await page.locator("ol li").filter({ hasText: "Your Blueprint" }).getByRole("link", { name: "1 skipped" }).click()
    await expect(page).toHaveURL(/\/blueprint\/review#q-R1/)
    await expect(page.locator("#q-R1").getByText("You skipped this for now.")).toBeVisible()
  })
})
