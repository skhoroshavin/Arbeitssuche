import type { JobSearch } from "@/models/job-search"
import { DEFAULT_JOB_SEARCH } from "@/models/job-search/constants.js"

export function resolveJobSearch(data: Partial<JobSearch>): JobSearch {
  return {
    searchTerm: resolveField(data.searchTerm, DEFAULT_JOB_SEARCH.searchTerm),
    radiusKm: resolveField(data.radiusKm, DEFAULT_JOB_SEARCH.radiusKm),
    mode: resolveField(data.mode, DEFAULT_JOB_SEARCH.mode),
    sources: data.sources ?? [],
    maxResultsPerSource: resolveField(
      data.maxResultsPerSource,
      DEFAULT_JOB_SEARCH.maxResultsPerSource,
    ),
    maxCommuteMinutes: resolveField(
      data.maxCommuteMinutes,
      DEFAULT_JOB_SEARCH.maxCommuteMinutes,
    ),
    notes: resolveField(data.notes, DEFAULT_JOB_SEARCH.notes),
    coverLetter: resolveField(data.coverLetter, DEFAULT_JOB_SEARCH.coverLetter),
  }
}

function resolveField<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue
}
