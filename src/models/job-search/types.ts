export const SEARCH_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const;

export type SearchMode = (typeof SEARCH_MODES)[number];

export interface SearchParams {
  searchTerm: string;
  radiusKm: number;
  searchMode: SearchMode;
  sources: string[];
  maxResults?: number;
}

export interface SearchPreferences {
  maxDistanceKm?: number;
  maxCommuteMinutes?: number;
  freeText: string[];
}

export interface JobSearch {
  id: string;
  applicantId: string;
  params: SearchParams;
  preferences: SearchPreferences;
}

export interface JobSearchInfo {
  id: string;
  applicantId: string;
  searchTerm: string;
}

export interface ConsultationSuggestion {
  searchTerm: string;
  searchMode: SearchMode;
  reason: string;
}

export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  searchTerm: "",
  radiusKm: 30,
  searchMode: "employment",
  sources: [],
};

export const DEFAULT_PREFERENCES: SearchPreferences = {
  freeText: [],
};
