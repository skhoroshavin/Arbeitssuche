export type { Address, LlmModel, LlmProvider, ConfigKey } from "./config.js"
export { Config } from "./config.js"
export {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "./config.js"

// Legacy exports — removed after consumer migration
export type { AppConfig } from "./config.js"

export { resolveConfig } from "./resolve.js"
export {
  LlmProviderInfoSchema,
  CommuteProviderInfoSchema,
  LlmModelSchema,
  ResolvedConfigSchema,
} from "./schemas.js"
