export interface AppConfig {
  assessmentModel?: string;
  coverLetterModel?: string;
  consultationModel?: string;
}

export type ConfigKey =
  | "assessmentModel"
  | "coverLetterModel"
  | "consultationModel";

export const DEFAULT_CONFIG: AppConfig = {};

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
}

export const DEFAULT_ASSESSMENT_MODEL = "google/gemini-2.5-flash";
export const DEFAULT_COVER_LETTER_MODEL = "anthropic/claude-opus-4";
export const DEFAULT_CONSULTATION_MODEL = "google/gemini-2.5-flash";
