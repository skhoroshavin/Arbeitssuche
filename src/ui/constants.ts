import type { MatchScore } from "@/models/vacancy/types.js";
import type { SearchMode } from "@/models/job-search/types.js";

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  employment: "Festanstellung",
  "entry-level": "Berufseinsteiger",
  apprenticeship: "Ausbildung",
};

export const STATUS_LABELS: Record<string, string> = {
  all: "Alle",
  new: "Neu",
  gone: "Weg",
  renewed: "Erneuert",
  applied: "Beworben",
  ignored: "Ignoriert",
  invited: "Eingeladen",
  interviewed: "Gespräch",
  offered: "Angebot",
  rejected: "Abgelehnt",
  "not-interested": "Nicht interessant",
  found: "Gefunden",
  "not-found": "Nicht gefunden",
};

export const MATCH_SCORE_ORDER: MatchScore[] = [
  "excellent",
  "good",
  "ok",
  "bad",
  "very-bad",
];

export const MATCH_SCORE_LABELS: Record<MatchScore, string> = {
  "very-bad": "Sehr schlecht",
  bad: "Schlecht",
  ok: "OK",
  good: "Gut",
  excellent: "Ausgezeichnet",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  gone: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  renewed: "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300",
  applied: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  ignored:
    "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300",
  invited:
    "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
  interviewed:
    "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300",
  offered: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300",
  rejected: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  "not-interested":
    "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
};
