interface CommuteDurations {
  morning: string;
  day: string;
  evening: string;
}

export interface CommuteResult {
  distance: string;
  durations: CommuteDurations;
  fetchedAt: string;
}

export interface CommuteClient {
  getCommute(origin: string, destination: string): Promise<CommuteResult>;
}
