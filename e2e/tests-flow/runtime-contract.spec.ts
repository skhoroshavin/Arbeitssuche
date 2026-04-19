import { test, expect } from "../fixtures.js"

const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"
const MAPS_LABEL = "Google Maps API-Schlüssel"

test.describe("Live E2E runtime contract", () => {
  test.describe.configure({ mode: "serial" })

  test("injects provider credentials automatically into a fresh app run", async ({
    api,
    settingsPage,
  }) => {
    const secrets = await api.getSecrets()

    expect(secrets.openrouterApiKey).toBe(process.env.OPENROUTER_API_KEY)
    expect(secrets.googleMapsApiKey).toBe(process.env.GOOGLE_MAPS_API_KEY)

    await settingsPage.goto()
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    await settingsPage.navLink("Karten").click()
    await expect(settingsPage.replaceButton(MAPS_LABEL)).toBeVisible()

    await api.saveSecrets({})
    await settingsPage.goto()
    await expect(settingsPage.addButton(OPENROUTER_LABEL)).toBeVisible()
    await settingsPage.navLink("Karten").click()
    await expect(settingsPage.addButton(MAPS_LABEL)).toBeVisible()
  })

  test("restores injected credentials for the next isolated run", async ({
    api,
    settingsPage,
  }) => {
    const secrets = await api.getSecrets()

    expect(secrets.openrouterApiKey).toBe(process.env.OPENROUTER_API_KEY)
    expect(secrets.googleMapsApiKey).toBe(process.env.GOOGLE_MAPS_API_KEY)

    await settingsPage.goto()
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    await settingsPage.navLink("Karten").click()
    await expect(settingsPage.replaceButton(MAPS_LABEL)).toBeVisible()
  })
})
