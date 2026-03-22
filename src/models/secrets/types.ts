export interface Secrets {
  openrouterApiKey?: string;
  requestyApiKey?: string;
  googleMapsApiKey?: string;
}

export interface MaskedSecret {
  masked: string;
  isSet: boolean;
}

export type SecretKey =
  | "openrouterApiKey"
  | "requestyApiKey"
  | "googleMapsApiKey";

export type MaskedSecrets = Record<SecretKey, MaskedSecret>;

export interface SecretKeyInfo {
  key: SecretKey;
  label: string;
  helpUrl: string;
  helpLabel: string;
  helpSteps: string[];
}

export const DEFAULT_SECRETS: Secrets = {};
