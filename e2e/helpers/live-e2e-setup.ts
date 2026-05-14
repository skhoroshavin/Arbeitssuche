import { expect, type ConsoleMessage, type Page } from "@playwright/test"

import type { ElectronApiHelper } from "./electron-api-helper.js"

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

export async function assertLiveProvidersReady(
  api: ElectronApiHelper,
): Promise<void> {
  const config = await api.getConfig()
  const [llmStatus, mapsStatus] = await Promise.all([
    api.testLlmProvider(config.provider),
    api.testCommuteProvider("google-maps"),
  ])

  if (!llmStatus.ok) {
    throw new Error(
      formatProviderError(
        `Live LLM provider validation failed for ${config.provider}`,
        llmStatus.error,
      ),
    )
  }

  if (!mapsStatus.ok) {
    throw new Error(
      formatProviderError(
        "Live commute provider validation failed",
        mapsStatus.error,
      ),
    )
  }
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") {
      errors.push(message.text())
    }
  })
  return errors
}

export async function resolveCoverLetterLength(
  api: ElectronApiHelper,
  jobSearchId: string,
  vacancyHash: string,
): Promise<number> {
  const result = await api.getVacancyCoverLetter(jobSearchId, vacancyHash)
  if (result.status !== 200) {
    return 0
  }
  const body = result.body as { content?: string }
  return body.content ? body.content.trim().length : 0
}

function formatProviderError(prefix: string, error?: string): string {
  return `${prefix}: ${error ?? "unknown error"}`
}

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
