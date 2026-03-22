import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createStubCommuteClient } from "@/plugins/commute/stub/index.js";

describe("StubCommuteClient", () => {
  test("returns default result", async () => {
    const client = createStubCommuteClient();
    const result = await client.getCommute("Berlin", "Munich");
    assert.equal(result.distance, "10.0 km");
    assert.ok(result.durations.morning);
    assert.ok(result.fetchedAt);
  });

  test("returns configured single result", async () => {
    const custom = {
      distance: "50 km",
      durations: { morning: 60, day: 45, evening: 70 },
      fetchedAt: "2026-01-01",
    };
    const client = createStubCommuteClient(custom);
    const result = await client.getCommute("A", "B");
    assert.deepEqual(result, custom);
  });

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
    ]);
    const client = createStubCommuteClient(results);
    const result = await client.getCommute("Berlin", "Munich");
    assert.equal(result.distance, "600 km");

    const fallback = await client.getCommute("Berlin", "Hamburg");
    assert.equal(fallback.distance, "10.0 km");
  });
});
