import { GoogleMapsCommuteProvider } from "./google-maps"

export { GoogleMapsCommuteProvider } from "./google-maps"

export function getCommuteProviders(): readonly CommuteProviderInfo[] {
  return PROVIDERS.map(({ id, name, instructions }) => ({
    id,
    name,
    instructions,
  }))
}

export type CommuteProviderInfo = Pick<
  CommuteProvider,
  "id" | "name" | "instructions"
>

export function getCommuteProvider(providerId: string): CommuteProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown commute provider: ${providerId}`)
  }
  return provider
}

export interface CommuteProvider {
  readonly id: string
  readonly name: string
  readonly instructions: string
  createClient(apiKey: string): CommuteClient
  ping(apiKey: string): Promise<boolean>
}

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

const PROVIDERS: readonly CommuteProvider[] = [GoogleMapsCommuteProvider]

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}
