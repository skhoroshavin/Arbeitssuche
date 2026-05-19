import { DEFAULT_JOB_SEARCH } from "@/models/job-search/constants.js"
import type { JobSearch } from "@/models/job-search"

export function createDefaultJobSearchEditorSnapshot(): JobSearch {
  return { ...DEFAULT_JOB_SEARCH }
}

export function resolveDraftJobSearch(jobSearch: JobSearch): JobSearch {
  return {
    ...jobSearch,
    searchTerm: resolveDraftSearchTerm(jobSearch.searchTerm),
  }
}

export function isMeaningfulJobSearchEditorSnapshot(
  jobSearch: JobSearch,
): boolean {
  const checks = [
    jobSearch.searchTerm.trim().length > 0,
    jobSearch.radiusKm !== DEFAULT_JOB_SEARCH.radiusKm,
    jobSearch.mode !== DEFAULT_JOB_SEARCH.mode,
    jobSearch.sources.length > 0,
    jobSearch.maxResultsPerSource !== DEFAULT_JOB_SEARCH.maxResultsPerSource,
    jobSearch.maxCommuteMinutes !== DEFAULT_JOB_SEARCH.maxCommuteMinutes,
    jobSearch.notes.trim().length > 0,
    jobSearch.coverLetter.trim().length > 0,
  ]
  return checks.some(Boolean)
}

function resolveDraftSearchTerm(searchTerm: string): string {
  const normalized = searchTerm.trim()
  return normalized.length > 0 ? normalized : "Neue Suche"
}
