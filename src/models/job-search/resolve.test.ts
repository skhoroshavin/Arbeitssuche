import { describe, expect, it } from "vitest"
import { resolveJobSearch } from "."

describe("resolveJobSearch", () => {
  it("fills missing fields with defaults", () => {
    expect(
      resolveJobSearch({ searchTerm: "React" }),
    ).toEqual({
      searchTerm: "React",
      radiusKm: 30,
      mode: "employment",
      sources: [],
      maxResultsPerSource: 0,
      maxCommuteMinutes: 0,
      notes: "",
      coverLetter: "",
    })
  })
})
