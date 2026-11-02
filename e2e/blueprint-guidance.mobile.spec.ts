import { mkdirSync } from "node:fs"

import { expect, test } from "@playwright/test"

import { ensureEmptyGuidedCompany, OWNER_C_EMAIL, OWNER_C_PASSWORD } from "./empty-guided-company"

mkdirSync("/opt/cursor/artifacts", { recursive: true })

test.use({ viewport: { width: 390, height: 844 } })

test("phone at 390px keeps the guidance panel in one column with 44px targets", async ({ page }) => {
  ensureEmptyGuidedCompany()
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(OWNER_C_EMAIL)
  await page.getByLabel("Password").fill(OWNER_C_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/")

  await page.goto("/blueprint/goals")
  const link = page.getByRole("button", { name: "I’m not sure" })
  await expect(link).toBeVisible()
  const box = await link.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  await link.click()
  const panel = page.getByRole("region", { name: /Help with:/ })
  await expect(panel).toBeVisible()
  const examples = panel.locator("ul li")
  await expect(examples).toHaveCount(3)
  await expect(examples.filter({ hasText: "DJ less" })).toBeVisible()
  await expect(examples.filter({ hasText: "Scale" })).toBeVisible()
  await expect(examples.filter({ hasText: "Improve quality" })).toBeHidden()
  const panelBox = await panel.boundingBox()
  expect(panelBox?.width).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: "/opt/cursor/artifacts/slice3_g1_panel_390.png", fullPage: true })
})
