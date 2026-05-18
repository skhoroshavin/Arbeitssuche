import { describe, expect, it } from "vitest"
import { resolveApplicant } from "."

describe("resolveApplicant", () => {
  it("fills missing collections and disclose flags", () => {
    expect(resolveApplicant({ personal: { name: "Ada" } })).toEqual({
      personal: { name: "Ada", hobbies: [] },
      disclose: {
        birthdate: false,
        gender: false,
        address: false,
        hobbies: false,
      },
      experience: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      personalNotes: "",
    })
  })
})
