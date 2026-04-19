import { test, expect } from "../fixtures.js"
import { LiveFlowHelper } from "../helpers/live-flow-helper.js"
import { configureLiveProviders } from "../helpers/live-e2e-setup.js"

const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"
const MAPS_LABEL = "Google Maps API-Schlüssel"

test.describe("Live E2E runtime contract", () => {
  test.describe.configure({ mode: "serial" })

  test("starts clean and uses the Settings UI to configure live provider keys", async ({
    applicantListPage,
    applicantPage,
    jobSearchPage,
    api,
    settingsPage,
  }) => {
    const helper = new LiveFlowHelper(
      applicantListPage,
      applicantPage,
      jobSearchPage,
      api,
    )

    const applicantId = await helper.createApplicantWithCity(
      `e2e-runtime-${Date.now()}`,
    )
    const jobSearchId = await helper.createJobSearchWithBoundedResults(
      applicantId,
      "Softwareentwickler",
    )

    await expect(jobSearchPage.missingKeyNote).toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).toBeVisible()

    await configureLiveProviders(settingsPage)

    await settingsPage.goto()
    await settingsPage.assertSavedSecret(OPENROUTER_LABEL)
    await settingsPage.navLink("Karten").click()
    await settingsPage.assertSavedSecret(MAPS_LABEL)

    await jobSearchPage.gotoVacancies(jobSearchId)
    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()
  })

  test("starts clean again for the next isolated run", async ({
    settingsPage,
  }) => {
    await settingsPage.goto()
    await settingsPage.assertUnsetSecret(OPENROUTER_LABEL)

    await settingsPage.navLink("Karten").click()
    await settingsPage.assertUnsetSecret(MAPS_LABEL)
  })
})
