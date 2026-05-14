import { expect } from "@playwright/test"

import type { SettingsPage } from "../pages/index.js"

export const REQUIRED_E2E_ENV = {
  OPENROUTER_API_KEY: "OpenRouter",
  GOOGLE_MAPS_API_KEY: "Google Maps",
} as const

export async function configureLiveProviders(
  settingsPage: SettingsPage,
): Promise<void> {
  const credentials = readRequiredLiveCredentials()

  await settingsPage.goto()
  await expect(settingsPage.heading).toBeVisible()
  await settingsPage.assertUnsetSecret(OPENROUTER_LABEL)
  await settingsPage.addAndSave(OPENROUTER_LABEL, credentials.openrouterApiKey)
  await settingsPage.assertSavedSecret(OPENROUTER_LABEL)

  await settingsPage.navLink("Karten").click()
  await settingsPage.assertUnsetSecret(MAPS_LABEL)
  await settingsPage.addAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
  await settingsPage.assertSavedSecret(MAPS_LABEL)
}

export const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"

export const MAPS_LABEL = "Google Maps API-Schlüssel"

function readRequiredLiveCredentials(): LiveCredentials {
  return {
    openrouterApiKey: readRequiredEnvironmentVariable("OPENROUTER_API_KEY"),
    googleMapsApiKey: readRequiredEnvironmentVariable("GOOGLE_MAPS_API_KEY"),
  }
}

interface LiveCredentials {
  openrouterApiKey: string
  googleMapsApiKey: string
}

function readRequiredEnvironmentVariable(
  name: keyof typeof REQUIRED_E2E_ENV,
): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Missing required E2E environment variable: ${REQUIRED_E2E_ENV[name]} (${name})`,
    )
  }
  return value
}
