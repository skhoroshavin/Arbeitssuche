import type { Secrets } from "@/models/secrets/types.js"

export function resolveSecrets(data?: Secrets): Secrets {
  return {
    openrouterApiKey: data?.openrouterApiKey,
    requestyApiKey: data?.requestyApiKey,
    googleMapsApiKey: data?.googleMapsApiKey,
  }
}
