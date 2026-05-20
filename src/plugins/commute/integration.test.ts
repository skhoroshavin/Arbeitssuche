import { describe, test, expect } from "vitest"
import { GoogleMapsCommuteProvider } from "@/plugins/commute"

describe("Google Maps CommuteProvider", () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  test.skipIf(!apiKey)("ping returns true with a valid API key", async () => {
    const result = await GoogleMapsCommuteProvider.ping(apiKey ?? "")
    expect(result).toBe(true)
  })

  test.skipIf(!apiKey)(
    "createClient returns commute data for Berlin to Munich",
    async () => {
      const client = GoogleMapsCommuteProvider.createClient(apiKey ?? "")
      const result = await client.getCommute("Berlin", "Munich")
      expect(result.distance).toBeTruthy()
      expect(result.durations.morning).toBeGreaterThan(0)
      expect(result.fetchedAt).toBeTruthy()
    },
  )

  test("ping returns false with an invalid API key", async () => {
    const result = await GoogleMapsCommuteProvider.ping("invalid-key")
    expect(result).toBe(false)
  })
})
