import { createGoogleMapsCommuteClient } from "./google-maps/index.js";
import { googleMapsProviderInfo } from "./google-maps/index.js";
import type { CommuteClient, CommuteProviderInfo } from "./types.js";
export { createStubCommuteClient } from "./stub/index.js";
export { createGoogleMapsCommuteClient } from "./google-maps/index.js";

export function getCommuteProviders(): CommuteProviderInfo[] {
  return [googleMapsProviderInfo];
}

export function createCommuteClient(
  provider: string,
  apiKey: string,
): CommuteClient {
  switch (provider) {
    case "google-maps": {
      return createGoogleMapsCommuteClient(apiKey);
    }
    default: {
      throw new Error(`Unknown commute provider: ${provider}`);
    }
  }
}
