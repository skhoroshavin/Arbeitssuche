import { test } from "../fixtures.js"
import {
  MAPS_LABEL,
  OPENROUTER_LABEL,
  readRequiredLiveCredentials,
} from "../helpers/live-e2e-setup.js"

test.describe("Live enrichment diagnostics", () => {
  test("shows configured provider state, masked secrets, successful tests, and non-empty model selections through visible UI only", async ({
    firstStartPage,
    settingsPage,
  }) => {
    const credentials = readRequiredLiveCredentials()

    await firstStartPage.assertVisible()
    await settingsPage.expectProviderSelected("OpenRouter")

    await settingsPage.addAndSave(OPENROUTER_LABEL, credentials.openrouterApiKey)
    await settingsPage.assertSavedSecret(OPENROUTER_LABEL)
    await settingsPage.testButton(OPENROUTER_LABEL).click()
    await settingsPage.expectTestSuccess()

    await settingsPage.expectModelSelected("Bewertungsmodell")
    await settingsPage.expectModelSelected("Anschreibenmodell")
    await settingsPage.expectModelSelected("Beratungsmodell")

    await firstStartPage.continueToMaps()

    await settingsPage.addAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
    await settingsPage.assertSavedSecret(MAPS_LABEL)
    await settingsPage.testButton(MAPS_LABEL).click()
    await settingsPage.expectTestSuccess()
  })
})
