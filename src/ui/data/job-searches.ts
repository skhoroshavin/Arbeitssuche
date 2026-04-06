import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type { JobSearch, JobSearchInfo } from "@/models/job-search/types"

import type {
  Activity,
  VacancyDTO,
  VacancySource,
  VacancyStatus,
} from "@/models/vacancy/types"

import typia from "typia"

import { api } from "./internal/api"

import { jobSearchQueryKeys, invalidateQuery } from "./job-search-query-keys"

export function useJobSearchListView(applicantId?: string) {
  const query = useJobSearches(applicantId)
  return {
    ...query,
    data: query.data ?? EMPTY_JOB_SEARCH_LIST,
  }
}

export function useJobSearch(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.detail(id),
    queryFn: async () =>
      typia.assert<JobSearch>(await api().invoke("job-searches:load", id)),
    enabled: !!id,
  })
}

export function useCreateJobSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      searchTerm: string
      applicantId: string
      searchMode?: string
    }) =>
      api().invoke(
        "job-searches:create",
        body.searchTerm,
        body.applicantId,
        body.searchMode,
      ),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.listRoot()),
  })
}

export function useUpdateJobSearch(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: JobSearch) =>
      api().invoke("job-searches:save", id, data),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.detail(id)),
  })
}

export function useDeleteJobSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api().invoke("job-searches:delete", id),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.listRoot()),
  })
}

export function useJobSearchCoverLetter(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.coverLetter(id),
    queryFn: async () =>
      typia.assert<{ content: string }>(
        await api().invoke("job-searches:cover-letter:load", id),
      ),
    enabled: !!id,
  })
}

export function useUpdateJobSearchCoverLetter(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke("job-searches:cover-letter:save", id, content),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.coverLetter(id)),
  })
}

export function useGenerateCoverLetter(id: string) {
  return useMutation({
    mutationFn: async () =>
      typia.assert<{ content: string }>(
        await api().invoke("job-searches:cover-letter:generate", id),
      ),
  })
}

export function useVacancyCoverLetter(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyCoverLetter(id, hash),
    queryFn: async () =>
      typia.assert<{ content: string }>(
        await api().invoke(
          "job-searches:vacancies:cover-letter:load",
          id,
          hash,
        ),
      ),
    enabled: !!id && !!hash,
  })
}

export function useUpdateVacancyCoverLetter(id: string, hash: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke(
        "job-searches:vacancies:cover-letter:save",
        id,
        hash,
        content,
      ),
    onSuccess: () =>
      invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyCoverLetter(id, hash),
      ),
  })
}

export function useGenerateVacancyCoverLetter(id: string, hash: string) {
  return useMutation({
    mutationFn: async () =>
      typia.assert<{ content: string }>(
        await api().invoke(
          "job-searches:vacancies:cover-letter:generate",
          id,
          hash,
        ),
      ),
  })
}

export function useJobSearchVacancyListView(id: string) {
  const query = useJobSearchVacancies(id)
  return {
    ...query,
    data:
      query.data === undefined
        ? EMPTY_VACANCY_LIST
        : {
            vacancies: query.data.vacancies,
            totalCount: query.data.totalCount,
          },
  }
}

export function useJobSearchVacancy(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyDetail(id, hash),
    queryFn: async () =>
      typia.assert<VacancyWithStatus>(
        await api().invoke("job-searches:vacancies:load", id, hash),
      ),
    enabled: !!id && !!hash,
  })
}

export type VacancyWithStatus = VacancyDTO & {
  status: VacancyStatus
  sources: VacancySource[]
}

export function useReEnrichVacancy(jobSearchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hash: string) =>
      api().invoke("vacancies:re-enrich", jobSearchId, hash),
    onSuccess: () => {
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyList(jobSearchId),
      )
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyDetailRoot(jobSearchId),
      )
    },
  })
}

export function useEnrichAllUnenriched(jobSearchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("vacancies:enrich-unenriched", jobSearchId),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(jobSearchId)),
  })
}

export function useAbortEnrichment(jobSearchId: string) {
  return useMutation({
    mutationFn: () => api().invoke("vacancies:enrich:abort", jobSearchId),
  })
}

export function useAddActivity(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ hash, activity }: { hash: string; activity: Activity }) =>
      api().invoke("job-searches:vacancies:add-activity", id, hash, activity),
    onSuccess: () => {
      void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyDetailRoot(id),
      )
    },
  })
}

const EMPTY_VACANCY_LIST: VacancyListView = {
  vacancies: [],
  totalCount: 0,
}

const EMPTY_JOB_SEARCH_LIST: JobSearchListView = {
  jobSearches: [],
}

type VacancyListView = Readonly<{
  vacancies: VacancyWithStatus[]
  totalCount: number
}>

type JobSearchListView = Readonly<{
  jobSearches: JobSearchInfo[]
}>

function useJobSearches(applicantId?: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.list(applicantId),
    queryFn: async () =>
      typia.assert<{ jobSearches: JobSearchInfo[] }>(
        await api().invoke("job-searches:list", applicantId),
      ),
  })
}

function useJobSearchVacancies(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyList(id),
    queryFn: async () =>
      typia.assert<VacancyListResponse>(
        await api().invoke("job-searches:vacancies:list", id),
      ),
    enabled: !!id,
  })
}

interface VacancyListResponse {
  vacancies: VacancyWithStatus[]
  totalCount: number
  generatedAt: string
  latestCrawl: string
}
