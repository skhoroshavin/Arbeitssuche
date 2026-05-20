import { test, describe, expect } from "vitest"
import { GoogleMapsCommuteProvider } from "."
import { FetchStub } from "@/test-helpers"

const API_PATTERN = "maps.googleapis.com/maps/api/distancematrix"

describe("GoogleMapsCommuteClient", () => {
  test("returns durations as rounded minutes", async () => {
    const response = matrixResponse("15.3 km", 1890)
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

    try {
      const client = GoogleMapsCommuteProvider.createClient("test-api-key")
      const result = await client.getCommute("Berlin", "Potsdam")

      expect(result.distance).toBe("15.3 km")
      expect(result.durations.morning).toBe(32)
      expect(result.durations.day).toBe(32)
      expect(result.durations.evening).toBe(32)
      expect(result.fetchedAt).toBeTruthy()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("makes three API calls with different departure times", async () => {
    const response = matrixResponse("10 km", 600)
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

    try {
      const client = GoogleMapsCommuteProvider.createClient("test-key")
      await client.getCommute("A", "B")

      expect(stub.requestedUrls.length).toBe(3)
      for (const url of stub.requestedUrls) {
        expect(url).toMatch(
          new RegExp(String.raw`maps\.googleapis\.com/maps/api/distancematrix`),
        )
        expect(url).toMatch(/key=test-key/)
        expect(url).toMatch(/mode=transit/)
      }
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("throws on API error status", async () => {
    const response = { status: "REQUEST_DENIED", rows: [] }
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

    try {
      const client = GoogleMapsCommuteProvider.createClient("bad-key")
      await expect(() => client.getCommute("A", "B")).rejects.toThrow(
        /Distance Matrix API status: REQUEST_DENIED/,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("throws when no route found", async () => {
    const response = {
      status: "OK",
      rows: [{ elements: [{ status: "ZERO_RESULTS" }] }],
    }
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

    try {
      const client = GoogleMapsCommuteProvider.createClient("test-key")
      await expect(() => client.getCommute("A", "Nowhere")).rejects.toThrow(
        /No route found for "Nowhere"/,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

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
  }
}
