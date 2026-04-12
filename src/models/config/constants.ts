import type { AppConfig, LlmProvider } from "."

export const DEFAULT_PROVIDER: LlmProvider = "openrouter"

export const DEFAULT_CONFIG: AppConfig = {}

export const DEFAULT_ASSESSMENT_MODEL = "google/gemini-2.5-flash"
export const DEFAULT_COVER_LETTER_MODEL = "anthropic/claude-opus-4"
export const DEFAULT_CONSULTATION_MODEL = "google/gemini-2.5-flash"
