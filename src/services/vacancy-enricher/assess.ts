import { z } from "zod"
import type { Applicant } from "@/models/applicant"
import type { JobSearch } from "@/models/job-search"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { LlmClient, TypedSchema } from "@/plugins/llm"
import { formatApplicantSections } from "@/models/applicant/index.js"

export function needsAssessment(vacancy: Vacancy): boolean {
  return !vacancy.summary || vacancy.enrichmentDirty
}

export async function assessVacancy(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
  llmClient: LlmClient,
  signal?: AbortSignal,
): Promise<AssessResult> {
  const prompt = buildAssessPrompt(vacancy, applicant, jobSearch)
  return await llmClient.completeJSON(prompt, 2048, ASSESS_SCHEMA, signal)
}

const AssessResultSchema = z.object({
  summary: z.string(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]),
})
type AssessResult = z.infer<typeof AssessResultSchema>

const ASSESS_SCHEMA: TypedSchema<AssessResult> = {
  schema: z.toJSONSchema(AssessResultSchema),
  parse: (input: string) => AssessResultSchema.parse(JSON.parse(input)),
}

function buildAssessPrompt(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
): string {
  const sections = [
    `## Stellenausschreibung
Titel: ${vacancy.title}
Unternehmen: ${vacancy.company}
Standort: ${vacancy.addresses.join(", ") || "Nicht angegeben"}
${vacancy.description ? `Beschreibung:\n${vacancy.description}` : "Keine Beschreibung vorhanden."}`,
    ...formatApplicantSections(applicant),
  ]

  if (jobSearch.notes.length > 0) {
    sections.push(
      `## Suchpräferenzen\n${jobSearch.notes.split("\n").map((t) => `- ${t.trim()}`).filter(Boolean).join("\n")}`,
    )
  }

  return String.raw`Sie bewerten eine Stellenausschreibung für einen Kandidaten. Geben Sie basierend auf der Ausschreibung und dem Profil des Kandidaten Folgendes an:
1. Eine kurze Zusammenfassung der Stelle (3-4 Stichpunkte beginnend mit -), mit besonderem Bezug auf die Relevanz für den Kandidaten
2. Eine Übereinstimmungsbewertung: eine von "very-bad", "bad", "ok", "good", "excellent"

Geben Sie NUR ein JSON-Objekt zurück (keine Markdown-Fences, kein zusätzlicher Text):
{"summary": "- Punkt 1\n- Punkt 2\n- Punkt 3", "matchScore": "good"}

${sections.join("\n\n")}`
}
