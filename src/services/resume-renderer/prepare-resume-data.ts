import type { Applicant } from "@/models/applicant/types.js";

export function prepareResumeData(applicant: Applicant) {
  const { personal, disclose } = applicant;

  const locationParts = [
    personal.address?.street,
    personal.address?.zip,
    personal.address?.city,
  ].filter(Boolean);

  return {
    personal: {
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      location:
        disclose?.address && locationParts.length > 0
          ? locationParts.join(", ")
          : undefined,
    },
    experience: applicant.experience.map((e) => ({
      role: e.role,
      company: e.company,
      startDate: e.discloseDates ? e.startDate : undefined,
      endDate: e.discloseDates ? e.endDate : undefined,
      location: e.location,
      highlights: e.highlights,
    })),
    education: applicant.education.map((e) => ({
      institution: e.institution,
      course: e.course,
      startDate: e.discloseDates ? e.startDate : undefined,
      endDate: e.discloseDates ? e.endDate : undefined,
      location: e.location,
      highlights: e.highlights,
    })),
    skills: applicant.skills.map((s) => s.name),
    languages: applicant.languages.map((l) => ({
      language: l.language,
      level: l.level,
    })),
    certifications: applicant.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.discloseDates ? c.date : undefined,
      description: c.description,
    })),
    hobbies: disclose?.hobbies ? personal.hobbies : undefined,
  };
}
