import { z } from "zod"
import type { Applicant } from "@/models/applicant"
import type { ConsultationSuggestion } from "@/models/job-search"
import type { LlmClient, TypedSchema } from "@/plugins/llm"

export async function consultSearches(
  applicant: Applicant,
  llmClient: LlmClient,
): Promise<ConsultationSuggestion[]> {
  const prompt = buildConsultSearchesPrompt(applicant)
  return llmClient.completeJSON(prompt, 4096, CONSULT_SEARCHES_SCHEMA)
}

const ConsultationSuggestionsSchema = z.array(
  z.object({
    searchTerm: z.string(),
    searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
    reason: z.string(),
  }),
)

const CONSULT_SEARCHES_SCHEMA: TypedSchema<ConsultationSuggestion[]> = {
  schema: z.toJSONSchema(ConsultationSuggestionsSchema),
  parse: (input: string) =>
    ConsultationSuggestionsSchema.parse(JSON.parse(input)),
}

function buildConsultSearchesPrompt(applicant: Applicant): string {
  const sections = [applicant.llmFriendlyDescription()]

  return `Sie sind ein erfahrener Karriereberater. Analysieren Sie das folgende Bewerberprofil und schlagen Sie 5-10 konkrete Suchbegriffe für Jobbörsen vor.

Jeder Vorschlag soll enthalten:
- "searchTerm": ein prägnanter Suchbegriff für deutsche Jobbörsen (z.B. "React Entwickler", "Senior Java Backend", "DevOps Engineer")
- "searchMode": einer der folgenden Werte: "employment" (Festanstellung), "entry-level" (Berufseinsteiger), "apprenticeship" (Ausbildung) - wählen Sie passend zum Erfahrungsniveau
- "reason": 1-2 Sätze auf Deutsch, warum dieser Suchbegriff zum Profil passt

Bieten Sie Vielfalt: direkte Treffer basierend auf bisheriger Erfahrung, angrenzende Rollen, und ggf. aufstrebende Karrieremöglichkeiten.

Geben Sie NUR ein JSON-Array zurück (keine Markdown-Fences, kein zusätzlicher Text):
[{"searchTerm": "...", "searchMode": "employment", "reason": "..."}]

${sections.join("\n\n")}`
}
