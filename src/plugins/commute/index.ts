import { googleMapsProviderInfo } from "./google-maps/index.js";
import type { CommuteProviderInfo } from "./types.js";

export type { CommuteProviderInfo } from "./types.js";

export function getCommuteProviders(): CommuteProviderInfo[] {
  return [googleMapsProviderInfo];
}
