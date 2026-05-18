export interface AppConfig {
  provider?: LlmProvider
  assessmentModel?: string
  coverLetterModel?: string
  consultationModel?: string
}

export type LlmProvider = "openrouter" | "requesty"

export type ConfigKey =
  | "provider"
  | "assessmentModel"
  | "coverLetterModel"
  | "consultationModel"

export interface LlmModel {
  id: string
  name: string
  pricing: { prompt: string; completion: string }
}

export interface Address {
  street: string
  zip: string
  city: string
}

export { resolveConfig } from "./resolve.js"
export {
  DEFAULT_PROVIDER,
  DEFAULT_CONFIG,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "./constants.js"

export * from "./schemas.js"
