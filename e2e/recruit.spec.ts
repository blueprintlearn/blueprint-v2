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
  const reloaded = page.waitForEvent("load")
  await page.getByRole("button", { name: "Save planning answers" }).click()
  await reloaded
  await expect(page.locator("[data-growth-rec]")).toHaveAttribute("data-growth-rec", /demand|utilize|recruit|beginner|experienced|train/)
}

async function openRecruit(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Growth planning" })).toBeVisible()
  await page.waitForLoadState("networkidle")
  await page.goto("/blueprint/recruit")
  await expect(page).toHaveURL(/\/blueprint\/recruit/)
  await expect(page.getByRole("heading", { level: 1, name: "Recruiting" })).toBeVisible()
}

test.describe("Recruiting", () => {
  test("lets the owner recruit without a growth plan, including replacement hiring", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruit")
    await expect(page.getByRole("heading", { level: 1, name: "Recruiting" })).toBeVisible()
    await expect(page.locator("[data-recruit-growth]")).toHaveAttribute("data-recruit-growth", "none")
    await expect(page.getByText("You can recruit without completing a growth plan")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage31_recruit_without_plan.png`, fullPage: true })

    const need = page.locator('form[data-recruit-form="need"]')
    await need.getByRole("radio", { name: "Replacement: someone left or is leaving" }).check()
    await need.locator("#hiringTarget").fill("1")
    await need.getByLabel("Beginner or experienced").selectOption("experienced")
    await need.getByRole("button", { name: "Save hiring need" }).click()
    await expect(page.locator("[data-recruit-reason]")).toHaveAttribute("data-recruit-reason", "replacement")
    await expect(page.locator("[data-recruit-hiring]")).toHaveAttribute("data-recruit-hiring", "1")
    await expect(page.getByText(/does not publish a job/i).first()).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage31_recruit_replacement.png`, fullPage: true })
  })

  test("keeps missing hiring unavailable and requires explicit approval", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruit")
    const need = page.locator('form[data-recruit-form="need"]')
    await need.getByRole("radio", { name: "Capacity or reliability: we need better coverage" }).check()
    await need.getByRole("button", { name: "Save hiring need" }).click()
    await expect(page.locator("[data-recruit-hiring]")).toHaveAttribute("data-recruit-hiring", "unavailable")
    await expect(page.getByText(/will not invent a staffing requirement|will not invent a headcount/i).first()).toBeVisible()

    const draft = page.locator('form[data-recruit-form="draft"]')
    await draft.getByRole("radio", { name: "Modify hiring or channels" }).check()
    await draft.locator("#draft-hiringTarget").fill("2")
    await draft.getByLabel("Beginner or experienced").selectOption("beginner")
    await draft.getByRole("button", { name: "Save draft" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "draft")
    await expect(page.locator("[data-recruit-modified]")).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/stage31_recruit_draft.png`, fullPage: true })

    const approve = page.locator('form[data-recruit-form="approve"]')
    await approve.getByRole("button", { name: "Approve recruiting strategy" }).click()
    await expect(approve.getByRole("alert")).toHaveText(
      "Confirm that you have reviewed this strategy before approving it.",
    )

    await approve.getByRole("radio", { name: "Modify hiring or channels" }).check()
    await approve.locator("#approve-hiringTarget").fill("2")
    await approve.getByLabel("Beginner or experienced").selectOption("beginner")
    await approve.getByRole("checkbox", { name: "I have reviewed this strategy and want to approve it" }).check()
    await approve.getByRole("button", { name: "Approve recruiting strategy" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "approved")
    await expect(page.locator("[data-recruit-hiring]")).toHaveAttribute("data-recruit-hiring", "2")
    await expect(page.getByRole("button", { name: "Revise this strategy" })).toBeVisible()
    await expect(page.locator('form[data-recruit-form="approve"]')).toHaveCount(0)
    await page.screenshot({ path: `${SHOTS}/stage31_recruit_approved.png`, fullPage: true })
  })

  test("uses a current approved growth plan and ignores it after planning changes", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await approveBlueprint(page)
    await savePlanning(page)
    await page.goto("/blueprint/growth-plan")
    const planApprove = page.locator('form[data-growth-plan-form="approve"]')
    await planApprove.getByRole("radio", { name: "Modify hiring or recruiting" }).check()
    await planApprove.locator("#approve-hiringTarget").fill("3")
    await planApprove.getByLabel("Beginner or experienced DJs").selectOption("experienced")
    await planApprove.getByLabel("Recruiting direction").selectOption("recruit")
    await planApprove.getByRole("checkbox", { name: "I have reviewed this plan and want to approve it" }).check()
    await planApprove.getByRole("button", { name: "Approve Growth Plan" }).click()
    await expect(page.locator("[data-growth-plan-status]")).toHaveAttribute("data-growth-plan-status", "approved")

    await page.goto("/blueprint/recruit")
    await expect(page.locator("[data-recruit-growth]")).toHaveAttribute("data-recruit-growth", "available")
    const need = page.locator('form[data-recruit-form="need"]')
    await need.getByRole("radio", { name: "Growth: we need additional DJs" }).check()
    await need.getByText(/Use the current approved growth plan/).click()
    await need.getByRole("button", { name: "Save hiring need" }).click()
    await expect(page.locator("[data-recruit-hiring]")).toHaveAttribute("data-recruit-hiring", "3")
    await expect(page.locator("[data-recruit-profile]")).toHaveAttribute("data-recruit-profile", "experienced")
    await expect(page.locator("[data-recruit-hiring-status]")).toHaveAttribute("data-recruit-hiring-status", "from_growth_plan")
    await page.screenshot({ path: `${SHOTS}/stage31_recruit_with_plan.png`, fullPage: true })

    const approve = page.locator('form[data-recruit-form="approve"]')
    await approve.getByRole("radio", { name: "Accept this strategy" }).check()
    await approve.getByRole("checkbox", { name: "I have reviewed this strategy and want to approve it" }).check()
    await approve.getByRole("button", { name: "Approve recruiting strategy" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "approved")
    await expect(page.locator("[data-recruit-version]")).toHaveAttribute("data-recruit-version", "1")

    await savePlanning(page, "30", "80", "80")
    await openRecruit(page)
    await expect(page.locator("[data-recruit-growth]")).toHaveAttribute("data-recruit-growth", "stale")
    await expect(page.getByText(/is not used as a recruiting recommendation/).first()).toBeVisible()
    await expect(page.locator("[data-recruit-previous]")).toHaveAttribute("data-recruit-previous", "1")
    await expect(page.getByText(/were not changed/)).toBeVisible()
  })

  test("marks an approved strategy as needing review when the hiring need changes", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruit")
    const need = page.locator('form[data-recruit-form="need"]')
    await need.getByRole("radio", { name: "Growth: we need additional DJs" }).check()
    await need.locator("#hiringTarget").fill("2")
    await need.getByRole("button", { name: "Save hiring need" }).click()
    const approve = page.locator('form[data-recruit-form="approve"]')
    await approve.getByRole("checkbox", { name: "I have reviewed this strategy and want to approve it" }).check()
    await approve.getByRole("button", { name: "Approve recruiting strategy" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "approved")
    await page.getByRole("button", { name: "Revise this strategy" }).click()
    await expect(page.locator('form[data-recruit-form="need"]')).toBeVisible()
    const nextNeed = page.locator('form[data-recruit-form="need"]')
    await nextNeed.locator("#hiringTarget").fill("4")
    await nextNeed.getByRole("button", { name: "Save hiring need" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "needs_review")
    await expect(page.locator("[data-recruit-previous]")).toHaveAttribute("data-recruit-previous", "1")
    await expect(page.locator("[data-recruit-hiring]")).toHaveAttribute("data-recruit-hiring", "4")

    const next = page.locator('form[data-recruit-form="approve"]')
    await next.getByRole("checkbox", { name: "I have reviewed this strategy and want to approve it" }).check()
    await next.getByRole("button", { name: "Approve recruiting strategy" }).click()
    await expect(page.locator("[data-recruit-status]")).toHaveAttribute("data-recruit-status", "approved")
    await expect(page.locator("[data-recruit-version]")).toHaveAttribute("data-recruit-version", "2")
    await expect(page.locator("[data-recruit-previous]")).toHaveCount(0)
  })

  test("rejects a fractional hiring target", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page)
    await page.goto("/blueprint/recruit")
    const need = page.locator('form[data-recruit-form="need"]')
    await need.getByRole("radio", { name: "Growth: we need additional DJs" }).check()
    await need.locator("#hiringTarget").fill("1.5")
    await need.getByRole("button", { name: "Save hiring need" }).click()
    await expect(need.getByRole("alert")).toHaveText("Enter a whole number of people from 1 to 9,999.")
  })

  test("Company B cannot open another company’s recruiting page", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill("owner-b@blueprint.test")
    await page.getByLabel("Password").fill("blueprint-local-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/")
    const response = await page.goto("/blueprint/recruit")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1, name: "Recruiting" })).toHaveCount(0)
    await expect(page.getByText(/\bCompany A\b/)).toHaveCount(0)
  })
})
