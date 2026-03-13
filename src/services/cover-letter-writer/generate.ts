import type { Applicant } from "@/models/applicant/types.js";
import type { JobSearch } from "@/models/job-search/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import { formatApplicantSections } from "@/models/applicant/format.js";

export function buildCoverLetterPrompt(
  applicant: Applicant,
  jobSearch: JobSearch,
): string {
  const sections = formatApplicantSections(applicant);

  // Job search context
  const searchLines = [`Suchbegriff: ${jobSearch.params.searchTerm}`];
  if (jobSearch.preferences.freeText.length > 0) {
    searchLines.push(
      `Präferenzen:\n${jobSearch.preferences.freeText.map((t) => `- ${t}`).join("\n")}`,
    );
  }
  sections.push(`## Stellensuche\n${searchLines.join("\n")}`);

  return `Erstellen Sie eine professionelle Anschreiben-Vorlage auf Deutsch für den folgenden Kandidaten und die beschriebene Stellensuche.

Das Anschreiben soll:
- Als fertige Vorlage verwendbar sein, die für einzelne Bewerbungen angepasst werden kann
- Platzhalter in eckigen Klammern enthalten für firmenspezifische Details, z.B. [Firmenname], [Stellenbezeichnung], [Ansprechpartner]
- Einen professionellen, motivierten Ton haben
- Die relevanten Qualifikationen und Erfahrungen des Kandidaten hervorheben
- Auf Deutsch verfasst sein
- Nur den Brieftext enthalten (ohne Absenderadresse, Datum, Betreffzeile — diese werden separat formatiert)
- Erwähne die Politik nicht direkt, auch wenn sie in den Persönlichen Hinweisen erwähnt wird
- Verwende keine Formulierungen, die deutlich über dem im Lebenslauf angegebenen Deutschniveau liegen
- Auf jeden Fall sollte „ich" nicht zu oft verwendet werden.
- Versuche, den Brief nicht zu lang zu machen, und nicht wie KI aussehen

Geben Sie NUR den Anschreiben-Text zurück, ohne zusätzliche Erklärungen oder Markdown-Formatierung.

${sections.join("\n\n")}`;
}

export async function generateCoverLetter(
  applicant: Applicant,
  jobSearch: JobSearch,
  llmClient: LlmClient,
): Promise<string> {
  const prompt = buildCoverLetterPrompt(applicant, jobSearch);
  return llmClient.complete(prompt, 4096);
}
