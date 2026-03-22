interface CommuteDurations {
  morning: number;
  day: number;
  evening: number;
}

export interface CommuteResult {
  distance: string;
  durations: CommuteDurations;
  fetchedAt: string;
}

export interface CommuteClient {
  getCommute(origin: string, destination: string): Promise<CommuteResult>;
}
