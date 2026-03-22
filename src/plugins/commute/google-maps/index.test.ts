import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createGoogleMapsCommuteClient } from "./index.js";

const API_PATTERN = "maps.googleapis.com/maps/api/distancematrix";

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

      assert.equal(result.distance, "15.3 km");
      assert.equal(result.durations.morning, 32);
      assert.equal(result.durations.day, 32);
      assert.equal(result.durations.evening, 32);
      assert.ok(result.fetchedAt);
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

      assert.equal(requestedUrls.length, 3);
      for (const url of requestedUrls) {
        assert.ok(url.includes(API_PATTERN));
        assert.ok(url.includes("key=test-key"));
        assert.ok(url.includes("mode=transit"));
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
      await assert.rejects(() => client.getCommute("A", "B"), {
        message: /Distance Matrix API status: REQUEST_DENIED/,
      });
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
      await assert.rejects(() => client.getCommute("A", "Nowhere"), {
        message: /No route found for "Nowhere"/,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
