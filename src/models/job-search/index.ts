import { JobSearchID, SearchSource } from "./id.js"
export { JobSearchID, SearchSource }

export interface JobSearch {
  searchTerm: string
  radiusKm: number
  mode: SearchMode
  sources: SearchSource[]
  maxResultsPerSource: number
  maxCommuteMinutes: number
  notes: string
  coverLetter: string
}

export interface JobSearchInfo {
  id: JobSearchID
  displayName: string
}

export interface JobSearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
  limit?: number
}

export interface ConsultationSuggestion {
  searchTerm: string
  searchMode: SearchMode
  reason: string
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export { SEARCH_MODES, SEARCH_MODE_LABELS, DEFAULT_JOB_SEARCH } from "./constants.js"
export { resolveJobSearch } from "./resolve.js"
export {
  createDefaultJobSearchEditorSnapshot,
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
} from "./editor-snapshot.js"

export { JobSearchSchema, JobSearchInfoSchema } from "./schemas.js"
