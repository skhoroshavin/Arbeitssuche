import type { LlmClient } from "@/plugins/llm/types.js"
import type { CommuteClient } from "@/plugins/commute/types.js"
import type { Applicant } from "@/models/applicant/types.js"
import type { SearchPreferences } from "@/models/job-search/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/services/vacancy-scanner/format-error.js"
import { computeCommutes } from "./commute.js"
import { needsAssessment, assessVacancy } from "./assess.js"
import {
  needsContactExtraction,
  extractContactInfo,
  mergeContactInfo,
} from "./extract-contact.js"

export interface EnrichContext {
  applicant: Applicant
  preferences: SearchPreferences
}

export class VacancyEnricher {
  constructor(private readonly deps: EnricherDeps) {}

  async enrich(vacancy: Vacancy, context: EnrichContext): Promise<Vacancy> {
    const commuted = await this.tryComputeCommute(vacancy, context.applicant)
    const enriched = await this.tryLlmEnrich(commuted, context)
    return enriched.with({ enriched: true, enrichmentDirty: false })
  }

  private async tryComputeCommute(
    vacancy: Vacancy,
    applicant: Applicant,
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
      })
      return result.vacancies[0]
    } catch (error) {
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
  ): Promise<Vacancy> {
    if (!this.deps.llmClient) return vacancy

    const [assessmentResult, contactResult] = await runLlmEnrichment(
      vacancy,
      context.applicant,
      context.preferences,
      this.deps.llmClient,
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
    return updated
  }
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
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, preferences, llmClient).catch(
          (error) => {
            console.error(
              `Failed to assess "${vacancy.title}":`,
              formatError(error),
            )
            return
          },
        )
      : undefined,
    needsContactExtraction(vacancy)
      ? extractContactInfo(vacancy, llmClient).catch((error) => {
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          )
          return
        })
      : undefined,
  ])
}
