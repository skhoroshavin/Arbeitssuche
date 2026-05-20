import { describe, it, expect } from "vitest"
import { Address } from "."

describe("Address", () => {
  it("parses from zod-compatible object", () => {
    const address = Address.parse({
      street: "Musterstr. 1",
      zip: "10115",
      city: "Berlin",
    })
    expect(address.street).toBe("Musterstr. 1")
    expect(address.zip).toBe("10115")
    expect(address.city).toBe("Berlin")
  })

  it("applies defaults for missing fields", () => {
    const address = Address.parse({})
    expect(address.street).toBe("")
    expect(address.zip).toBe("")
    expect(address.city).toBe("")
  })

  it("formats full address", () => {
    const address = Address.parse({
      street: "Hauptstr. 1",
      zip: "10115",
      city: "Berlin",
    })
    expect(address.format()).toBe("Hauptstr. 1, 10115 Berlin")
  })

  it("formats city-only address", () => {
    const address = Address.parse({ city: "Berlin" })
    expect(address.format()).toBe("Berlin")
  })

  it("formats zip+city", () => {
    const address = Address.parse({ zip: "10115", city: "Berlin" })
    expect(address.format()).toBe("10115 Berlin")
  })

  it("returns empty string when all fields empty", () => {
    const address = new Address()
    expect(address.format()).toBe("")
  })

  it("isEmpty returns true when all fields empty", () => {
    const address = new Address()
    expect(address.isEmpty()).toBe(true)
  })

  it("isEmpty returns false when any field present", () => {
    const address = Address.parse({ city: "Berlin" })
    expect(address.isEmpty()).toBe(false)
  })

  it("isValid returns true when all fields present", () => {
    const address = Address.parse({ street: "S", zip: "Z", city: "C" })
    expect(address.isValid()).toBe(true)
  })

  it("isValid returns false when any field missing", () => {
    expect(Address.parse({ street: "S", zip: "Z" }).isValid()).toBe(false)
    expect(Address.parse({ street: "S", city: "C" }).isValid()).toBe(false)
    expect(Address.parse({ zip: "Z", city: "C" }).isValid()).toBe(false)
    expect(new Address().isValid()).toBe(false)
  })
})
