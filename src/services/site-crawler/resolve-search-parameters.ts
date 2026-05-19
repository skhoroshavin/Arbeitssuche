import type { Applicant } from "@/models/applicant"
import type { JobSearch, JobSearchCriteria } from "@/models/job-search"

export function resolveSearchParameters(
  jobSearch: JobSearch,
  applicant: Applicant,
): JobSearchCriteria {
  const location = applicant.personal.address?.city ?? ""
  return {
    location,
    query: jobSearch.searchTerm,
    radiusKm: jobSearch.radiusKm,
    mode: jobSearch.mode,
    limit:
      jobSearch.maxResultsPerSource === 0
        ? undefined
        : jobSearch.maxResultsPerSource,
  }
}
