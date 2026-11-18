import { test } from "@playwright/test"

import { runOnboardingJourney } from "./onboarding-journey"

test.describe("Stage 1 onboarding journey on a phone", () => {
  test("new owner completes all eight sections, returns, skips, estimates, and re-approves after an edit", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await runOnboardingJourney(page)
  })
})
