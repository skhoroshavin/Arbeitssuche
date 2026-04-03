import typia from "typia"
import type { Applicant } from "@/models/applicant/types.js"
import type { SearchPreferences } from "@/models/job-search/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { MatchScore } from "@/models/vacancy/types.js"
import type { LlmClient, TypedSchema } from "@/plugins/llm/types.js"
import { formatApplicantSections } from "@/models/applicant/index.js"

export function needsAssessment(vacancy: Vacancy): boolean {
  return !vacancy.summary || vacancy.descriptionChanged
}

export async function assessVacancy(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
  llmClient: LlmClient,
): Promise<AssessResult> {
  const prompt = buildAssessPrompt(vacancy, applicant, preferences)
  return await llmClient.completeJSON(prompt, ASSESS_MAX_TOKENS, ASSESS_SCHEMA)
}

const ASSESS_MAX_TOKENS = 2048

const ASSESS_SCHEMA: TypedSchema<AssessResult> = {
  schema: typia.json.schema<AssessResult>(),
  parse: typia.json.createAssertParse<AssessResult>(),
}

interface AssessResult {
  summary: string
  matchScore: MatchScore
}

function buildAssessPrompt(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
): string {
  const sections = [
    `## Stellenausschreibung
Titel: ${vacancy.title}
Unternehmen: ${vacancy.company}
Standort: ${vacancy.addresses.join(", ") || "Nicht angegeben"}
${vacancy.description ? `Beschreibung:\n${vacancy.description}` : "Keine Beschreibung vorhanden."}`,
    ...formatApplicantSections(applicant),
  ]

  if (preferences.freeText.length > 0) {
    sections.push(
      `## Suchpräferenzen\n${preferences.freeText.map((t) => `- ${t}`).join("\n")}`,
    )
  }

  return String.raw`Sie bewerten eine Stellenausschreibung für einen Kandidaten. Geben Sie basierend auf der Ausschreibung und dem Profil des Kandidaten Folgendes an:
1. Eine kurze Zusammenfassung der Stelle (3-4 Stichpunkte beginnend mit -), mit besonderem Bezug auf die Relevanz für den Kandidaten
2. Eine Übereinstimmungsbewertung: eine von "very-bad", "bad", "ok", "good", "excellent"

Geben Sie NUR ein JSON-Objekt zurück (keine Markdown-Fences, kein zusätzlicher Text):
{"summary": "- Punkt 1\n- Punkt 2\n- Punkt 3", "matchScore": "good"}

${sections.join("\n\n")}`
}
