export const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"
export const MAPS_LABEL = "Google Maps API-Schlüssel"

export function readRequiredLiveCredentials(): LiveCredentials {
  return {
    openrouterApiKey: readRequiredEnvironmentVariable("OPENROUTER_API_KEY"),
    googleMapsApiKey: readRequiredEnvironmentVariable("GOOGLE_MAPS_API_KEY"),
  }
}

function readRequiredEnvironmentVariable(
  name: keyof typeof REQUIRED_E2E_ENV,
): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Missing required E2E environment variable: ${REQUIRED_E2E_ENV[name]} (${name})`,
    )
  }
  return value
}

export const REQUIRED_E2E_ENV = {
  OPENROUTER_API_KEY: "OpenRouter",
  GOOGLE_MAPS_API_KEY: "Google Maps",
} as const

interface LiveCredentials {
  openrouterApiKey: string
  googleMapsApiKey: string
}
