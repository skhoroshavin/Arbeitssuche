import type { FirstStartPage, SettingsPage } from "../pages/index.js"

export const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"
export const MAPS_LABEL = "Google Maps API-Schlüssel"

export function readRequiredLiveCredentials(): LiveCredentials {
  return {
    openrouterApiKey: readRequiredEnvironmentVariable("OPENROUTER_API_KEY"),
    googleMapsApiKey: readRequiredEnvironmentVariable("GOOGLE_MAPS_API_KEY"),
  }
}

export async function finishFirstStartSettingsWithLiveCredentials(
  firstStartPage: FirstStartPage,
  settingsPage: SettingsPage,
): Promise<void> {
  const credentials = readRequiredLiveCredentials()

  await firstStartPage.assertVisible()
  await settingsPage.addAndSave(OPENROUTER_LABEL, credentials.openrouterApiKey)
  await settingsPage.assertSavedSecret(OPENROUTER_LABEL)
  await settingsPage.testButton(OPENROUTER_LABEL).click()
  await settingsPage.expectTestSuccess()

  await firstStartPage.continueToMaps()
  await settingsPage.addAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
  await settingsPage.assertSavedSecret(MAPS_LABEL)
  await settingsPage.testButton(MAPS_LABEL).click()
  await settingsPage.expectTestSuccess()

  await firstStartPage.finishSettings()
}

export async function configureLiveProviders(
  settingsPage: SettingsPage,
): Promise<void> {
  const credentials = readRequiredLiveCredentials()

  await settingsPage.goto()
  // We don't assert on heading here because page object may vary by context
  await settingsPage.assertUnsetSecret(OPENROUTER_LABEL)
  await settingsPage.addAndSave(OPENROUTER_LABEL, credentials.openrouterApiKey)
  await settingsPage.assertSavedSecret(OPENROUTER_LABEL)

  // For regular settings, click the Maps nav link instead of continue
  // (the continue button is only available in first-start wizard)
  await settingsPage.navLink("Karten").click()
  await settingsPage.assertUnsetSecret(MAPS_LABEL)
  await settingsPage.addAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
  await settingsPage.assertSavedSecret(MAPS_LABEL)
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

export const REQUIRED_E2E_ENV = {
  OPENROUTER_API_KEY: "OpenRouter",
  GOOGLE_MAPS_API_KEY: "Google Maps",
} as const

interface LiveCredentials {
  openrouterApiKey: string
  googleMapsApiKey: string
}
