import { test, expect } from "../fixtures.js"
import {
  assertLiveProvidersReady,
  configureLiveProviders,
  OPENROUTER_LABEL,
  MAPS_LABEL,
} from "../helpers/live-e2e-setup.js"

test.describe("Live enrichment diagnostics", () => {
  test("shows the configured live provider state for E2E", async ({
    api,
    settingsPage,
  }) => {
    await configureLiveProviders(settingsPage)
    await expect(assertLiveProvidersReady(api)).resolves.toBeUndefined()

    await settingsPage.goto()
    await settingsPage.assertSavedSecret(OPENROUTER_LABEL)
    await settingsPage.navLink("Karten").click()
    await settingsPage.assertSavedSecret(MAPS_LABEL)

    const config = await api.getConfig()
    const models = await api.getLlmModels()

    expect(config.provider).toBe("openrouter")
    expect(config.assessmentModel).toBeTruthy()
    expect(config.coverLetterModel).toBeTruthy()
    expect(config.consultationModel).toBeTruthy()

    expect(models.length).toBeGreaterThan(0)
    expect(models.some((model) => model.id === config.assessmentModel)).toBe(
      true,
    )
    expect(models.some((model) => model.id === config.coverLetterModel)).toBe(
      true,
    )
  })

  test("verifies the saved live keys can execute provider operations", async ({
    api,
    settingsPage,
  }) => {
    await configureLiveProviders(settingsPage)

    await expect(assertLiveProvidersReady(api)).resolves.toBeUndefined()
  })
})
