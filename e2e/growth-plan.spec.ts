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

async function approveBlueprint(page: Page) {
  await page.goto("/blueprint/team")
  await page.locator('#q-T1 input[name="t1"]').fill("4")
  await expect(page.locator('#q-T3 input[name="t3"]')).toBeVisible()
  await page.locator('#q-T1b input[name="t1b"]').fill("2")
  await page.getByRole("radio", { name: "Yes, regularly" }).check()
  await page.locator('#q-T3 input[name="t3"]').fill("3")
  await page.getByRole("button", { name: "Save your team today" }).click()
  await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")
  await page.getByLabel(/DJs would you like|Earlier you said/).fill("6")
  await page.getByRole("button", { name: "Save the team you want" }).click()
  await expect(page.locator("form[data-card='wanted'] .bp-save")).toHaveText("Saved")

  await page.goto("/blueprint/events")
  await page.locator("#q-E1").getByRole("checkbox", { name: "Weddings" }).check()
  await page.locator('#q-E2 input[name="e2"]').fill("80")
  await page.getByRole("button", { name: "Save your events today" }).click()
  await expect(page.locator("form[data-card='today'] .bp-save")).toHaveText("Saved")

  await page.goto("/blueprint/review")
  await page.getByRole("radio", { name: "Yes, approve this for now" }).check()
  await page.getByRole("button", { name: "Save your approval" }).click()
  await expect(page.locator("form[data-card='approve']")).toHaveAttribute("data-saved-r1", "approved")
}

async function savePlanning(page: Page, typical = "40", target = "80", baseline = "80") {
  await page.goto("/blueprint/growth")
  await page.locator("#typicalLeadCapacity").fill(typical)
  await page.locator("#targetAnnualBookings").fill(target)
  await page.locator("#expectedBookingsWithoutExpansion").fill(baseline)
  await page.getByRole("radio", { name: "Yes, we can train new DJs" }).check()
  await page.getByRole("button", { name: "Save planning answers" }).click()
  await expect(page.locator("[data-growth-rec]")).toHaveAttribute("data-growth-rec", /demand|utilize|recruit|beginner|experienced|train/)
}

