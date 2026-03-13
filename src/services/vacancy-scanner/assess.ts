import type { Applicant } from "@/models/applicant/types.js";
import type { SearchPreferences } from "@/models/job-search/types.js";
import type { Vacancy, MatchScore } from "@/models/vacancy/types.js";
import type { JsonSchema, LlmClient } from "@/plugins/llm/types.js";
import {
  formatExperienceLine,
  formatEducationLine,
} from "@/models/applicant/format.js";

const VALID_SCORES: MatchScore[] = [
  "very-bad",
  "bad",
  "ok",
  "good",
  "excellent",
];

export interface AssessResult {
  summary: string;
  matchScore: MatchScore;
}

const ASSESS_MAX_TOKENS = 1024;

const ASSESS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    matchScore: { type: "string", enum: VALID_SCORES },
  },
  required: ["summary", "matchScore"],
  additionalProperties: false,
};

export interface AssessVacanciesInput {
  vacancies: Vacancy[];
  applicant: Applicant;
  preferences: SearchPreferences;
  llmClient: LlmClient;
  signal?: AbortSignal;
  onProgress?: (message: string, current: number, total: number) => void;
}

export interface AssessVacanciesOutput {
  vacancies: Vacancy[];
  assessedCount: number;
  skippedCount: number;
  errorCount: number;
}

export function needsAssessment(vacancy: Vacancy): boolean {
  return !vacancy.summary || vacancy.descriptionChanged;
}

export function buildAssessPrompt(
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

  const expLines = applicant.experience.map(formatExperienceLine);
  const eduLines = applicant.education.map(formatEducationLine);
  const skillLines = applicant.skills.map((s) => s.name);
  const langLines = applicant.languages.map(
    (l) => `${l.language} (${l.level})`,
  );

  sections.push(`## Kandidatenprofil
Name: ${applicant.personal.name}
${expLines.length ? `Berufserfahrung:\n${expLines.join("\n")}` : ""}
${eduLines.length ? `Ausbildung:\n${eduLines.join("\n")}` : ""}
${skillLines.length ? `Kenntnisse: ${skillLines.join(", ")}` : ""}
${langLines.length ? `Sprachen: ${langLines.join(", ")}` : ""}`);

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

export function parseAssessResult(parsed: unknown): AssessResult | null {
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

export async function assessNewVacancies(
  input: AssessVacanciesInput,
): Promise<AssessVacanciesOutput> {
  const { vacancies, applicant, preferences, llmClient, signal, onProgress } =
    input;

  const toAssess = vacancies.filter(needsAssessment);
  const total = toAssess.length;

  if (total === 0) {
    return {
      vacancies,
      assessedCount: 0,
      skippedCount: vacancies.length,
      errorCount: 0,
    };
  }

  let assessedCount = 0;
  let errorCount = 0;
  const updatedByHash = new Map<string, AssessResult>();

  for (let i = 0; i < toAssess.length; i++) {
    if (signal?.aborted) break;

    const vacancy = toAssess[i];
    onProgress?.(
      `Bewerte "${vacancy.title}" bei ${vacancy.company}...`,
      i + 1,
      total,
    );

    try {
      const result = await assessVacancy(
        vacancy,
        applicant,
        preferences,
        llmClient,
      );
      if (result) {
        updatedByHash.set(vacancy.hash, result);
        assessedCount++;
      } else {
        errorCount++;
      }
    } catch {
      errorCount++;
    }
  }

  const updatedVacancies = vacancies.map((v) => {
    const assessment = updatedByHash.get(v.hash);
    if (!assessment) return v;
    return {
      ...v,
      summary: assessment.summary,
      matchScore: assessment.matchScore,
      descriptionChanged: false,
    };
  });

  return {
    vacancies: updatedVacancies,
    assessedCount,
    skippedCount: vacancies.length - toAssess.length,
    errorCount,
  };
}
