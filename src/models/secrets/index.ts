export { Secrets } from "./secrets.js"

export interface MaskedSecret {
  masked: string
  isSet: boolean
}

export type SecretKey =
  | "openrouterApiKey"
  | "requestyApiKey"
  | "googleMapsApiKey"
