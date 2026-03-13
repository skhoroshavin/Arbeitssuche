import type {
  Applicant,
  ApplicantExperience,
  ApplicantEducation,
} from "@/models/applicant/types.js";

function formatHighlights(
  highlights: string[] | string | undefined,
  separator = "; ",
): string {
  if (!highlights) return "";
  if (typeof highlights === "string") return highlights;
  return highlights.join(separator);
}

export function formatExperienceLine(e: ApplicantExperience): string {
  const hl = formatHighlights(e.highlights);
  return `- ${e.role} bei ${e.company} (${e.startDate}–${e.endDate})${hl ? ": " + hl : ""}`;
}

export function formatEducationLine(e: ApplicantEducation): string {
  const hl = formatHighlights(e.highlights);
  return `- ${e.course} an ${e.institution}${e.endDate ? ` (${e.endDate})` : ""}${hl ? ": " + hl : ""}`;
}

export function formatApplicantSections(applicant: Applicant): string[] {
  const sections: string[] = [];

  const p = applicant.personal;
  const personalLines = [`Name: ${p.name}`];
  if (p.address) {
    const a = p.address;
    personalLines.push(`Adresse: ${a.street}, ${a.zip} ${a.city}`);
  }
  if (p.email) personalLines.push(`E-Mail: ${p.email}`);
  if (p.phone) personalLines.push(`Telefon: ${p.phone}`);
  sections.push(`## Applicant\n${personalLines.join("\n")}`);

  if (applicant.experience.length > 0) {
    sections.push(
      `## Experience\n${applicant.experience.map(formatExperienceLine).join("\n")}`,
    );
  }

  if (applicant.education.length > 0) {
    sections.push(
      `## Education\n${applicant.education.map(formatEducationLine).join("\n")}`,
    );
  }

  if (applicant.skills.length > 0) {
    sections.push(
      `## Skills\n${applicant.skills.map((s) => s.name).join(", ")}`,
    );
  }

  if (applicant.languages.length > 0) {
    sections.push(
      `## Languages\n${applicant.languages.map((l) => `${l.language} (${l.level})`).join(", ")}`,
    );
  }

  if (applicant.certifications.length > 0) {
    const lines = applicant.certifications.map(
      (c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ""}`,
    );
    sections.push(`## Certifications\n${lines.join("\n")}`);
  }

  if (applicant.personalNotes && applicant.personalNotes.length > 0) {
    const raw = applicant.personalNotes;
    const lines = Array.isArray(raw) ? raw : [raw];
    const notes = lines.map((n) => `- ${n}`).join("\n");
    sections.push(`## Personal Notes\n${notes}`);
  }

  return sections;
}
