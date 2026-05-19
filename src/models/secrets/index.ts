export { Secrets } from "./secrets.js"

export interface MaskedSecret {
  masked: string
  isSet: boolean
}

export type SecretKey =
  | "openrouterApiKey"
  | "requestyApiKey"
  | "googleMapsApiKey"

// Legacy exports — removed after consumer migration
export { resolveSecrets } from "./resolve.js"
export { MaskedSecretsRecordSchema, SecretTestResultSchema } from "./schemas.js"
