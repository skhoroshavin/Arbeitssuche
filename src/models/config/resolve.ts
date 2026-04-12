import type { AppConfig, LlmProvider } from "@/models/config"

import {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "@/models/config/constants.js"

export function resolveConfig(config: AppConfig): ResolvedConfig {
  return {
    provider: config.provider ?? DEFAULT_PROVIDER,
    assessmentModel: config.assessmentModel ?? DEFAULT_ASSESSMENT_MODEL,
    coverLetterModel: config.coverLetterModel ?? DEFAULT_COVER_LETTER_MODEL,
    consultationModel: config.consultationModel ?? DEFAULT_CONSULTATION_MODEL,
  }
}

export interface ResolvedConfig {
  provider: LlmProvider
  assessmentModel: string
  coverLetterModel: string
  consultationModel: string
}
