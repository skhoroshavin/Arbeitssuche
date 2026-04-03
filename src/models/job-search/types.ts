export type SearchMode = "employment" | "entry-level" | "apprenticeship";

export interface SearchParameters {
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
  params: SearchParameters;
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
