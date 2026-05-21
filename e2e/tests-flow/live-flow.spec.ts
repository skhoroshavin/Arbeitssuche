import { test, expect } from "../fixtures.js"
import {
  assertLiveProvidersReady,
  configureLiveProviders,
} from "../helpers/live-e2e-setup.js"
import { LiveFlowHelper } from "../helpers/live-flow-helper.js"

test.describe("Live major flow", () => {
  test.describe.configure({ timeout: 300_000 })

  test("crawls arbeitsagentur, enriches vacancies, computes commute, and generates a cover letter", async ({
    applicantListPage,
    applicantPage,
    jobSearchPage,
    api,
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
      api,
    )

    await configureLiveProviders(settingsPage)
    await assertLiveProvidersReady(api)

    const applicantId = await helper.createApplicantWithCity(
      `e2e-live-${Date.now()}`,
    )
    const jobSearchId = await helper.createJobSearchWithBoundedResults(
      applicantId,
      "Softwareentwickler",
    )

    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()

    const crawledVacancyList = await helper.waitForCrawlCompletion(jobSearchId)
    expect(crawledVacancyList.totalCount).toBeGreaterThanOrEqual(1)
    expect(crawledVacancyList.totalCount).toBeLessThanOrEqual(5)
    expect(
      crawledVacancyList.vacancies.every((vacancy) =>
        vacancy.sources.some((source) => source.site === "arbeitsagentur"),
      ),
    ).toBe(true)

    const vacancyList = await helper.enrichVacanciesAndWait(jobSearchId)
    expect(consoleErrors).toEqual([])

    const vacancy = helper.pickEnrichedVacancy(vacancyList)
    await helper.openVacancy(jobSearchId, vacancy)

    const vacancyDetail = await api.getVacancy(jobSearchId, vacancy.hash)
    expect(vacancyDetail.summary.trim().length).toBeGreaterThan(0)
    expect(
      vacancyDetail.addresses.some((a: { commute?: unknown }) => a.commute),
    ).toBe(true)

    await expect(jobSearchPage.summaryHeading).toBeVisible()
    await expect(jobSearchPage.commuteHeading).toBeVisible()
    await expect(jobSearchPage.sourceLink("arbeitsagentur")).toBeVisible()
    await expect(jobSearchPage.coverLetterInput).toBeVisible()

    await jobSearchPage.generateButton.click()

    await expect
      .poll(
        async () => {
          const result = await api.getVacancyCoverLetter(
            jobSearchId,
            vacancy.hash,
          )
          if (result.status !== 200) {
            return 0
          }

          const body = result.body as { content?: string }
          return body.content?.trim().length ?? 0
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
