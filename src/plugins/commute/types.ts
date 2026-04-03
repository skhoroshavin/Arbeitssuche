export interface CommuteResult {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

export interface CommuteClient {
  getCommute(origin: string, destination: string): Promise<CommuteResult>
  ping(): Promise<boolean>
}

export interface CommuteProviderInfo {
  id: string
  name: string
  instructions: string
}

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}
