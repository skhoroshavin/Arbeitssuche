import { test } from "../fixtures.js"
import {
  MAPS_LABEL,
  OPENROUTER_LABEL,
  readRequiredLiveCredentials,
} from "../helpers/live-e2e-setup.js"

test.describe("First-start wizard", () => {
  test("fills invalid keys first, then valid live keys, and sees the test buttons react through UI only", async ({
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

    await firstStartPage.continueToMaps()

    await settingsPage.addAndSave(MAPS_LABEL, "invalid-google-maps-key")
    await settingsPage.testButton(MAPS_LABEL).click()
    await settingsPage.expectTestFailure()

    await settingsPage.replaceAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
    await settingsPage.testButton(MAPS_LABEL).click()
    await settingsPage.expectTestSuccess()
  })
})
