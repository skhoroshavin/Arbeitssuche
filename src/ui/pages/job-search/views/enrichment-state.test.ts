import { describe, expect, it } from "vitest"
import { deriveEnrichmentState } from "@/ui/pages/job-search"

describe("deriveEnrichmentState", () => {
  it("shows pending only while enrichment is active", () => {
    expect(deriveEnrichmentState(false, true, true)).toBe("pending")
    expect(deriveEnrichmentState(true, true, true)).toBe("pending")
  })

  it("falls back to plain for unenriched dirty vacancies after cancellation", () => {
    expect(deriveEnrichmentState(false, true, false)).toBe("plain")
  })

  it("falls back to stale for enriched dirty vacancies after cancellation", () => {
    expect(deriveEnrichmentState(true, true, false)).toBe("stale")
  })
})
