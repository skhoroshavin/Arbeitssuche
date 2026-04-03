import { createGoogleMapsCommuteClient } from "./google-maps"
import { googleMapsProviderInfo } from "./google-maps"
import type { CommuteClient, CommuteProviderInfo } from "./types.js"
export { createStubCommuteClient } from "./stub"
export { createGoogleMapsCommuteClient } from "./google-maps"

export function getCommuteProviders(): CommuteProviderInfo[] {
  return [googleMapsProviderInfo]
}

export function createCommuteClient(
  provider: string,
  apiKey: string,
): CommuteClient {
  switch (provider) {
    case "google-maps": {
      return createGoogleMapsCommuteClient(apiKey)
    }
    default: {
      throw new Error(`Unknown commute provider: ${provider}`)
    }
  }
}
