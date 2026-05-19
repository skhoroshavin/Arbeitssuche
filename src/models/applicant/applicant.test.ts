import { describe, expect, it } from "vitest"
import { Applicant } from "@/models/applicant"

describe("Applicant", () => {
  it("default constructor produces empty applicant", () => {
    const a = new Applicant()
    expect(a.personal.name).toBe("")
    expect(a.personal.email).toBe("")
    expect(a.personal.hobbies).toBe("")
    expect(a.personal.discloseBirthdate).toBe(false)
    expect(a.experience).toEqual([])
    expect(a.personalNotes).toBe("")
    expect(a.isDifferentFromDefault()).toBe(false)
  })

  it("parse fills missing fields with defaults", () => {
    const a = Applicant.parse({ personal: { name: "Ada" } })
    expect(a.personal.name).toBe("Ada")
    expect(a.personal.email).toBe("")
    expect(a.personal.hobbies).toBe("")
    expect(a.personal.discloseBirthdate).toBe(false)
    expect(a.isDifferentFromDefault()).toBe(true)
  })

  it("parse migrates old disclose object into personal", () => {
    const a = Applicant.parse({
      personal: { name: "Ada" },
      disclose: {
        birthdate: true,
        gender: false,
        address: false,
        hobbies: false,
      },
    })
    expect(a.personal.discloseBirthdate).toBe(true)
    expect(a.personal.discloseGender).toBe(false)
  })

  it("parse migrates old string[] hobbies to string", () => {
    const a = Applicant.parse({
      personal: { name: "Ada", hobbies: ["cycling", "reading"] },
    })
    expect(a.personal.hobbies).toBe("cycling, reading")
  })

  it("llmFriendlyDescription returns formatted string", () => {
    const a = new Applicant()
    a.personal.name = "Ada"
    a.experience.push({
      role: "Dev",
      company: "ACME",
      startDate: "2020",
      endDate: "2024",
      location: "Berlin",
      discloseDates: false,
      highlights: ["Built stuff"],
    })
    const desc = a.llmFriendlyDescription()
    expect(desc).toContain("Name: Ada")
    expect(desc).toContain("Experience")
    expect(desc).toContain("Dev bei ACME")
  })
})
