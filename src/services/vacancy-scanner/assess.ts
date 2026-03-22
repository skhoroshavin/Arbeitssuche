import type { Applicant } from "@/models/applicant/types.js";
import type { SearchPreferences } from "@/models/job-search/types.js";
import type { Vacancy } from "@/models/vacancy/vacancy.js";
import type { MatchScore } from "@/models/vacancy/types.js";
import type { JsonSchema, LlmClient } from "@/plugins/llm/types.js";
import { formatApplicantSections } from "@/models/applicant/format.js";

const VALID_SCORES: MatchScore[] = [
  "very-bad",
  "bad",
  "ok",
  "good",
  "excellent",
];

interface AssessResult {
  summary: string;
  matchScore: MatchScore;
}

const ASSESS_MAX_TOKENS = 2048;

const ASSESS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    matchScore: { type: "string", enum: VALID_SCORES },
  },
  required: ["summary", "matchScore"],
  additionalProperties: false,
};

export function needsAssessment(vacancy: Vacancy): boolean {
  return !vacancy.summary || vacancy.descriptionChanged;
}

function buildAssessPrompt(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
): string {
  const sections: string[] = [];

  sections.push(`## Stellenausschreibung
Titel: ${vacancy.title}
Unternehmen: ${vacancy.company}
Standort: ${vacancy.addresses.join(", ") || "Nicht angegeben"}
${vacancy.description ? `Beschreibung:\n${vacancy.description}` : "Keine Beschreibung vorhanden."}`);

  sections.push(...formatApplicantSections(applicant));

  if (preferences.freeText.length > 0) {
    sections.push(
      `## Suchpräferenzen\n${preferences.freeText.map((t) => `- ${t}`).join("\n")}`,
    );
  }

  return `Sie bewerten eine Stellenausschreibung für einen Kandidaten. Geben Sie basierend auf der Ausschreibung und dem Profil des Kandidaten Folgendes an:
1. Eine kurze Zusammenfassung der Stelle (3-4 Stichpunkte beginnend mit -), mit besonderem Bezug auf die Relevanz für den Kandidaten
2. Eine Übereinstimmungsbewertung: eine von "very-bad", "bad", "ok", "good", "excellent"

Geben Sie NUR ein JSON-Objekt zurück (keine Markdown-Fences, kein zusätzlicher Text):
{"summary": "- Punkt 1\\n- Punkt 2\\n- Punkt 3", "matchScore": "good"}

${sections.join("\n\n")}`;
}

function isMatchScore(s: string): s is MatchScore {
  return VALID_SCORES.some((v) => v === s);
}

function parseAssessResult(parsed: unknown): AssessResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  if (!("summary" in parsed) || typeof parsed.summary !== "string") return null;
  if (!("matchScore" in parsed) || typeof parsed.matchScore !== "string")
    return null;
  if (!isMatchScore(parsed.matchScore)) return null;

  return {
    summary: parsed.summary,
    matchScore: parsed.matchScore,
  };
}

export async function assessVacancy(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
  llmClient: LlmClient,
): Promise<AssessResult | null> {
  const prompt = buildAssessPrompt(vacancy, applicant, preferences);
  const parsed = await llmClient.completeJSON(
    prompt,
    ASSESS_MAX_TOKENS,
    ASSESS_SCHEMA,
  );
  return parseAssessResult(parsed);
}
