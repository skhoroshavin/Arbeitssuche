import type { CommuteResult, CommuteClient } from "@/plugins/commute/types.js";

const DEFAULT_RESULT: CommuteResult = {
  distance: "10.0 km",
  durations: { morning: 25, day: 20, evening: 30 },
  fetchedAt: "2020-01-01T00:00:00.000Z",
};

class StubCommuteClient implements CommuteClient {
  constructor(
    private readonly results?:
      | CommuteResult
      | Map<string, CommuteResult>
      | Error,
  ) {}

  async getCommute(
    _origin: string,
    destination: string,
  ): Promise<CommuteResult> {
    if (this.results instanceof Error) {
      throw this.results;
    }
    if (this.results instanceof Map) {
      return this.results.get(destination) ?? DEFAULT_RESULT;
    }
    return this.results ?? DEFAULT_RESULT;
  }
}

export function createStubCommuteClient(
  results?: CommuteResult | Map<string, CommuteResult> | Error,
): CommuteClient {
  return new StubCommuteClient(results);
}
