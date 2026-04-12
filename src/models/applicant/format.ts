import type {
  Applicant,
  ApplicantExperience,
  ApplicantEducation,
} from "@/models/applicant"

export function formatApplicantSections(applicant: Applicant): string[] {
  const sections: string[] = [formatPersonalSection(applicant.personal)]

  for (const section of [
    {
      items: (a: Applicant) => a.experience,
      format: (a: Applicant) =>
        `## Experience\n${a.experience.map((entry) => formatExperienceLine(entry)).join("\n")}`,
    },
    {
      items: (a: Applicant) => a.education,
      format: (a: Applicant) =>
        `## Education\n${a.education.map((entry) => formatEducationLine(entry)).join("\n")}`,
    },
    {
      items: (a: Applicant) => a.skills,
      format: (a: Applicant) =>
        `## Skills\n${a.skills.map((s) => s.name).join(", ")}`,
    },
    {
      items: (a: Applicant) => a.languages,
      format: (a: Applicant) =>
        `## Languages\n${a.languages.map((l) => `${l.language} (${l.level})`).join(", ")}`,
    },
    {
      items: (a: Applicant) => a.certifications,
      format: (a: Applicant) => {
        const lines = a.certifications.map(
          (c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ""}`,
        )
        return `## Certifications\n${lines.join("\n")}`
      },
    },
  ]) {
    if (section.items(applicant).length > 0) {
      sections.push(section.format(applicant))
    }
  }

  const notes = formatPersonalNotes(applicant.personalNotes)
  if (notes) sections.push(notes)

  return sections
}

function formatPersonalSection(p: Applicant["personal"]): string {
  const lines = [`Name: ${p.name}`]
  if (p.address) {
    const a = p.address
    lines.push(`Adresse: ${a.street}, ${a.zip} ${a.city}`)
  }
  if (p.email) lines.push(`E-Mail: ${p.email}`)
  if (p.phone) lines.push(`Telefon: ${p.phone}`)
  return `## Applicant\n${lines.join("\n")}`
}

function formatPersonalNotes(
  notes: Applicant["personalNotes"],
): string | undefined {
  if (!notes || notes.length === 0) return undefined
  return `## Personal Notes\n${notes.map((note) => `- ${note}`).join("\n")}`
}

function formatExperienceLine(entry: ApplicantExperience): string {
  const hl = formatHighlights(entry.highlights)
  return `- ${entry.role} bei ${entry.company} (${entry.startDate}-${entry.endDate})${hl ? ": " + hl : ""}`
}

function formatEducationLine(entry: ApplicantEducation): string {
  const hl = formatHighlights(entry.highlights)
  return `- ${entry.course} an ${entry.institution}${entry.endDate ? ` (${entry.endDate})` : ""}${hl ? ": " + hl : ""}`
}

function formatHighlights(
  highlights: string[] | undefined,
  separator = "; ",
): string {
  if (!highlights) return ""
  return highlights.join(separator)
}
