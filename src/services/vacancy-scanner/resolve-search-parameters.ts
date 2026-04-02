import type { Applicant } from "@/models/applicant/types.js";
import type { JobSearch } from "@/models/job-search/types.js";
import type { SearchParameters } from "./scan.js";

export function resolveSearchParameters(
  jobSearch: JobSearch,
  applicant: Applicant,
): SearchParameters {
  const location = applicant.personal.address?.city ?? "";
  return {
    location,
    query: jobSearch.params.searchTerm,
    radiusKm: jobSearch.params.radiusKm,
  };
}
