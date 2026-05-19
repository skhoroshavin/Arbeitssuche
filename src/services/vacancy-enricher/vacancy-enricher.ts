import type { LlmClient } from "@/plugins/llm"

import type { CommuteClient } from "@/plugins/commute"

import type { Applicant } from "@/models/applicant"

import type { JobSearch } from "@/models/job-search"

import type { Vacancy } from "@/models/vacancy/index.js"

import { formatError } from "@/services/vacancy-scanner/index.js"

import { computeCommutes } from "./commute.js"

import { needsAssessment, assessVacancy } from "./assess.js"

import {
  needsContactExtraction,
  extractContactInfo,
  mergeContactInfo,
} from "./extract-contact.js"

export class VacancyEnricher {
  constructor(private readonly deps: EnricherDeps) {}

  async enrich(
    vacancy: Vacancy,
    context: EnrichContext,
    signal?: AbortSignal,
  ): Promise<Vacancy> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    const commuted = await this.tryComputeCommute(
      vacancy,
      context.applicant,
      signal,
    )
    const { result, successful } = await this.tryLlmEnrich(
      commuted,
      context,
      signal,
    )
    if (successful) {
      return result.with({ enriched: true, enrichmentDirty: false })
    }
    return result
  }

  private async tryComputeCommute(
    vacancy: Vacancy,
    applicant: Applicant,
    signal?: AbortSignal,
  ): Promise<Vacancy> {
    const origin = resolveCommuteOrigin(applicant)
    if (!this.deps.commuteClient || !origin || vacancy.addresses.length === 0) {
      return vacancy
    }
    try {
      const result = await computeCommutes({
        vacancies: [vacancy],
        origin,
        commuteClient: this.deps.commuteClient,
        signal,
      })
      return result.vacancies[0]
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error
      console.error(
        `Failed to compute commute for "${vacancy.title}":`,
        formatError(error),
      )
      return vacancy
    }
  }

  private async tryLlmEnrich(
    vacancy: Vacancy,
    context: EnrichContext,
    signal?: AbortSignal,
  ): Promise<{ result: Vacancy; successful: boolean }> {
    if (!this.deps.llmClient) return { result: vacancy, successful: false }

    const [assessmentResult, contactResult] = await runLlmEnrichment(
      vacancy,
      context.applicant,
      context.jobSearch,
      this.deps.llmClient,
      signal,
    )

    let updated = vacancy
    if (assessmentResult) {
      updated = updated.with({
        summary: assessmentResult.summary,
        matchScore: assessmentResult.matchScore,
      })
    }
    if (contactResult) {
      updated = mergeContactInfo(updated, contactResult)
    }

    const anySucceeded = !!(assessmentResult || contactResult)
    const noneNeeded =
      !needsAssessment(vacancy) && !needsContactExtraction(vacancy)
    return { result: updated, successful: anySucceeded || noneNeeded }
  }
}

export interface EnrichContext {
  applicant: Applicant
  jobSearch: JobSearch
}

interface EnricherDeps {
  llmClient?: LlmClient
  commuteClient?: CommuteClient
}

function resolveCommuteOrigin(applicant: Applicant): string | undefined {
  const { street, zip, city } = applicant.personal.address
  const parts = [street, zip, city].filter((s) => s.trim().length > 0)
  if (parts.length === 0) return undefined
  return `${street}, ${zip} ${city}`
}

function runLlmEnrichment(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
  llmClient: LlmClient,
  signal?: AbortSignal,
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, jobSearch, llmClient, signal).catch(
          (error) => {
            if (error instanceof DOMException && error.name === "AbortError")
              throw error
            console.error(
              `Failed to assess "${vacancy.title}":`,
              formatError(error),
            )
            return
          },
        )
      : undefined,
    needsContactExtraction(vacancy)
      ? extractContactInfo(vacancy, llmClient, signal).catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError")
            throw error
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          )
          return
        })
      : undefined,
  ])
}
