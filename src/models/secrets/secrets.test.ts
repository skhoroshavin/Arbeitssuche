import { describe, expect, it } from "vitest"
import { Secrets } from "@/models/secrets"

describe("Secrets", () => {
  it("default constructor produces empty strings", () => {
    const s = new Secrets()
    expect(s.openrouterApiKey).toBe("")
    expect(s.requestyApiKey).toBe("")
    expect(s.googleMapsApiKey).toBe("")
  })

  it("parse fills missing fields with empty strings", () => {
    const s = Secrets.parse({})
    expect(s.openrouterApiKey).toBe("")
    expect(s.requestyApiKey).toBe("")
    expect(s.googleMapsApiKey).toBe("")
  })

  it("parse preserves provided values", () => {
    const s = Secrets.parse({
      openrouterApiKey: "sk-test",
      googleMapsApiKey: "maps-test",
    })
    expect(s.openrouterApiKey).toBe("sk-test")
    expect(s.requestyApiKey).toBe("")
    expect(s.googleMapsApiKey).toBe("maps-test")
  })
})
