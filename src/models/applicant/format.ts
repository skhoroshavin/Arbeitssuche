import type {
  Applicant,
  ApplicantExperience,
  ApplicantEducation,
} from "@/models/applicant/types.js";

export function formatApplicantSections(applicant: Applicant): string[] {
  const sections: string[] = [formatPersonalSection(applicant.personal)];

  for (const section of OPTIONAL_SECTIONS) {
    if (section.items(applicant).length > 0) {
      sections.push(section.format(applicant));
    }
  }

  const notes = formatPersonalNotes(applicant.personalNotes);
  if (notes) sections.push(notes);

  return sections;
}

function formatPersonalSection(p: Applicant["personal"]): string {
  const lines = [`Name: ${p.name}`];
  if (p.address) {
    const a = p.address;
    lines.push(`Adresse: ${a.street}, ${a.zip} ${a.city}`);
  }
  if (p.email) lines.push(`E-Mail: ${p.email}`);
  if (p.phone) lines.push(`Telefon: ${p.phone}`);
  return `## Applicant\n${lines.join("\n")}`;
}

const OPTIONAL_SECTIONS: Array<{
  items: (a: Applicant) => unknown[];
  format: (a: Applicant) => string;
}> = [
  {
    items: (a) => a.experience,
    format: (a) =>
      `## Experience\n${a.experience.map((entry) => formatExperienceLine(entry)).join("\n")}`,
  },
  {
    items: (a) => a.education,
    format: (a) =>
      `## Education\n${a.education.map((entry) => formatEducationLine(entry)).join("\n")}`,
  },
  {
    items: (a) => a.skills,
    format: (a) => `## Skills\n${a.skills.map((s) => s.name).join(", ")}`,
  },
  {
    items: (a) => a.languages,
    format: (a) =>
      `## Languages\n${a.languages.map((l) => `${l.language} (${l.level})`).join(", ")}`,
  },
  {
    items: (a) => a.certifications,
    format: (a) => {
      const lines = a.certifications.map(
        (c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ""}`,
      );
      return `## Certifications\n${lines.join("\n")}`;
    },
  },
];

function formatPersonalNotes(
  notes: Applicant["personalNotes"],
): string | undefined {
  if (!notes || notes.length === 0) return undefined;
  const lines = Array.isArray(notes) ? notes : [notes];
  return `## Personal Notes\n${lines.map((n) => `- ${n}`).join("\n")}`;
}

function formatExperienceLine(entry: ApplicantExperience): string {
  const hl = formatHighlights(entry.highlights);
  return `- ${entry.role} bei ${entry.company} (${entry.startDate}-${entry.endDate})${hl ? ": " + hl : ""}`;
}

function formatEducationLine(entry: ApplicantEducation): string {
  const hl = formatHighlights(entry.highlights);
  return `- ${entry.course} an ${entry.institution}${entry.endDate ? ` (${entry.endDate})` : ""}${hl ? ": " + hl : ""}`;
}

function formatHighlights(
  highlights: string[] | string | undefined,
  separator = "; ",
): string {
  if (!highlights) return "";
  if (typeof highlights === "string") return highlights;
  return highlights.join(separator);
}
