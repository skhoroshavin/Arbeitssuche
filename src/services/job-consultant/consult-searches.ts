import type { Applicant } from "@/models/applicant/types.js";
import {
  SEARCH_MODES,
  type ConsultationSuggestion,
} from "@/models/job-search/types.js";
import type { JsonSchema, LlmClient } from "@/plugins/llm/types.js";
import { formatApplicantSections } from "@/models/applicant/format.js";

const VALID_SEARCH_MODES: readonly string[] = SEARCH_MODES;
const CONSULT_MAX_TOKENS = 2048;

const CONSULT_SEARCHES_SCHEMA: JsonSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      searchTerm: { type: "string" },
      searchMode: { type: "string", enum: SEARCH_MODES },
      reason: { type: "string" },
    },
    required: ["searchTerm", "searchMode", "reason"],
    additionalProperties: false,
  },
};

export function buildConsultSearchesPrompt(applicant: Applicant): string {
  const sections = formatApplicantSections(applicant);

  return `Sie sind ein erfahrener Karriereberater. Analysieren Sie das folgende Bewerberprofil und schlagen Sie 5–10 konkrete Suchbegriffe für Jobbörsen vor.

Jeder Vorschlag soll enthalten:
- "searchTerm": ein prägnanter Suchbegriff für deutsche Jobbörsen (z.B. "React Entwickler", "Senior Java Backend", "DevOps Engineer")
- "searchMode": einer der folgenden Werte: "employment" (Festanstellung), "entry-level" (Berufseinsteiger), "apprenticeship" (Ausbildung) — wählen Sie passend zum Erfahrungsniveau
- "reason": 1–2 Sätze auf Deutsch, warum dieser Suchbegriff zum Profil passt

Bieten Sie Vielfalt: direkte Treffer basierend auf bisheriger Erfahrung, angrenzende Rollen, und ggf. aufstrebende Karrieremöglichkeiten.

Geben Sie NUR ein JSON-Array zurück (keine Markdown-Fences, kein zusätzlicher Text):
[{"searchTerm": "...", "searchMode": "employment", "reason": "..."}]

${sections.join("\n\n")}`;
}

export function parseConsultSearchesResult(
  parsed: unknown,
): ConsultationSuggestion[] | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const suggestions: ConsultationSuggestion[] = [];

  for (const item of parsed) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.searchTerm !== "string" ||
      !item.searchTerm ||
      typeof item.searchMode !== "string" ||
      !VALID_SEARCH_MODES.includes(item.searchMode) ||
      typeof item.reason !== "string" ||
      !item.reason
    ) {
      continue;
    }

    suggestions.push({
      searchTerm: item.searchTerm,
      searchMode: item.searchMode,
      reason: item.reason,
    });
  }

  return suggestions.length > 0 ? suggestions : null;
}

export async function consultSearches(
  applicant: Applicant,
  llmClient: LlmClient,
): Promise<ConsultationSuggestion[]> {
  const prompt = buildConsultSearchesPrompt(applicant);
  const parsed = await llmClient.completeJSON(
    prompt,
    CONSULT_MAX_TOKENS,
    CONSULT_SEARCHES_SCHEMA,
  );
  const suggestions = parseConsultSearchesResult(parsed);
  if (!suggestions) {
    throw new Error("Failed to parse consultation response");
  }
  return suggestions;
}
