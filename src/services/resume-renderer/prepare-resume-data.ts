import type { Applicant } from "@/models/applicant/types.js";

export function prepareResumeData(applicant: Applicant) {
  const { personal, disclose } = applicant;

  return {
    personal: {
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      location: prepareLocation(applicant),
    },
    experience: applicant.experience.map((exp) => ({
      role: exp.role,
      company: exp.company,
      startDate: conditionalDate(exp.discloseDates, exp.startDate),
      endDate: conditionalDate(exp.discloseDates, exp.endDate),
      location: exp.location,
      highlights: exp.highlights,
    })),
    education: applicant.education.map((edu) => ({
      institution: edu.institution,
      course: edu.course,
      startDate: conditionalDate(edu.discloseDates, edu.startDate),
      endDate: conditionalDate(edu.discloseDates, edu.endDate),
      location: edu.location,
      highlights: edu.highlights,
    })),
    skills: applicant.skills.map((s) => s.name),
    languages: applicant.languages.map((l) => ({
      language: l.language,
      level: l.level,
    })),
    certifications: applicant.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: conditionalDate(c.discloseDates, c.date),
      description: c.description,
    })),
    hobbies: disclose.hobbies ? personal.hobbies : undefined,
  };
}

function conditionalDate(
  disclose?: boolean,
  date?: string,
): string | undefined {
  return disclose ? date : undefined;
}

function prepareLocation(applicant: Applicant): string | undefined {
  const { personal, disclose } = applicant;
  const parts = [
    personal.address?.street,
    personal.address?.zip,
    personal.address?.city,
  ].filter(Boolean);
  return disclose.address && parts.length > 0 ? parts.join(", ") : undefined;
}
