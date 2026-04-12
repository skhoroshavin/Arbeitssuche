import type { Secrets } from "@/models/secrets"

export function resolveSecrets(data?: Secrets): Secrets {
  return {
    openrouterApiKey: data?.openrouterApiKey,
    requestyApiKey: data?.requestyApiKey,
    googleMapsApiKey: data?.googleMapsApiKey,
  }
}
