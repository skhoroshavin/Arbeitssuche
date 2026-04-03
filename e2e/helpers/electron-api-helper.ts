import type { Page } from "@playwright/test"

export class ElectronApiHelper {
  constructor(private readonly page: Page) {}

  async createApplicant(name: string): Promise<string> {
    const result = await this.page.evaluate(async (name) => {
      return (window as any).electronAPI.invoke("applicants:create", name)
    }, name)
    return (result as { id: string }).id
  }

  async getApplicant(id: string) {
    return this.page.evaluate(async (id) => {
      return (window as any).electronAPI.invoke("applicants:load", id)
    }, id)
  }

  async updateApplicant(id: string, data: Record<string, unknown>) {
    await this.page.evaluate(
      async ({ id, data }) => {
        await (window as any).electronAPI.invoke("applicants:save", id, data)
      },
      { id, data },
    )
  }

  async deleteApplicant(id: string) {
    await this.page.evaluate(async (id) => {
      await (window as any).electronAPI.invoke("applicants:delete", id)
    }, id)
  }

  async createJobSearch(
    searchTerm: string,
    applicantId: string,
  ): Promise<string> {
    const result = await this.page.evaluate(
      async ({ searchTerm, applicantId }) => {
        return (window as any).electronAPI.invoke(
          "job-searches:create",
          searchTerm,
          applicantId,
        )
      },
      { searchTerm, applicantId },
    )
    return (result as { id: string }).id
  }

  async deleteJobSearchesForApplicant(applicantId: string) {
    await this.page.evaluate(async (applicantId) => {
      const result = await (window as any).electronAPI.invoke(
        "job-searches:list",
        applicantId,
      )
      for (const js of result.jobSearches) {
        await (window as any).electronAPI.invoke("job-searches:delete", js.id)
      }
    }, applicantId)
  }

  async seedVacancies(
    jobSearchId: string,
    vacancies: Record<string, unknown>[],
    latestCrawl: string,
  ): Promise<number> {
    return this.page.evaluate(
      async ({ jobSearchId, vacancies, latestCrawl }) => {
        try {
          await (window as any).electronAPI.invoke(
            "job-searches:vacancies:seed",
            jobSearchId,
            vacancies,
            latestCrawl,
          )
          return 200
        } catch {
          return 400
        }
      },
      { jobSearchId, vacancies, latestCrawl },
    )
  }

  async getVacancyCoverLetter(
    jobSearchId: string,
    hash: string,
  ): Promise<{ status: number; body: unknown }> {
    return this.page.evaluate(
      async ({ jobSearchId, hash }) => {
        try {
          const body = await (window as any).electronAPI.invoke(
            "job-searches:vacancies:cover-letter:load",
            jobSearchId,
            hash,
          )
          return { status: 200, body }
        } catch {
          return { status: 404, body: null }
        }
      },
      { jobSearchId, hash },
    )
  }

  async getSecrets(): Promise<Record<string, string>> {
    return this.page.evaluate(async () => {
      return (window as any).electronAPI.invoke("settings:secrets:load-raw")
    }) as Promise<Record<string, string>>
  }

  async saveSecrets(data: Record<string, string>) {
    await this.page.evaluate(async (data) => {
      await (window as any).electronAPI.invoke("settings:secrets:save", data)
    }, data)
  }
}
