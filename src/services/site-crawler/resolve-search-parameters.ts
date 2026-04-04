import type { Applicant } from "@/models/applicant/types.js"
import type { JobSearch } from "@/models/job-search/types.js"
import type { JobSearchCriteria } from "@/models/job-search/types.js"

export function resolveSearchParameters(
  jobSearch: JobSearch,
  applicant: Applicant,
): JobSearchCriteria {
  const location = applicant.personal.address?.city ?? ""
  return {
    location,
    query: jobSearch.params.searchTerm,
    radiusKm: jobSearch.params.radiusKm,
    mode: jobSearch.params.searchMode,
    limit: jobSearch.params.maxResults,
  }
}
