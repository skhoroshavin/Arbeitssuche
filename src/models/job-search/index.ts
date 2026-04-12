export interface JobSearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
  limit?: number
}

export interface JobSearch {
  id: string
  applicantId: string
  params: SearchParameters
  preferences: SearchPreferences
}

export interface JobSearchDraft {
  applicantId: string
  snapshot: JobSearchEditorSnapshot
  meaningful: boolean
}

export interface JobSearchEditorSnapshot {
  params: SearchParameters
  preferences: SearchPreferences
  coverLetterContent: string
}

export interface SearchParameters {
  searchTerm: string
  radiusKm: number
  searchMode: SearchMode
  sources: string[]
  maxResults?: number
}

export interface SearchPreferences {
  maxDistanceKm?: number
  maxCommuteMinutes?: number
  freeText: string[]
}

export interface JobSearchInfo {
  id: string
  applicantId: string
  searchTerm: string
}

export interface ConsultationSuggestion {
  searchTerm: string
  searchMode: SearchMode
  reason: string
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export { SEARCH_MODE_LABELS } from "./constants.js"
export {
  SEARCH_MODES,
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_PREFERENCES,
} from "./constants.js"
export { resolveJobSearch } from "./resolve.js"
export {
  createDefaultJobSearchEditorSnapshot,
  resolveDraftJobSearchEditorSnapshot,
  mapPersistedJobSearchToSnapshot,
  mapSnapshotToPersistedJobSearch,
  isMeaningfulJobSearchEditorSnapshot,
} from "./editor-snapshot.js"
