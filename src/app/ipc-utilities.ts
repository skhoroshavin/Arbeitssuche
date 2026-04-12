import type { SecretKey } from "@/models/secrets"

export const LLM_SECRET_KEYS = {
  openrouter: "openrouterApiKey",
  requesty: "requestyApiKey",
} satisfies Record<string, SecretKey>

export const COMMUTE_SECRET_KEYS = {
  "google-maps": "googleMapsApiKey",
} satisfies Record<string, SecretKey>

export function maskedSecretsFor(
  mapping: SecretKeyMapping,
  secrets: Partial<Record<SecretKey, string | undefined>>,
): Record<string, { masked: string; isSet: boolean }> {
  const result: Record<string, { masked: string; isSet: boolean }> = {}
  for (const [providerId, key] of Object.entries(mapping)) {
    const value = secrets[key]
    result[providerId] = { masked: maskToken(value), isSet: !!value }
  }
  return result
}

export function resolveSecretKey(
  providerId: string,
  mapping: SecretKeyMapping,
): SecretKey {
  if (!hasProvider(mapping, providerId))
    throw new Error(`Unknown provider: ${providerId}`)
  return mapping[providerId]
}

type SecretKeyMapping = typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS

function maskToken(token?: string): string {
  if (!token) return ""
  if (token.length <= 8) return token.slice(0, 2) + "••••••••" + token.slice(-2)
  return token.slice(0, 4) + "••••••••" + token.slice(-4)
}

function hasProvider<M extends Record<string, SecretKey>>(
  mapping: M,
  id: string,
): id is string & keyof M {
  return id in mapping
}
