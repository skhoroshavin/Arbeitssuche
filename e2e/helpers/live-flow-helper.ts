import { expect } from "@playwright/test"
import type {
  ApplicantListPage,
  ApplicantPage,
  JobSearchPage,
} from "../pages/index.js"

export class LiveFlowHelper {
  constructor(
    private readonly applicantListPage: ApplicantListPage,
    private readonly applicantPage: ApplicantPage,
    private readonly jobSearchPage: JobSearchPage,
  ) {}

  async completeFirstStartApplicantWithCity(
    name: string,
    city = "Berlin",
  ): Promise<string> {
    await this.applicantListPage.assertWizardVisible()
    await this.applicantListPage.fillPersonalDetails({
      name,
      street: "Friedrichstraße 100",
      zip: "10117",
      city,
    })
    await this.applicantListPage.advanceWizardToLastStep()
    await this.applicantListPage.wizardFinishButton.click()
    await expect(this.applicantPage.page).toHaveURL(
      /\/first-start\/job-search\/[^/]+$/,
    )

    const applicantId = /\/first-start\/job-search\/([^/]+)$/
      .exec(this.applicantPage.page.url())?.[1]
    if (!applicantId) {
      throw new Error(
        `Failed to read applicant id from URL: ${this.applicantPage.page.url()}`,
      )
    }
    return applicantId
  }

  async completeFirstStartJobSearchWithBoundedResults(
    searchTerm: string,
  ): Promise<string> {
    await this.applicantPage.assertJobSearchWizardVisible()
    await this.applicantPage.field("Suchbegriff").fill(searchTerm)
    await this.applicantPage.field("Max. Ergebnisse").fill("5")

    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.sourceButton("arbeitsagentur").click()
    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.wizardFinishButton.click()

    await expect(this.jobSearchPage.page).not.toHaveURL(/\/first-start\//, {
      timeout: 20_000,
    })

    // Extract job search id from whatever URL we landed on
    const jobSearchId = /\/job-searches\/([^/]+)/.exec(
      this.jobSearchPage.page.url(),
    )?.[1]
    if (!jobSearchId) {
      throw new Error(
        `Failed to parse job search id from URL: ${this.jobSearchPage.page.url()}`,
      )
    }

    // Navigate to vacancies explicitly
    await this.jobSearchPage.gotoVacancies(jobSearchId)
    return jobSearchId
  }

  async startCrawlAndWaitForVacancies(): Promise<number> {
    await expect(this.jobSearchPage.refreshButton).toBeEnabled()
    await this.jobSearchPage.refreshButton.click()

    let latestCardCount = 0
    let latestSourceCount = 0
    let latestCommuteCardCount = 0

    try {
      await expect
        .poll(
          async () => {
            latestCardCount = await this.jobSearchPage.vacancyCardCount()
            latestSourceCount =
              await this.jobSearchPage.sourceChipCount("arbeitsagentur")
            latestCommuteCardCount =
              await this.jobSearchPage.vacancyCardCountWithCommute()
            const refreshEnabled =
              await this.jobSearchPage.refreshButton.isEnabled()

            return (
              refreshEnabled &&
              latestCardCount >= 1 &&
              latestCardCount <= 5 &&
              latestSourceCount === latestCardCount &&
              latestCommuteCardCount >= 1
            )
          },
          {
            timeout: 180_000,
            intervals: [1_000, 2_000, 5_000],
          },
        )
        .toBe(true)
    } catch {
      throw new Error(
        `Crawl did not finish with 1-5 arbeitsagentur cards and a visible commute result. cards=${latestCardCount}, sources=${latestSourceCount}, commuteCards=${latestCommuteCardCount}`,
      )
    }

    return latestCardCount
  }

  async enrichAllVisibleVacancies(): Promise<void> {
    if (await this.jobSearchPage.isEnrichAllButtonVisible()) {
      await this.jobSearchPage.enrichAllButton.click()
    }

    let latestCardCount = 0

    try {
      await expect
        .poll(
          async () => {
            latestCardCount = await this.jobSearchPage.vacancyCardCount()
            const enrichVisible =
              await this.jobSearchPage.isEnrichAllButtonVisible()
            return latestCardCount > 0 && !enrichVisible
          },
          {
            timeout: 180_000,
            intervals: [1_000, 2_000, 5_000],
          },
        )
        .toBe(true)
    } catch {
      throw new Error(
        `Enrichment did not finish in time. cards=${latestCardCount}`,
      )
    }
  }

  async openVacancyWithCommute(jobSearchId: string): Promise<void> {
    await this.jobSearchPage.firstVacancyCardWithCommute().click()
    await expect(this.jobSearchPage.page).toHaveURL(
      new RegExp(`/job-searches/${jobSearchId}/vacancies/[^/]+$`),
    )
  }
}
