import { test, describe, expect } from "vitest";
import { createGoogleMapsCommuteClient } from "./index";

const API_PATTERN = "maps\\.googleapis\\.com/maps/api/distancematrix";

function matrixResponse(distanceText: string, durationSeconds: number): object {
  return {
    status: "OK",
    rows: [
      {
        elements: [
          {
            status: "OK",
            distance: { text: distanceText },
            duration: { value: durationSeconds },
          },
        ],
      },
    ],
  };
}

function createStubFetch(response: object) {
  const requestedUrls: string[] = [];
  const stubFetch = async (
    url: string,
    _init?: RequestInit,
  ): Promise<Response> => {
    requestedUrls.push(url);
    return new Response(JSON.stringify(response), { status: 200 });
  };
  return { fetch: stubFetch as typeof globalThis.fetch, requestedUrls };
}

describe("GoogleMapsCommuteClient", () => {
  test("returns durations as rounded minutes", async () => {
    const response = matrixResponse("15.3 km", 1890);
    const { fetch: stubFetch } = createStubFetch(response);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch;

    try {
      const client = createGoogleMapsCommuteClient("test-api-key");
      const result = await client.getCommute("Berlin", "Potsdam");

      expect(result.distance).toBe("15.3 km");
      expect(result.durations.morning).toBe(32);
      expect(result.durations.day).toBe(32);
      expect(result.durations.evening).toBe(32);
      expect(result.fetchedAt).toBeTruthy();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("makes three API calls with different departure times", async () => {
    const response = matrixResponse("10 km", 600);
    const { fetch: stubFetch, requestedUrls } = createStubFetch(response);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch;

    try {
      const client = createGoogleMapsCommuteClient("test-key");
      await client.getCommute("A", "B");

      expect(requestedUrls.length).toBe(3);
      for (const url of requestedUrls) {
        expect(url).toMatch(new RegExp(API_PATTERN));
        expect(url).toMatch(/key=test-key/);
        expect(url).toMatch(/mode=transit/);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws on API error status", async () => {
    const response = { status: "REQUEST_DENIED", rows: [] };
    const { fetch: stubFetch } = createStubFetch(response);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch;

    try {
      const client = createGoogleMapsCommuteClient("bad-key");
      await expect(() => client.getCommute("A", "B")).rejects.toThrow(
        /Distance Matrix API status: REQUEST_DENIED/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws when no route found", async () => {
    const response = {
      status: "OK",
      rows: [{ elements: [{ status: "ZERO_RESULTS" }] }],
    };
    const { fetch: stubFetch } = createStubFetch(response);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch;

    try {
      const client = createGoogleMapsCommuteClient("test-key");
      await expect(() => client.getCommute("A", "Nowhere")).rejects.toThrow(
        /No route found for "Nowhere"/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
