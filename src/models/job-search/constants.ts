import type { SearchMode, JobSearch } from "."

export const SEARCH_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  employment: "Festanstellung",
  "entry-level": "Berufseinsteiger",
  apprenticeship: "Ausbildung",
}

export const DEFAULT_JOB_SEARCH: JobSearch = {
  searchTerm: "",
  radiusKm: 30,
  mode: "employment",
  sources: [],
  maxResultsPerSource: 0,
  maxCommuteMinutes: 0,
  notes: "",
  coverLetter: "",
}
