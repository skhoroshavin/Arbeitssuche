import type { Applicant } from "@/models/applicant/types.js"
import type { JobSearch } from "@/models/job-search/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { LlmClient } from "@/plugins/llm/types.js"
import { formatApplicantSections } from "@/models/applicant/index.js"

export async function generatePersonalizedCoverLetter(
  applicant: Applicant,
  vacancy: Vacancy,
  templateCoverLetter: string,
  jobSearch: JobSearch,
  llmClient: LlmClient,
): Promise<string> {
  const prompt = buildPersonalizedCoverLetterPrompt(
    applicant,
    vacancy,
    templateCoverLetter,
    jobSearch,
  )
  return llmClient.complete(prompt, 4096)
}

function buildPersonalizedCoverLetterPrompt(
  applicant: Applicant,
  vacancy: Vacancy,
  templateCoverLetter: string,
  jobSearch: JobSearch,
): string {
  const sections = formatApplicantSections(applicant)

  if (templateCoverLetter) {
    sections.push(`## Example Cover Letter (template)\n${templateCoverLetter}`)
  }

  sections.push(formatVacancySection(vacancy))

  if (jobSearch.preferences.freeText.length > 0) {
    sections.push(
      `## Preferences\n${jobSearch.preferences.freeText.map((t) => `- ${t}`).join("\n")}`,
    )
  }

  return `Write a personalized cover letter for the following applicant and vacancy.

Instructions:
- If an example cover letter (template) is provided, use it as a base for tone and structure
- Personalize the letter for this specific vacancy: use the company name, position title, and contact person (if available)
- Highlight the applicant's skills and qualities that match the job description
- Write in the language of the job description (German job description → German letter, English → English)
- Return ONLY the letter body text (no address, date, or subject line - those are formatted separately)
- Do not mention politics directly, even if referenced in personal notes
- Do not overuse "ich" - keep the tone professional and concise
- Do not make the letter sound AI-generated
- Do not use language that exceeds the applicant's stated proficiency level

${sections.join("\n\n")}`
}

function formatVacancySection(vacancy: Vacancy): string {
  const lines = [
    `Title: ${vacancy.title}`,
    `Company: ${vacancy.company}`,
    ...formatContactLines(vacancy.contact),
  ]
  if (vacancy.description) {
    lines.push(`\nJob Description:\n${vacancy.description}`)
  }
  return `## Vacancy\n${lines.join("\n")}`
}

function formatContactLines(contact: Vacancy["contact"]): string[] {
  const lines: string[] = []
  if (contact.name) lines.push(`Contact: ${contact.name}`)
  if (contact.email) lines.push(`Contact Email: ${contact.email}`)
  if (contact.phone) lines.push(`Contact Phone: ${contact.phone}`)
  return lines
}
