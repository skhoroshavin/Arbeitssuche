import type { LlmClient } from "@/plugins/llm"

import type { CommuteClient } from "@/plugins/commute"

import type { Applicant } from "@/models/applicant"

import type { SearchPreferences } from "@/models/job-search"

import type { Vacancy } from "@/models/vacancy/index.js"

import { formatError } from "@/utils"
import { rethrowIfAborted } from "./commute.js"

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
      rethrowIfAborted(error)
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
      context.preferences,
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
  preferences: SearchPreferences
}

interface EnricherDeps {
  llmClient?: LlmClient
  commuteClient?: CommuteClient
}

function resolveCommuteOrigin(applicant: Applicant): string | undefined {
  const address = applicant.personal.address
  if (!address) return undefined
  return `${address.street}, ${address.zip} ${address.city}`
}

function runLlmEnrichment(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
  llmClient: LlmClient,
  signal?: AbortSignal,
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, preferences, llmClient, signal).catch(
          (error) => {
            rethrowIfAborted(error)
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
          rethrowIfAborted(error)
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          )
          return
        })
      : undefined,
  ])
}
