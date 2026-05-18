import type { JobSearch } from "@/models/job-search"
import { DEFAULT_JOB_SEARCH } from "@/models/job-search/constants.js"

export function resolveJobSearch(data: Partial<JobSearch>): JobSearch {
  return {
    searchTerm: data.searchTerm ?? DEFAULT_JOB_SEARCH.searchTerm,
    radiusKm: data.radiusKm ?? DEFAULT_JOB_SEARCH.radiusKm,
    mode: data.mode ?? DEFAULT_JOB_SEARCH.mode,
    sources: data.sources ?? [],
    maxResultsPerSource:
      data.maxResultsPerSource ?? DEFAULT_JOB_SEARCH.maxResultsPerSource,
    maxCommuteMinutes:
      data.maxCommuteMinutes ?? DEFAULT_JOB_SEARCH.maxCommuteMinutes,
    notes: data.notes ?? DEFAULT_JOB_SEARCH.notes,
    coverLetter: data.coverLetter ?? DEFAULT_JOB_SEARCH.coverLetter,
  }
}
