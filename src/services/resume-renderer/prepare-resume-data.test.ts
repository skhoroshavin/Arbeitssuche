import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepareResumeData } from "./prepare-resume-data.js";
import type { Applicant } from "@/models/applicant/types.js";
import { DEFAULT_APPLICANT } from "@/models/applicant/types.js";

function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return { ...DEFAULT_APPLICANT, id: "test-1234", ...overrides };
}

describe("prepareResumeData", () => {
  it("maps basic personal fields", () => {
    const data = prepareResumeData(
      makeApplicant({
        personal: { name: "Max Mustermann", email: "m@x.de", phone: "123" },
      }),
    );

    assert.equal(data.personal.name, "Max Mustermann");
    assert.equal(data.personal.email, "m@x.de");
    assert.equal(data.personal.phone, "123");
  });

  it("excludes location when disclose.address is not set", () => {
    const data = prepareResumeData(
      makeApplicant({
        personal: {
          name: "Test",
          address: { street: "Str 1", zip: "12345", city: "Berlin" },
        },
      }),
    );

    assert.equal(data.personal.location, undefined);
  });

  it("includes location when disclose.address is true", () => {
    const data = prepareResumeData(
      makeApplicant({
        personal: {
          name: "Test",
          address: { street: "Str 1", zip: "12345", city: "Berlin" },
        },
        disclose: { address: true },
      }),
    );

    assert.equal(data.personal.location, "Str 1, 12345, Berlin");
  });

  it("excludes hobbies when disclose.hobbies is not set", () => {
    const data = prepareResumeData(
      makeApplicant({
        personal: { name: "Test", hobbies: ["Lesen", "Kochen"] },
      }),
    );

    assert.equal(data.hobbies, undefined);
  });

  it("includes hobbies when disclose.hobbies is true", () => {
    const data = prepareResumeData(
      makeApplicant({
        personal: { name: "Test", hobbies: ["Lesen", "Kochen"] },
        disclose: { hobbies: true },
      }),
    );

    assert.deepEqual(data.hobbies, ["Lesen", "Kochen"]);
  });

  it("respects discloseDates per experience entry", () => {
    const data = prepareResumeData(
      makeApplicant({
        experience: [
          {
            role: "Dev",
            company: "ACME",
            startDate: "2020",
            endDate: "2023",
            discloseDates: true,
          },
          {
            role: "Lead",
            company: "Corp",
            startDate: "2023",
            endDate: "now",
            discloseDates: false,
          },
        ],
      }),
    );

    assert.equal(data.experience[0].startDate, "2020");
    assert.equal(data.experience[0].endDate, "2023");
    assert.equal(data.experience[1].startDate, undefined);
    assert.equal(data.experience[1].endDate, undefined);
  });

  it("respects discloseDates per education entry", () => {
    const data = prepareResumeData(
      makeApplicant({
        education: [
          {
            institution: "TU Berlin",
            course: "Informatik",
            startDate: "2015",
            endDate: "2020",
            discloseDates: true,
          },
          {
            institution: "FU Berlin",
            course: "Mathe",
            startDate: "2010",
            endDate: "2015",
            discloseDates: false,
          },
        ],
      }),
    );

    assert.equal(data.education[0].startDate, "2015");
    assert.equal(data.education[1].startDate, undefined);
  });

  it("maps education with course field directly", () => {
    const data = prepareResumeData(
      makeApplicant({
        education: [
          {
            institution: "TU Berlin",
            course: "Informatik",
            location: "Berlin",
            discloseDates: true,
            startDate: "2015",
            endDate: "2020",
          },
        ],
      }),
    );

    assert.equal(data.education[0].course, "Informatik");
    assert.equal(data.education[0].location, "Berlin");
  });

  it("flattens skills to name strings", () => {
    const data = prepareResumeData(
      makeApplicant({
        skills: [{ name: "TypeScript" }, { name: "React" }],
      }),
    );

    assert.deepEqual(data.skills, ["TypeScript", "React"]);
  });

  it("maps languages", () => {
    const data = prepareResumeData(
      makeApplicant({
        languages: [{ language: "Deutsch", level: "C2" }],
      }),
    );

    assert.equal(data.languages[0].language, "Deutsch");
    assert.equal(data.languages[0].level, "C2");
  });

  it("respects discloseDates per certification", () => {
    const data = prepareResumeData(
      makeApplicant({
        certifications: [
          { name: "AWS", date: "2023", discloseDates: true },
          { name: "GCP", date: "2022", discloseDates: false },
        ],
      }),
    );

    assert.equal(data.certifications[0].date, "2023");
    assert.equal(data.certifications[1].date, undefined);
  });

  it("includes highlights in experience", () => {
    const data = prepareResumeData(
      makeApplicant({
        experience: [
          {
            role: "Dev",
            company: "ACME",
            startDate: "2020",
            endDate: "2023",
            highlights: ["Led migration", "Improved performance"],
            discloseDates: true,
          },
        ],
      }),
    );

    assert.deepEqual(data.experience[0].highlights, [
      "Led migration",
      "Improved performance",
    ]);
  });

  it("includes highlights in education", () => {
    const data = prepareResumeData(
      makeApplicant({
        education: [
          {
            institution: "TU Berlin",
            course: "Informatik",
            startDate: "2015",
            endDate: "2020",
            highlights: ["GPA 1.5", "Published thesis"],
            discloseDates: true,
          },
        ],
      }),
    );

    assert.deepEqual(data.education[0].highlights, [
      "GPA 1.5",
      "Published thesis",
    ]);
  });

  it("never includes personalNotes", () => {
    const data = prepareResumeData(
      makeApplicant({
        personalNotes: ["secret note"],
      }),
    );

    const json = JSON.stringify(data);
    assert.ok(!json.includes("secret note"));
    assert.ok(!json.includes("personalNotes"));
  });
});
