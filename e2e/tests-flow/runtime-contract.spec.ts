import { test, expect } from "../fixtures.js"
import { configureLiveProviders } from "../helpers/live-e2e-setup.js"

test.describe("Live E2E runtime contract", () => {
  test.describe.configure({ mode: "serial" })

  test("starts clean, reaches missing-key warnings through real first-start navigation, and can then configure keys through Settings", async ({
    applicantListPage,
    applicantPage,
    firstStartPage,
    jobSearchPage,
    layoutPage,
    settingsPage,
  }) => {
    await firstStartPage.assertVisible()
    await firstStartPage.skipSettings()

    await applicantListPage.assertWizardVisible()
    await applicantListPage.fillPersonalDetails({
      name: `e2e-runtime-${Date.now()}`,
      street: "Friedrichstraße 100",
      zip: "10117",
      city: "Berlin",
    })
    await applicantListPage.advanceWizardToLastStep()
    await applicantListPage.wizardFinishButton.click()

    await expect(applicantPage.page).toHaveURL(
      /\/first-start\/job-search\//,
      { timeout: 10_000 },
    )
    await applicantPage.assertJobSearchWizardVisible()

    await applicantPage.field("Suchbegriff").fill("Softwareentwickler")
    await applicantPage.field("Max. Ergebnisse").fill("5")

    // Advance through wizard steps
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.sourceButton("arbeitsagentur").click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()

    // Verify we're on the last step and can see the finish button
    await expect(applicantPage.wizardFinishButton).toBeVisible({
      timeout: 5_000,
    })

    await applicantPage.wizardFinishButton.click()

    // After finish, the app should navigate away from /first-start/
    // The handlePhaseComplete navigation or the FirstStartWizard's Navigate
    // should take us to either /job-searches/{id}/vacancies or /
    await expect(jobSearchPage.page).not.toHaveURL(/\/first-start\//, {
      timeout: 20_000,
    })

    // Check if we landed on a job-search URL or somewhere else
    const landedUrl = jobSearchPage.page.url()
    const jobSearchId = /\/job-searches\/([^/]+)/.exec(landedUrl)?.[1]

    if (!jobSearchId) {
      throw new Error(
        `App did not land on job search page. URL: ${landedUrl}. ` +
          `The first-start completion navigation may have failed.`,
      )
    }

    // Navigate to vacancies explicitly if we landed on config or cover-letter
    await jobSearchPage.gotoVacancies(jobSearchId)

    await expect(jobSearchPage.missingKeyNote).toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).toBeVisible()

    await layoutPage.sidebarSettingsLink.click()
    await configureLiveProviders(settingsPage)

    await jobSearchPage.gotoVacancies(jobSearchId)
    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()
  })

  test("starts clean again for the next isolated run", async ({
    firstStartPage,
  }) => {
    await firstStartPage.assertVisible()
  })
})
