import type {
  JobSearch,
  SearchParameters,
  SearchPreferences,
} from "@/models/job-search/types.js";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_SEARCH_PARAMS,
} from "@/models/job-search/types.js";

export function resolveJobSearch(data: JobSearchInput): JobSearch {
  return {
    id: data.id ?? "",
    applicantId: data.applicantId ?? "",
    params: resolveSearchParameters(data.params),
    preferences: resolveSearchPreferences(data.preferences),
  };
}

interface JobSearchInput extends Omit<
  Partial<JobSearch>,
  "params" | "preferences"
> {
  params?: Partial<SearchParameters>;
  preferences?: Partial<SearchPreferences>;
}

function resolveSearchParameters(
  parameters?: Partial<SearchParameters>,
): SearchParameters {
  return {
    ...DEFAULT_SEARCH_PARAMS,
    ...parameters,
    sources: parameters?.sources ?? [],
  };
}

function resolveSearchPreferences(
  preferences?: Partial<SearchPreferences>,
): SearchPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    freeText: preferences?.freeText ?? [],
  };
}
