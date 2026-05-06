import {
  DEFAULT_PREFERENCES,
  DEFAULT_SEARCH_PARAMS,
} from "@/models/job-search/constants.js"
import type {
  JobSearch,
  JobSearchEditorSnapshot,
  SearchParameters,
  SearchPreferences,
} from "@/models/job-search"

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

export function resolveDraftJobSearchEditorSnapshot(
  snapshot: JobSearchEditorSnapshot,
): JobSearchEditorSnapshot {
  return {
    ...snapshot,
    params: {
      ...snapshot.params,
      searchTerm: resolveDraftSearchTerm(snapshot.params.searchTerm),
    },
  }
}

export function isMeaningfulJobSearchEditorSnapshot(
  snapshot: JobSearchEditorSnapshot,
): boolean {
  return (
    hasMeaningfulParameters(snapshot.params) ||
    hasMeaningfulPreferences(snapshot.preferences) ||
    snapshot.coverLetterContent.trim().length > 0
  )
}

function resolveDraftSearchTerm(searchTerm: string): string {
  const normalizedSearchTerm = searchTerm.trim()
  return normalizedSearchTerm.length > 0 ? normalizedSearchTerm : "Neue Suche"
}

function hasMeaningfulParameters(parameters: SearchParameters): boolean {
  const checks = [
    parameters.searchTerm.trim().length > 0,
    parameters.radiusKm !== DEFAULT_SEARCH_PARAMS.radiusKm,
    parameters.searchMode !== DEFAULT_SEARCH_PARAMS.searchMode,
    parameters.sources.length > 0,
    parameters.maxResults !== undefined,
  ]
  return checks.some(Boolean)
}

function hasMeaningfulPreferences(preferences: SearchPreferences): boolean {
  const checks = [
    preferences.maxDistanceKm !== undefined,
    preferences.maxCommuteMinutes !== undefined,
    preferences.freeText.some((entry) => entry.trim().length > 0),
  ]
  return checks.some(Boolean)
}

function resolveParameters(parameters: SearchParameters): SearchParameters {
  return { ...DEFAULT_SEARCH_PARAMS, ...parameters }
}

function resolvePreferences(preferences: SearchPreferences): SearchPreferences {
  return { ...DEFAULT_PREFERENCES, ...preferences }
}
