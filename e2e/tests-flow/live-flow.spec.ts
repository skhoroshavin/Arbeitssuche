import { test, expect } from "../fixtures.js"
import { finishFirstStartSettingsWithLiveCredentials } from "../helpers/live-e2e-setup.js"
import { LiveFlowHelper } from "../helpers/live-flow-helper.js"

test.describe("Live major flow", () => {
  test.describe.configure({ timeout: 300_000 })

  test("crawls arbeitsagentur, enriches vacancies, computes commute, and generates a cover letter", async ({
    applicantListPage,
    applicantPage,
    firstStartPage,
    jobSearchPage,
    page,
    settingsPage,
  }) => {
    const consoleErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })

    const helper = new LiveFlowHelper(
      applicantListPage,
      applicantPage,
      jobSearchPage,
    )

    await finishFirstStartSettingsWithLiveCredentials(
      firstStartPage,
      settingsPage,
    )

    await helper.completeFirstStartApplicantWithCity(`e2e-live-${Date.now()}`)
    const jobSearchId =
      await helper.completeFirstStartJobSearchWithBoundedResults(
        "Softwareentwickler",
      )

    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()

    const vacancyCount = await helper.startCrawlAndWaitForVacancies()
    expect(vacancyCount).toBeGreaterThanOrEqual(1)
    expect(vacancyCount).toBeLessThanOrEqual(5)

    await helper.enrichAllVisibleVacancies()
    expect(consoleErrors).toEqual([])

    await helper.openVacancyWithCommute(jobSearchId)

    await expect(jobSearchPage.summaryHeading).toBeVisible()
    await expect(jobSearchPage.commuteHeading).toBeVisible()
    await expect(jobSearchPage.sourceLink("arbeitsagentur")).toBeVisible()
    await expect(jobSearchPage.coverLetterInput).toBeVisible()

    await jobSearchPage.generateButton.click()

    await expect
      .poll(
        async () => {
          return (await jobSearchPage.coverLetterInput.inputValue()).trim()
            .length
        },
        {
          timeout: 120_000,
          intervals: [1_000, 2_000, 5_000],
        },
      )
      .toBeGreaterThan(0)

    await expect(jobSearchPage.coverLetterInput).toHaveValue(/\S/)
  })
})
