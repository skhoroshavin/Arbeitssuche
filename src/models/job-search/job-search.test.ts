import { describe, expect, it } from "vitest"
import { JobSearch } from "@/models/job-search"

describe("JobSearch", () => {
  it("default constructor produces default job search", () => {
    const index = new JobSearch()
    expect(index.searchTerm).toBe("")
    expect(index.radiusKm).toBe(30)
    expect(index.mode).toBe("employment")
    expect(index.sources).toEqual([])
    expect(index.isDifferentFromDefault()).toBe(false)
  })

  it("parse fills missing fields with defaults", () => {
    const index = JobSearch.parse({ searchTerm: "React" })
    expect(index.searchTerm).toBe("React")
    expect(index.radiusKm).toBe(30)
    expect(index.isDifferentFromDefault()).toBe(true)
  })

  it("isDifferentFromDefault returns false for defaults", () => {
    const index = new JobSearch()
    expect(index.isDifferentFromDefault()).toBe(false)
  })

  it("isDifferentFromDefault returns true when radius changes", () => {
    const index = new JobSearch()
    index.radiusKm = 50
    expect(index.isDifferentFromDefault()).toBe(true)
  })
})
