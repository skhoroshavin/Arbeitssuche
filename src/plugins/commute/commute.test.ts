import { test, describe, expect } from "vitest"
import { createStubCommuteClient } from "@/plugins/commute/index.js"

describe("StubCommuteClient", () => {
  test("returns default result", async () => {
    const client = createStubCommuteClient()
    const result = await client.getCommute("Berlin", "Munich")
    expect(result.distance).toBe("10.0 km")
    expect(result.durations.morning).toBeTruthy()
    expect(result.fetchedAt).toBeTruthy()
  })

  test("returns configured single result", async () => {
    const custom = {
      distance: "50 km",
      durations: { morning: 60, day: 45, evening: 70 },
      fetchedAt: "2026-01-01",
    }
    const client = createStubCommuteClient(custom)
    const result = await client.getCommute("A", "B")
    expect(result).toEqual(custom)
  })

  test("returns destination-specific results from map", async () => {
    const results = new Map([
      [
        "Munich",
        {
          distance: "600 km",
          durations: { morning: 300, day: 240, evening: 300 },
          fetchedAt: "2026-01-01",
        },
      ],
    ])
    const client = createStubCommuteClient(results)
    const result = await client.getCommute("Berlin", "Munich")
    expect(result.distance).toBe("600 km")

    const fallback = await client.getCommute("Berlin", "Hamburg")
    expect(fallback.distance).toBe("10.0 km")
  })
})
