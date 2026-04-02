export type LlmProvider = "openrouter" | "requesty";

export const DEFAULT_PROVIDER: LlmProvider = "openrouter";

export interface AppConfig {
  provider?: LlmProvider;
  assessmentModel?: string;
  coverLetterModel?: string;
  consultationModel?: string;
}

export type ConfigKey =
  | "provider"
  | "assessmentModel"
  | "coverLetterModel"
  | "consultationModel";

export const DEFAULT_CONFIG: AppConfig = {};

export interface LlmModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
}

export const DEFAULT_ASSESSMENT_MODEL = "google/gemini-2.5-flash";
export const DEFAULT_COVER_LETTER_MODEL = "anthropic/claude-opus-4";
export const DEFAULT_CONSULTATION_MODEL = "google/gemini-2.5-flash";

export interface LlmProviderInfo {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

export interface CommuteProviderInfo {
  id: string;
  name: string;
  instructions: string;
}

export interface Address {
  street: string;
  zip: string;
  city: string;
}
