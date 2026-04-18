export type {
  CommuteClient,
  CommuteProviderInfo,
  CommuteResult,
} from "./types.js"

import {
  createGoogleMapsCommuteClient as buildGoogleMapsCommuteClient,
  googleMapsProviderInfo,
} from "./google-maps"
import type { CommuteClient, CommuteProviderInfo } from "./types.js"

export { createGoogleMapsCommuteClient } from "./google-maps"
export { createStubCommuteClient } from "./stub"

export function getCommuteProviders(): CommuteProviderInfo[] {
  return [googleMapsProviderInfo]
}

export function createCommuteClient(
  provider: string,
  apiKey: string,
): CommuteClient {
  switch (provider) {
    case "google-maps": {
      return buildGoogleMapsCommuteClient(apiKey)
    }
    default: {
      throw new Error(`Unknown commute provider: ${provider}`)
    }
  }
}
