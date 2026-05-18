import type { SearchMode } from "@/models/job-search"

export interface JobSearchEditorConfigValue {
  searchTerm: string
  radiusKm: number
  searchMode: SearchMode
  sources: string[]
  maxResults?: number
  maxCommuteMinutes?: number
  freeText: string[]
}

export interface JobSearchCoverLetterValue {
  content: string
}

export interface SiteInfo {
  name: string
  supportedModes: string[]
}
