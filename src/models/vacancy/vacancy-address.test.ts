import { describe, it, expect } from "vitest"
import { VacancyAddress } from "."

describe("VacancyAddress", () => {
  it("fromString puts whole string into street", () => {
    const addr = VacancyAddress.fromString("Berlin")
    expect(addr.street).toBe("Berlin")
    expect(addr.zip).toBe("")
    expect(addr.city).toBe("")
    expect(addr.format()).toBe("Berlin")
  })

  it("parse handles object with commute", () => {
    const addr = VacancyAddress.parse({
      street: "Musterstraße 1",
      zip: "10115",
      city: "Berlin",
      commute: {
        distance: "10 km",
        durations: { morning: 25, day: 20, evening: 30 },
        fetchedAt: "2026-01-01",
      },
    })
    expect(addr.street).toBe("Musterstraße 1")
    expect(addr.zip).toBe("10115")
    expect(addr.city).toBe("Berlin")
    expect(addr.commute).toBeDefined()
    expect(addr.commute?.durations.morning).toBe(25)
  })

  it("parse handles plain object without commute", () => {
    const addr = VacancyAddress.parse({ street: "X", zip: "Y", city: "Z" })
    expect(addr.commute).toBeUndefined()
  })
})
