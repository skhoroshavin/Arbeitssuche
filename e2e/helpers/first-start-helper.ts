import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { FirstStartPage } from "../pages/first-start.page.js"
import { SettingsPage } from "../pages/settings.page.js"
import { OPENROUTER_LABEL, MAPS_LABEL } from "./live-e2e-setup.js"
import { ApplicantListPage } from "../pages/applicant-list.page.js"

export async function fastTrackFirstStart(
  page: Page,
  options: { configureKeys: boolean },
): Promise<string | undefined> {
  const firstStartPage = new FirstStartPage(page)

  if (options.configureKeys) {
    await configureKeysInFirstStart(page, firstStartPage)
    return undefined
  }

  return skipSetupAndCreateMinimalApplicant(page, firstStartPage)
}

async function skipSetupAndCreateMinimalApplicant(
  page: Page,
  firstStartPage: FirstStartPage,
): Promise<string> {
  await firstStartPage.skipToApplicantCreation()
  const applicantListPage = new ApplicantListPage(page)
  const applicantId = await applicantListPage.createApplicantMinimal(
    `e2e-fast-${Date.now()}`,
  )
  await expect(page.getByRole("heading", { name: "Lebenslauf" })).toBeVisible()
  return applicantId
}

async function configureKeysInFirstStart(
  page: Page,
  firstStartPage: FirstStartPage,
): Promise<void> {
  await firstStartPage.configureKeysAndFinish()

  const settingsPage = new SettingsPage(page)
  const openrouterKey = readRequiredEnv("OPENROUTER_API_KEY")
  const googleMapsKey = readRequiredEnv("GOOGLE_MAPS_API_KEY")

  await settingsPage.addAndSave(OPENROUTER_LABEL, openrouterKey)
  await settingsPage.assertSavedSecret(OPENROUTER_LABEL)

  await firstStartPage.clickKartenStep()
  await settingsPage.addAndSave(MAPS_LABEL, googleMapsKey)
  await settingsPage.assertSavedSecret(MAPS_LABEL)

  await firstStartPage.finishButton.click()
  await expect(
    page.getByRole("heading", { name: "Neuen Bewerber erstellen" }),
  ).toBeVisible({ timeout: 15_000 })
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`)
  }
  return value
}