test.describe("Growth plan", () => {
  test("saves a draft, warns on overrides, and requires explicit approval", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)

    await page.goto("/blueprint/growth-plan")
    await expect(page.getByRole("heading", { level: 1, name: "Growth plan" })).toBeVisible()
    await expect(page.locator("[data-growth-plan-gate]")).toHaveAttribute("data-growth-plan-gate", "needs_approval")
    await expect(page.locator("[data-growth-plan-hiring]")).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage23b_growth_plan_needs_approval.png`, fullPage: true })

    await approveBlueprint(page)
    await page.goto("/blueprint/growth-plan")
    await expect(page.locator("[data-growth-plan-hiring]")).toHaveAttribute("data-growth-plan-hiring", "unavailable")
    await savePlanning(page)
    await expect(page.getByRole("link", { name: "Next: Growth plan" })).toHaveAttribute("href", "/blueprint/growth-plan")

    await page.goto("/blueprint/growth-plan")
    await expect(page.locator("[data-growth-plan-gate]")).toHaveAttribute("data-growth-plan-gate", "current")
    await expect(page.locator("[data-growth-plan-hiring]")).toHaveAttribute("data-growth-plan-hiring", "0")
    await expect(page.getByText(/does not publish a job|does not start recruiting/i).first()).toBeVisible()

    const draft = page.locator('form[data-growth-plan-form="draft"]')
    await draft.getByRole("radio", { name: "Modify hiring or recruiting" }).check()
    await draft.locator("#draft-hiringTarget").fill("3")
    await draft.getByLabel("Beginner or experienced DJs").selectOption("experienced")
    await draft.getByLabel("Recruiting direction").selectOption("recruit")
    await draft.getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator("[data-growth-plan-status]")).toHaveAttribute("data-growth-plan-status", "draft")
    await expect(page.locator("[data-growth-plan-warning]").first()).toBeVisible()
    await expect(page.locator("[data-growth-plan-modified]")).toBeVisible()
    await expect(page.getByText(/Saved goals were not changed|does not change saved goals/i).first()).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage23b_growth_plan_draft.png`, fullPage: true })

    const approve = page.locator('form[data-growth-plan-form="approve"]')
    await approve.getByRole("button", { name: "Approve Growth Plan" }).click()
    await expect(approve.getByRole("alert")).toHaveText("Confirm that you have reviewed this plan before approving it.")

    await approve.getByRole("radio", { name: "Modify hiring or recruiting" }).check()
    await approve.locator("#approve-hiringTarget").fill("3")
    await approve.getByLabel("Beginner or experienced DJs").selectOption("experienced")
    await approve.getByLabel("Recruiting direction").selectOption("recruit")
    await approve.getByRole("checkbox", { name: "I have reviewed this plan and want to approve it" }).check()
    await approve.getByRole("button", { name: "Approve Growth Plan" }).click()
    await expect(page.locator("[data-growth-plan-status]")).toHaveAttribute("data-growth-plan-status", "approved")
    await expect(page.locator("[data-growth-plan-hiring-source]")).toHaveAttribute("data-growth-plan-hiring-source", "owner")
    await expect(page.getByText("You set the hiring target to 3")).toBeVisible()
    await expect(page.getByRole("button", { name: "Revise this plan" })).toBeVisible()
    await expect(page.locator('form[data-growth-plan-form="approve"]')).toHaveCount(0)
    await expect(page.locator("[data-growth-plan-warning]")).toHaveCount(2)
    await page.screenshot({ path: `${SHOTS}/stage23b_growth_plan_approved.png`, fullPage: true })
  })

  test("marks an approved plan as needing review when planning inputs change and keeps the old version", async ({
    page,
  }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await approveBlueprint(page)
    await savePlanning(page)
    await page.goto("/blueprint/growth-plan")
    const approve = page.locator('form[data-growth-plan-form="approve"]')
    await approve.getByRole("checkbox", { name: "I have reviewed this plan and want to approve it" }).check()
    await approve.getByRole("button", { name: "Approve Growth Plan" }).click()
    await expect(page.locator("[data-growth-plan-status]")).toHaveAttribute("data-growth-plan-status", "approved")
    await expect(page.locator("[data-growth-plan-version]")).toHaveAttribute("data-growth-plan-version", "1")

    await savePlanning(page, "30", "80", "80")
    await page.goto("/blueprint/growth-plan")
    await expect(page.locator("[data-growth-plan-status]")).toHaveAttribute("data-growth-plan-status", "needs_review")
    await expect(page.locator("[data-growth-plan-previous]")).toHaveAttribute("data-growth-plan-previous", "1")
    await expect(page.getByText(/were not changed/)).toBeVisible()
    await expect(page.getByText(/Approved hiring target/)).toBeVisible()
    await expect(page.locator('form[data-growth-plan-form="approve"]')).toBeVisible()

    const next = page.locator('form[data-growth-plan-form="approve"]')
    await next.getByRole("checkbox", { name: "I have reviewed this plan and want to approve it" }).check()
    await next.getByRole("button", { name: "Approve Growth Plan" }).click()
    await expect(page.locator("[data-growth-plan-status]")).toHaveAttribute("data-growth-plan-status", "approved")
    await expect(page.locator("[data-growth-plan-version]")).toHaveAttribute("data-growth-plan-version", "2")
    await expect(page.locator("[data-growth-plan-previous]")).toHaveCount(0)
  })

  test("rejects a fractional hiring target", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await approveBlueprint(page)
    await savePlanning(page)
    await page.goto("/blueprint/growth-plan")
    const draft = page.locator('form[data-growth-plan-form="draft"]')
    await draft.getByRole("radio", { name: "Modify hiring or recruiting" }).check()
    await draft.locator("#draft-hiringTarget").fill("1.5")
    await draft.getByRole("button", { name: "Save draft" }).click()
    await expect(draft.getByRole("alert")).toHaveText("Enter a whole number of DJs from 0 to 9,999.")
  })

  test("Company B cannot open another company’s growth plan", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/growth-plan")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Growth plan" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })
})
