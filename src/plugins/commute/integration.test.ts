import { describe, test, expect } from "vitest"
import { GoogleMapsCommuteProvider } from "@/plugins/commute"
import { requireEnv } from "@/test-helpers"

describe("Google Maps CommuteProvider", () => {
  const apiKey = requireEnv("GOOGLE_MAPS_API_KEY")

  test("ping returns true with a valid API key", async () => {
    const result = await GoogleMapsCommuteProvider.ping(apiKey)
    expect(result).toBe(true)
  })

  test("createClient returns commute data for Berlin to Munich", async () => {
    const client = GoogleMapsCommuteProvider.createClient(apiKey)
    const result = await client.getCommute("Berlin", "Munich")
    expect(result.distance).toBeTruthy()
    expect(result.durations.morning).toBeGreaterThan(0)
    expect(result.fetchedAt).toBeTruthy()
  })

  test("ping returns false with an invalid API key", async () => {
    const result = await GoogleMapsCommuteProvider.ping("invalid-key")
    expect(result).toBe(false)
  })
})
