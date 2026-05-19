import { expect } from "@playwright/test"
import type {
  E2eVacancy,
  E2eVacancyList,
  ElectronApiHelper,
} from "./electron-api-helper.js"
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
    private readonly api: ElectronApiHelper,
  ) {}

  async createApplicantWithCity(
    name: string,
    city = "Berlin",
  ): Promise<string> {
    await this.applicantListPage.goto()
    await this.applicantListPage.openCreateForm()
    await this.applicantListPage.page.getByLabel("Name").fill(name)
    await this.applicantListPage.page
      .getByLabel("Straße")
      .fill("Friedrichstraße 100")
    await this.applicantListPage.page.getByLabel("PLZ").fill("10117")
    await this.applicantListPage.page.getByLabel("Stadt").fill(city)
    await this.applicantListPage.advanceWizardToLastStep()
    await this.applicantListPage.wizardFinishButton.click()
    await expect(this.applicantPage.page).toHaveURL(/\/applicants\/[^/]+$/)
    return readApplicantId(this.applicantPage.page.url())
  }

  async createJobSearchWithBoundedResults(
    applicantId: string,
    searchTerm: string,
  ): Promise<string> {
    await this.applicantPage.goto(applicantId)
    await this.applicantPage.openWizard()
    await this.applicantPage.field("Suchbegriff").fill(searchTerm)
    await this.applicantPage.field("Max. Ergebnisse").fill("5")

    await this.applicantPage.wizardContinueButton.click()
    await expect(this.applicantPage.wizardStepHeading(2)).toBeVisible()

    await this.applicantPage.wizardContinueButton.click()
    await expect(this.applicantPage.wizardStepHeading(3)).toBeVisible()
    await this.applicantPage.page
      .getByRole("button", { name: "arbeitsagentur", exact: true })
      .click()

    await this.applicantPage.wizardContinueButton.click()
    await expect(this.applicantPage.wizardStepHeading(4)).toBeVisible()

    await this.applicantPage.wizardContinueButton.click()
    await expect(this.applicantPage.wizardStepHeading(5)).toBeVisible()
    await this.applicantPage.wizardFinishButton.click()

    await expect(this.jobSearchPage.page).toHaveURL(
      /\/job-searches\/[^/]+\/vacancies/,
    )

    const jobSearchId = readJobSearchId(this.jobSearchPage.page.url())
    const jobSearch = await this.api.getJobSearch(jobSearchId)
    expect(jobSearch.jobSearch.sources.map((s) => s.value)).toEqual([
      "arbeitsagentur",
    ])
    expect(jobSearch.jobSearch.maxResultsPerSource).toBe(5)

    return jobSearchId
  }

  async startCrawl(): Promise<void> {
    await expect(this.jobSearchPage.refreshButton).toBeEnabled()
    await this.jobSearchPage.refreshButton.click()
  }

  async waitForCrawlCompletion(jobSearchId: string): Promise<E2eVacancyList> {
    await expect
      .poll(
        async () => {
          const vacancyList = await this.api.getVacancyList(jobSearchId)
          const hasBoundedCount =
            vacancyList.totalCount >= 1 && vacancyList.totalCount <= 5
          const hasCommute = vacancyList.vacancies.some(
            (vacancy) => Object.keys(vacancy.commute).length > 0,
          )
          const refreshEnabled =
            await this.jobSearchPage.refreshButton.isEnabled()

          return refreshEnabled && hasBoundedCount && hasCommute
        },
        {
          timeout: 180_000,
          intervals: [1_000, 2_000, 5_000],
        },
      )
      .toBe(true)

    return this.api.getVacancyList(jobSearchId)
  }

  async enrichVacanciesAndWait(jobSearchId: string): Promise<E2eVacancyList> {
    if (await this.jobSearchPage.enrichAllButton.isVisible()) {
      await this.jobSearchPage.enrichAllButton.click()
    }

    let latestVacancyList = await this.api.getVacancyList(jobSearchId)

    try {
      await expect
        .poll(
          async () => {
            latestVacancyList = await this.api.getVacancyList(jobSearchId)
            return latestVacancyList.vacancies.some(
              (vacancy) => vacancy.summary.trim().length > 0,
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
        `Enrichment did not produce summaries: ${JSON.stringify(
          latestVacancyList.vacancies.map((vacancy) => ({
            hash: vacancy.hash,
            title: vacancy.title,
            hasSummary: vacancy.summary.trim().length > 0,
            hasCommute: Object.keys(vacancy.commute).length > 0,
          })),
        )}`,
      )
    }

    return latestVacancyList
  }

  pickEnrichedVacancy(vacancyList: E2eVacancyList): E2eVacancy {
    const vacancy = vacancyList.vacancies.find(
      (entry) =>
        entry.summary.trim().length > 0 &&
        Object.keys(entry.commute).length > 0 &&
        entry.sources.some((source) => source.site === "arbeitsagentur"),
    )

    if (!vacancy) {
      throw new Error("No enriched vacancy with commute data was found")
    }

    return vacancy
  }

  async openVacancy(jobSearchId: string, vacancy: E2eVacancy): Promise<void> {
    await this.jobSearchPage.vacancyCard(vacancy.hash).click()
    await expect(this.jobSearchPage.page).toHaveURL(
      new RegExp(`/job-searches/${jobSearchId}/vacancies/${vacancy.hash}$`),
    )
  }
}

function readApplicantId(url: string): string {
  const applicantId = /\/applicants\/([^/]+)$/.exec(url)?.[1]
  if (!applicantId) {
    throw new Error(`Failed to read applicant id from URL: ${url}`)
  }
  return applicantId
}

function readJobSearchId(url: string): string {
  const jobSearchId = /\/job-searches\/([^/]+)\/vacancies/.exec(url)?.[1]
  if (!jobSearchId) {
    throw new Error(`Failed to read job search id from URL: ${url}`)
  }
  return jobSearchId
}
