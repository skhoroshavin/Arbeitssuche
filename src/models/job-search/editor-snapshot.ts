import {
  DEFAULT_PREFERENCES,
  DEFAULT_SEARCH_PARAMS,
} from "@/models/job-search/constants.js"
import type {
  JobSearch,
  JobSearchEditorSnapshot,
  SearchParameters,
  SearchPreferences,
} from "@/models/job-search/types.js"

export function createDefaultJobSearchEditorSnapshot(): JobSearchEditorSnapshot {
  return {
    params: { ...DEFAULT_SEARCH_PARAMS },
    preferences: { ...DEFAULT_PREFERENCES },
    coverLetterContent: "",
  }
}

export function mapPersistedJobSearchToSnapshot(
  jobSearch: JobSearch,
  coverLetterContent: string,
): JobSearchEditorSnapshot {
  return {
    params: resolveParameters(jobSearch.params),
    preferences: resolvePreferences(jobSearch.preferences),
    coverLetterContent,
  }
}

export function mapSnapshotToPersistedJobSearch(
  id: string,
  applicantId: string,
  snapshot: JobSearchEditorSnapshot,
): JobSearch {
  return {
    id,
    applicantId,
    params: resolveParameters(snapshot.params),
    preferences: resolvePreferences(snapshot.preferences),
  }
}

export function isMeaningfulJobSearchEditorSnapshot(
  snapshot: JobSearchEditorSnapshot,
): boolean {
  const checks = [
    snapshot.params.searchTerm.trim().length > 0,
    snapshot.params.radiusKm !== DEFAULT_SEARCH_PARAMS.radiusKm,
    snapshot.params.searchMode !== DEFAULT_SEARCH_PARAMS.searchMode,
    snapshot.params.sources.length > 0,
    snapshot.params.maxResults !== undefined,
    snapshot.preferences.maxDistanceKm !== undefined,
    snapshot.preferences.maxCommuteMinutes !== undefined,
    snapshot.preferences.freeText.some((entry) => entry.trim().length > 0),
    snapshot.coverLetterContent.trim().length > 0,
  ]
  return checks.some(Boolean)
}

function resolveParameters(parameters: SearchParameters): SearchParameters {
  return {
    ...DEFAULT_SEARCH_PARAMS,
    ...parameters,
    sources: parameters.sources,
  }
}

function resolvePreferences(preferences: SearchPreferences): SearchPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    freeText: preferences.freeText,
  }
}
