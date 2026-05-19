import { z } from "zod"

export type LlmProvider = "openrouter" | "requesty"

export interface Address {
  street: string
  zip: string
  city: string
}

export interface LlmModel {
  id: string
  name: string
  pricing: { prompt: string; completion: string }
}

export interface AppConfig {
  provider?: LlmProvider
  assessmentModel?: string
  coverLetterModel?: string
  consultationModel?: string
}

export type ConfigKey =
  | "provider"
  | "assessmentModel"
  | "coverLetterModel"
  | "consultationModel"

export const DEFAULT_PROVIDER: LlmProvider = "openrouter"
export const DEFAULT_ASSESSMENT_MODEL = "google/gemini-2.5-flash"
export const DEFAULT_COVER_LETTER_MODEL = "anthropic/claude-opus-4"
export const DEFAULT_CONSULTATION_MODEL = "google/gemini-2.5-flash"

export class Config {
  provider: LlmProvider = DEFAULT_PROVIDER
  assessmentModel: string = DEFAULT_ASSESSMENT_MODEL
  coverLetterModel: string = DEFAULT_COVER_LETTER_MODEL
  consultationModel: string = DEFAULT_CONSULTATION_MODEL

  static parse(data: unknown): Config {
    const parsed = ConfigInputSchema.parse(data)
    const config = new Config()
    config.provider = parsed.provider
    config.assessmentModel = parsed.assessmentModel
    config.coverLetterModel = parsed.coverLetterModel
    config.consultationModel = parsed.consultationModel
    return config
  }
}

const ConfigInputSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]).default(DEFAULT_PROVIDER),
  assessmentModel: z.string().default(DEFAULT_ASSESSMENT_MODEL),
  coverLetterModel: z.string().default(DEFAULT_COVER_LETTER_MODEL),
  consultationModel: z.string().default(DEFAULT_CONSULTATION_MODEL),
})
