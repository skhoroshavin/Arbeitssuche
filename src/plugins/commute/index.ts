export interface CommuteClient {
  getCommute(
    origin: string,
    destination: string,
    signal?: AbortSignal,
  ): Promise<CommuteResult>
  ping(): Promise<boolean>
}

export interface CommuteResult {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

export interface CommuteProvider {
  readonly id: string
  readonly name: string
  readonly instructions: string
  createClient(apiKey: string): CommuteClient
  ping(apiKey: string): Promise<boolean>
}

export type CommuteProviderInfo = Pick<
  CommuteProvider,
  "id" | "name" | "instructions"
>

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}

export { GoogleMapsCommuteProvider } from "./google-maps"
export { createStubCommuteClient } from "./stub"

import { GoogleMapsCommuteProvider } from "./google-maps"

const PROVIDERS: readonly CommuteProvider[] = [GoogleMapsCommuteProvider]

export function getCommuteProviders(): readonly CommuteProviderInfo[] {
  return PROVIDERS
}

export function getCommuteProvider(providerId: string): CommuteProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown commute provider: ${providerId}`)
  }
  return provider
}
