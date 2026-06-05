import { test, expect } from "../fixtures.js"
import {
  MAPS_LABEL,
  OPENROUTER_LABEL,
  readRequiredLiveCredentials,
} from "../helpers/live-e2e-setup.js"

test.describe("main flow", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 })

  test.describe("first-start", () => {
    test("first asks to fill in OpenRouter API key, and allows checking its validity", async ({
      firstStartPage,
      settingsPage,
    }) => {
      const credentials = readRequiredLiveCredentials()

      await firstStartPage.assertVisible()

      await settingsPage.addAndSave(OPENROUTER_LABEL, "invalid-openrouter-key")
      await settingsPage.testButton(OPENROUTER_LABEL).click()
      await settingsPage.expectTestFailure()

      await settingsPage.replaceAndSave(
        OPENROUTER_LABEL,
        credentials.openrouterApiKey,
      )
      await settingsPage.testButton(OPENROUTER_LABEL).click()
      await settingsPage.expectTestSuccess()

      await firstStartPage.continueButton.click()
    })

    test("then asks to fill in Google Maps API key, and allows checking its validity", async ({
      firstStartPage,
      settingsPage,
    }) => {
      const credentials = readRequiredLiveCredentials()

      await expect(firstStartPage.mapsHeading).toBeVisible()

      await settingsPage.addAndSave(MAPS_LABEL, "invalid-google-maps-key")
      await settingsPage.testButton(MAPS_LABEL).click()
      await settingsPage.expectTestFailure()

      await settingsPage.replaceAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
      await settingsPage.testButton(MAPS_LABEL).click()
      await settingsPage.expectTestSuccess()

      await firstStartPage.finishSettings()
    })
  })
})
