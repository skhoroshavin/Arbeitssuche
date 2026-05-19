import type { Page } from "@playwright/test"

export class ElectronApiHelper {
  constructor(private readonly page: Page) {}

  async createApplicant(name: string): Promise<string> {
    const result = await this.invoke<{ id: string }>("applicants:create", name)
    return result.id
  }

  async getApplicant(id: string) {
    return this.invoke("applicants:load", id)
  }

  async updateApplicant(id: string, data: Record<string, unknown>) {
    await this.invoke("applicants:save", id, data)
  }

  async deleteApplicant(id: string) {
    await this.invoke("applicants:delete", id)
  }

  async createJobSearch(
    searchTerm: string,
    applicantId: string,
  ): Promise<string> {
    const result = await this.invoke<{ id: string }>(
      "job-searches:create",
      searchTerm,
      applicantId,
    )
    return result.id
  }

  async getJobSearch(id: string): Promise<E2eJobSearch> {
    return this.invoke<E2eJobSearch>("job-searches:load", id)
  }

  async deleteJobSearchesForApplicant(applicantId: string) {
    const result = await this.invoke<{ jobSearches: Array<{ id: string }> }>(
      "job-searches:list",
      applicantId,
    )

    await Promise.allSettled(
      result.jobSearches.map(async (jobSearch) => {
        await Promise.allSettled([
          this.invoke("job-searches:crawl:abort", jobSearch.id),
          this.invoke("vacancies:enrich:abort", jobSearch.id),
        ])
        await this.invoke("job-searches:delete", jobSearch.id)
      }),
    )
  }

  async seedVacancies(
    jobSearchId: string,
    vacancies: Record<string, unknown>[],
    latestCrawl: string,
  ): Promise<number> {
    try {
      await this.invoke(
        "job-searches:vacancies:seed",
        jobSearchId,
        vacancies,
        latestCrawl,
      )
      return 200
    } catch {
      return 400
    }
  }

  async getVacancyList(jobSearchId: string): Promise<E2eVacancyList> {
    return this.invoke<E2eVacancyList>(
      "job-searches:vacancies:list",
      jobSearchId,
    )
  }

  async getVacancy(jobSearchId: string, hash: string): Promise<E2eVacancy> {
    return this.invoke<E2eVacancy>(
      "job-searches:vacancies:load",
      jobSearchId,
      hash,
    )
  }

  async getVacancyCoverLetter(
    jobSearchId: string,
    hash: string,
  ): Promise<{ status: number; body: unknown }> {
    try {
      const body = await this.invoke(
        "vacancies:cover-letter:load",
        jobSearchId,
        hash,
      )
      return { status: 200, body }
    } catch {
      return { status: 404, body: null }
    }
  }

  async getConfig(): Promise<E2eConfig> {
    return this.invoke<E2eConfig>("settings:config:load")
  }

  async getLlmModels(): Promise<Array<{ id: string; name: string }>> {
    return this.invoke<Array<{ id: string; name: string }>>(
      "settings:llm-models",
    )
  }

  async testLlmProvider(providerId: string): Promise<{
    ok: boolean
    error?: string
  }> {
    return this.invoke<{ ok: boolean; error?: string }>(
      "settings:llm:secret:test",
      providerId,
    )
  }

  async testCommuteProvider(providerId: string): Promise<{
    ok: boolean
    error?: string
  }> {
    return this.invoke<{ ok: boolean; error?: string }>(
      "settings:commute:secret:test",
      providerId,
    )
  }

  private invoke<T>(channel: string, ...arguments_: unknown[]): Promise<T> {
    return this.page.evaluate(
      async ({ channel, arguments_ }) => {
        return (window as any).electronAPI.invoke(channel, ...arguments_)
      },
      { channel, arguments_ },
    ) as Promise<T>
  }
}

interface E2eJobSearch {
  jobSearch: {
    searchTerm: string
    radiusKm: number
    mode: string
    sources: Array<{ value: string }>
    maxResultsPerSource: number
    maxCommuteMinutes: number
    notes: string
    coverLetter: string
  }
  applicantId: string
}

interface E2eVacancyList {
  vacancies: E2eVacancy[]
  totalCount: number
  generatedAt: string
  latestCrawl: string
}

interface E2eVacancy {
  hash: string
  title: string
  company: string
  summary: string
  commute: Record<string, { distance: string }>
  sources: Array<{ site: string; url: string }>
}

interface E2eConfig {
  provider: string
  assessmentModel: string
  coverLetterModel: string
  consultationModel: string
}

export type { E2eConfig, E2eJobSearch, E2eVacancy, E2eVacancyList }
