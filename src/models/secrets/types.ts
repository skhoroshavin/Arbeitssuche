export interface Secrets {
  openrouterApiKey?: string
  requestyApiKey?: string
  googleMapsApiKey?: string
}

export interface MaskedSecret {
  masked: string
  isSet: boolean
}

export type SecretKey =
  | "openrouterApiKey"
  | "requestyApiKey"
  | "googleMapsApiKey"
