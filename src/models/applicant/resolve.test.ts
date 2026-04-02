import { describe, expect, it } from "vitest";
import { resolveApplicant } from "./index";

describe("resolveApplicant", () => {
  it("fills missing collections and disclose flags", () => {
    expect(resolveApplicant({ id: "a1", personal: { name: "Ada" } })).toEqual({
      id: "a1",
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
      personalNotes: undefined,
    });
  });
});
