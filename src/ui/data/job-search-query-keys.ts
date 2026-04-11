import type { QueryClient } from "@tanstack/react-query"

export const jobSearchQueryKeys = {
  listRoot: () => ["job-searches"] as const,
  list: (applicantId?: string) =>
    ["job-searches", applicantId ?? "all"] as const,
  detail: (id: string) => ["job-search", id] as const,
  draft: (applicantId: string) => ["job-search-draft", applicantId] as const,
  coverLetter: (id: string) => ["job-search-cover-letter", id] as const,
  vacancyList: (id: string) => ["job-search-vacancies", id] as const,
  vacancyDetailRoot: (id: string) => ["job-search-vacancy", id] as const,
  vacancyDetail: (id: string, hash: string) =>
    ["job-search-vacancy", id, hash] as const,
  vacancyCoverLetter: (id: string, hash: string) =>
    ["vacancy-cover-letter", id, hash] as const,
}

export function invalidateQuery(
  queryClient: QueryClient,
  key: readonly unknown[],
) {
  return queryClient.invalidateQueries({ queryKey: key })
}
