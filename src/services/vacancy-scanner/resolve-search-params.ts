import type { Applicant } from "@/models/applicant/types.js";
import type { JobSearch } from "@/models/job-search/types.js";
import type { SearchParams } from "./scan.js";

export function resolveSearchParams(
  jobSearch: JobSearch,
  applicant: Applicant,
): SearchParams {
  const location = applicant.personal.address?.city ?? "";
  return {
    location,
    query: jobSearch.params.searchTerm,
    radiusKm: jobSearch.params.radiusKm,
  };
}
