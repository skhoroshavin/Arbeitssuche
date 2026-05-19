import { describe, expect, it } from "vitest"
import { Secrets } from "@/models/secrets"

describe("Secrets", () => {
  it("default constructor produces undefined fields", () => {
    const s = new Secrets()
    expect(s.openrouterApiKey).toBeUndefined()
    expect(s.requestyApiKey).toBeUndefined()
    expect(s.googleMapsApiKey).toBeUndefined()
  })

  it("parse fills missing fields with undefined", () => {
    const s = Secrets.parse({})
    expect(s.openrouterApiKey).toBeUndefined()
    expect(s.requestyApiKey).toBeUndefined()
    expect(s.googleMapsApiKey).toBeUndefined()
  })

  it("parse preserves provided values", () => {
    const s = Secrets.parse({
      openrouterApiKey: "sk-test",
      googleMapsApiKey: "maps-test",
    })
    expect(s.openrouterApiKey).toBe("sk-test")
    expect(s.requestyApiKey).toBeUndefined()
    expect(s.googleMapsApiKey).toBe("maps-test")
  })
})
