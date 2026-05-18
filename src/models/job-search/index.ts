export type { JobSearchID, SearchSource } from "./id.js"
export { JobSearchID, SearchSource } from "./id.js"

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

export interface ConsultationSuggestion {
  searchTerm: string
  searchMode: SearchMode
  reason: string
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export { SEARCH_MODE_LABELS } from "./constants.js"
export { DEFAULT_JOB_SEARCH } from "./constants.js"
export { resolveJobSearch } from "./resolve.js"
export {
  createDefaultJobSearchEditorSnapshot,
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
} from "./editor-snapshot.js"

export { JobSearchSchema, JobSearchInfoSchema } from "./schemas.js"
