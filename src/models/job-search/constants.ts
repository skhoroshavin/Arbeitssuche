import type {
  SearchMode,
  SearchParameters,
  SearchPreferences,
} from "./types.js"

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

export const DEFAULT_SEARCH_PARAMS: SearchParameters = {
  searchTerm: "",
  radiusKm: 30,
  searchMode: "employment",
  sources: [],
}

export const DEFAULT_PREFERENCES: SearchPreferences = {
  freeText: [],
}
