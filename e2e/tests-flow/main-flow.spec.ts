import { test, expect } from "../fixtures.js"
import { MAIN_FLOW_SEED } from "../helpers/main-flow-seed.js"
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

    test("then asks for user personal data", async ({ applicantListPage }) => {
      await applicantListPage.fillPersonalStep(MAIN_FLOW_SEED.applicant.personal)
      await applicantListPage.continueToStep("Berufserfahrung")
    })

    test("then asks for work experience", async ({ applicantListPage }) => {
      await applicantListPage.fillExperienceStep(
        MAIN_FLOW_SEED.applicant.experience,
      )
      await applicantListPage.continueToStep("Ausbildung")
    })

    test("then asks for education", async ({ applicantListPage }) => {
      await applicantListPage.fillEducationStep(
        MAIN_FLOW_SEED.applicant.education,
      )
      await applicantListPage.continueToStep("Zertifikate")
    })

    test("then asks for certification", async ({ applicantListPage }) => {
      await applicantListPage.fillCertificationStep(
        MAIN_FLOW_SEED.applicant.certification,
      )
      await applicantListPage.continueToStep("Sonstiges")
    })

    test("then asks for miscellaneous", async ({
      applicantListPage,
      applicantPage,
    }) => {
      await applicantListPage.fillOtherStep(MAIN_FLOW_SEED.applicant.other)
      await applicantListPage.wizardFinishButton.click()
      await applicantPage.assertJobSearchWizardVisible()
    })

    test("then asks for job search parameters", async ({ applicantPage }) => {
      await applicantPage.fillSearchParameters(MAIN_FLOW_SEED.jobSearch)
      await applicantPage.continueToWizardStep(2)
    })

    test("then proposes to generate a cover letter template", async ({
      applicantPage,
    }) => {
      await applicantPage.continueToWizardStep(3)
      await applicantPage.enableOnlySources(MAIN_FLOW_SEED.jobSearch.sources)
      await applicantPage.continueToWizardStep(4)
      await applicantPage.continueToWizardStep(5)
      await expect(applicantPage.coverLetterTemplateField).toBeVisible()
      await expect(applicantPage.wizardFinishButton).toBeVisible()
    })

    test("then starts job search", async ({
      applicantPage,
      jobSearchPage,
    }) => {
      await applicantPage.wizardFinishButton.click()
      await jobSearchPage.waitForProgressToAppear()
      await jobSearchPage.waitForProgressToDisappearAndRequireVacancies()
    })
  })

  test.describe("follow-up start", () => {
    test.beforeAll(async ({ flowSession }) => {
      await flowSession.relaunch()
    })

    test("shows applicant list", async ({
      applicantListPage,
      firstStartPage,
    }) => {
      await applicantListPage.assertListVisible()
      await expect(firstStartPage.title).toHaveCount(0)
    })

    test("allows to select an applicant", async ({
      applicantListPage,
      applicantPage,
    }) => {
      await applicantListPage.openFirstApplicant()
      await expect(applicantPage.heading("Lebenslauf")).toBeVisible()
    })

    test("allows to download a resume", async ({ applicantPage, page }) => {
      // Verify the resume template button is visible and clickable
      const buttonLocator = applicantPage.resumeTemplateButton(
        MAIN_FLOW_SEED.resumeTemplateLabel,
      )
      await expect(buttonLocator).toBeVisible()
      await expect(buttonLocator).toBeEnabled()

      // Listen for console messages to detect download errors
      const consoleErrors: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text())
        }
      })

      // Click the download button — this triggers a mutation that:
      // 1. Fetches PDF via IPC
      // 2. Creates blob URL
      // 3. Clicks an anchor to download
      // We verify by checking the button becomes disabled then re-enabled.
      await buttonLocator.click()

      // Button should become disabled while mutation is pending
      await expect(buttonLocator).toBeDisabled({ timeout: 3_000 })

      // Then re-enabled when mutation completes
      await expect(buttonLocator).toBeEnabled({ timeout: 15_000 })

      // No console errors should have been logged
      expect(consoleErrors).toEqual([])
    })

    test("allows to select a job search", async ({
      applicantPage,
      jobSearchPage,
    }) => {
      await applicantPage.openFirstJobSearch()
      await expect(jobSearchPage.page).toHaveURL(/\/job-searches\//)
    })

    test("then shows list of found vacancies", async ({ jobSearchPage }) => {
      await expect
        .poll(() => jobSearchPage.vacancyCardCount())
        .toBeGreaterThanOrEqual(1)
    })

    test("allows to update them", async ({ jobSearchPage }) => {
      await jobSearchPage.refreshButton.click()
      await jobSearchPage.waitForProgressToAppear()
      await jobSearchPage.waitForProgressToDisappearAndRequireVacancies()
    })
  })
})
