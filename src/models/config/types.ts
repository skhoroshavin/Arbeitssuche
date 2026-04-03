export type LlmProvider = "openrouter" | "requesty";

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

export interface LlmModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
}

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
