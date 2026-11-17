import { mkdirSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

const SHOTS = "/opt/cursor/artifacts"
mkdirSync(SHOTS, { recursive: true })
const password = "blueprint-local-password"

async function signIn(page: Page, email: string, pwd = password) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(pwd)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")
}

const sectionStatus = (page: Page) => page.locator("div:has(> h1) > .bp-status")

async function rateSkill(page: Page, skill: string, rating: string) {
  await page.locator("#q-I5").getByRole("group", { name: skill }).getByRole("radio", { name: rating }).check()
}

test.describe("Your ideal DJ", () => {
  test("saves fit, experience, and hiring preferences for a solo operator with no one in mind", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/ideal-dj")
    await expect(page.getByRole("heading", { level: 1, name: "Your ideal DJ" })).toBeVisible()
    await expect(
      page.getByText(
        "Now your ideal DJ: who fits your company, even if you have not hired anyone yet. This is reflection only — no scores or hiring decisions yet.",
      ),
    ).toBeVisible()
    await expect(page.getByText(/applicant score|interview question|job ad|recruitment ad/i)).toHaveCount(0)
    await expect(
      page.getByText("This is a preference only. It does not decide how anyone is classified as an employee or contractor."),
    ).toBeVisible()

    await page.getByRole("radio", { name: "I don’t have anyone in mind" }).check()
    await expect(page.locator("#q-I2")).toContainText("Which qualities would you want in a future DJ?")
    await page.locator("#q-I2").getByRole("checkbox", { name: "Dependable", exact: true }).check()
    await page.locator("#q-I2").getByRole("checkbox", { name: "Friendly and approachable" }).check()
    await page.locator("#q-I2").getByRole("checkbox", { name: "Coachable" }).check()
    await page.locator("#q-I3").getByRole("checkbox", { name: "Dependable", exact: true }).check()
    await page.locator("#q-I3").getByRole("checkbox", { name: "Friendly and approachable" }).check()
    await page.locator("#q-I4").getByRole("checkbox", { name: "I haven’t defined these yet" }).check()
    await page.getByRole("button", { name: "Save who fits" }).click()
    await expect(page.locator("form[data-card='fit'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i1", "none")
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i2", "dependable,friendly,coachable")
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i3", "dependable,friendly")
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i4", "none")
    await expect(sectionStatus(page)).toHaveText("Needs attention")
    await page.screenshot({ path: `${SHOTS}/slice9_ideal_dj_fit_none.png`, fullPage: true })

    await rateSkill(page, "DJing or mixing", "Can be taught")
    await rateSkill(page, "Music knowledge", "Can be taught")
    await rateSkill(page, "Public speaking or MC experience", "Must already have")
    await rateSkill(page, "Customer service", "Must already have")
    await rateSkill(page, "Event experience", "Can be taught")
    await rateSkill(page, "Audio equipment", "Not important for this role")
    await rateSkill(page, "Lighting equipment", "Not sure")
    await rateSkill(page, "Sales or client communication", "Can be taught")
    await page.locator("#q-I6").getByRole("radio", { name: "Yes, if they have the right personality" }).check()
    await page.locator("#q-I7").getByRole("radio", { name: "Strong character and willingness to learn" }).check()
    await page.getByRole("button", { name: "Save what experience matters" }).click()
    await expect(page.locator("form[data-card='experience'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='experience']")).toHaveAttribute(
      "data-saved-i5",
      "djing:can_teach,music:can_teach,speaking:must_have,customer_service:must_have,events:can_teach,audio:not_important,lighting:not_sure,sales:can_teach",
    )
    await expect(page.locator("form[data-card='experience']")).toHaveAttribute("data-saved-i6", "yes_personality")
    await expect(page.locator("form[data-card='experience']")).toHaveAttribute("data-saved-i7", "character")

    await page.locator("#q-I8").getByRole("checkbox", { name: "Saturdays" }).check()
    await page.locator("#q-I8").getByRole("checkbox", { name: "Availability varies" }).check()
    await expect(page.locator("#q-I8").getByRole("checkbox", { name: "Saturdays" })).not.toBeChecked()
    await expect(page.locator("#q-I8").getByRole("checkbox", { name: "Availability varies" })).toBeChecked()
    await page.locator("#q-I8").getByRole("checkbox", { name: "Saturdays" }).check()
    await expect(page.locator("#q-I8").getByRole("checkbox", { name: "Availability varies" })).not.toBeChecked()
    await page.locator("#q-I9").getByRole("radio", { name: "Within 30 miles" }).check()
    await page.locator("#q-I10").getByRole("radio", { name: "Not sure" }).check()
    await page.locator("#q-I11").getByRole("checkbox", { name: "Unreliable or frequently late" }).check()
    await page.locator("#q-I11").getByRole("checkbox", { name: "Poor communication" }).check()
    await page.locator("#q-I11").getByRole("checkbox", { name: "Unwilling to accept feedback" }).check()
    await page.locator("#q-I11").getByRole("checkbox", { name: "Unprofessional behavior" }).click()
    await expect(page.locator("#q-I11").getByRole("checkbox", { name: "Unreliable or frequently late" })).toBeChecked()
    await expect(page.locator("#q-I11").getByRole("checkbox", { name: "Poor communication" })).toBeChecked()
    await expect(page.locator("#q-I11").getByRole("checkbox", { name: "Unwilling to accept feedback" })).toBeChecked()
    await expect(page.locator("#q-I11").getByRole("checkbox", { name: "Unprofessional behavior" })).not.toBeChecked()
    await page.getByRole("button", { name: "Save your hiring preferences" }).click()
    await expect(page.locator("form[data-card='hiring'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='hiring']")).toHaveAttribute("data-saved-i8", "saturday")
    await expect(page.locator("form[data-card='hiring']")).toHaveAttribute("data-saved-i9", "miles_30")
    await expect(page.locator("form[data-card='hiring']")).toHaveAttribute("data-saved-i10", "not_sure")
    await expect(page.locator("form[data-card='hiring']")).toHaveAttribute("data-saved-i11", "unreliable,poor_communication,no_feedback")
    await expect(sectionStatus(page)).toHaveText("Complete")
  })

  test("changing I2 qualities that were I3 priorities leaves I3 unanswered instead of silently complete", async ({
    page,
  }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/ideal-dj")
    await page.getByRole("radio", { name: "I don’t have anyone in mind" }).check()
    await page.locator("#q-I2").getByRole("checkbox", { name: "Dependable", exact: true }).check()
    await page.locator("#q-I2").getByRole("checkbox", { name: "Friendly and approachable" }).check()
    await page.locator("#q-I2").getByRole("checkbox", { name: "Coachable" }).check()
    await page.locator("#q-I3").getByRole("checkbox", { name: "Dependable", exact: true }).check()
    await page.locator("#q-I3").getByRole("checkbox", { name: "Friendly and approachable" }).check()
    await page.locator("#q-I4").getByRole("checkbox", { name: "I haven’t defined these yet" }).check()
    await page.getByRole("button", { name: "Save who fits" }).click()
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i3", "dependable,friendly")

    await page.locator("#q-I2").getByRole("checkbox", { name: "Dependable", exact: true }).uncheck()
    await page.locator("#q-I2").getByRole("checkbox", { name: "Friendly and approachable" }).uncheck()
    await expect(page.locator("#q-I3").getByRole("checkbox", { name: "Dependable", exact: true })).toHaveCount(0)
    await expect(page.locator("#q-I3").getByRole("checkbox", { name: "Friendly and approachable" })).toHaveCount(0)
    await page.getByRole("button", { name: "Save who fits" }).click()
    await expect(page.locator("form[data-card='fit'] .bp-save")).toHaveText("Saved")
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i2", "coachable")
    await expect(page.locator("form[data-card='fit']")).toHaveAttribute("data-saved-i3", "")
    await expect(sectionStatus(page)).toHaveText("Needs attention")
  })

  test("skips a later question and resumes to it from Needs attention", async ({ page }) => {
    ensureEmptyGuidedCompany()
    await signIn(page, OWNER_C_EMAIL, OWNER_C_PASSWORD)
    await page.goto("/blueprint/ideal-dj")
    await page.getByRole("radio", { name: "I don’t have anyone in mind" }).check()
    await page.getByRole("button", { name: "Save who fits" }).click()
    await expect(page.locator("form[data-card='fit'] .bp-save")).toHaveText("Saved")
    await page.locator("#q-I5").getByRole("button", { name: "I’m not sure" }).click()
    await page.locator("#q-I5").getByRole("button", { name: "Skip for now. You can answer it later." }).click()
    await expect(page.locator("#q-I5").getByText("You skipped this for now.")).toBeVisible()
    await page.goto("/blueprint")
    await expect(page.locator("ol li").filter({ hasText: "Your ideal DJ" }).getByRole("link", { name: "1 skipped" })).toHaveAttribute(
      "href",
      "/blueprint/ideal-dj#q-I5",
    )
    await page.locator("ol li").filter({ hasText: "Your ideal DJ" }).getByRole("link", { name: "1 skipped" }).click()
    await expect(page).toHaveURL(/\/blueprint\/ideal-dj#q-I5/)
    await expect(page.locator("#q-I5").getByText("You skipped this for now.")).toBeVisible()
  })
})
