import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  JobSearch,
  JobSearchEditorSnapshot,
  JobSearchInfo,
} from "@/models/job-search"

import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
  JobSearchInfoSchema,
  JobSearchDraftSchema,
} from "@/models/job-search"

import type {
  Activity,
  VacancyDTO,
  VacancySource,
  VacancyStatus,
} from "@/models/vacancy"

import { VacancyWithStatusSchema } from "@/models/vacancy"

import { api } from "./internal/api"

import { jobSearchQueryKeys, invalidateQuery } from "./job-search-query-keys"

const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchDraftSchema.optional(),
})

const CreatedJobSearchIdSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
})

const ContentSchema = z.object({ content: z.string() })

const VacancyListResponseSchema = z.object({
  vacancies: z.array(VacancyWithStatusSchema),
  totalCount: z.number(),
  generatedAt: z.string(),
  latestCrawl: z.string(),
})

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
      JobSearchSchema.parse(await api().invoke("job-searches:load", id)),
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

export function useJobSearchDraft(applicantId: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.draft(applicantId),
    queryFn: async () =>
      JobSearchDraftResponseSchema.parse(
        await api().invoke("job-searches:draft:load", applicantId),
      ),
    enabled: !!applicantId,
  })
}

export function useSaveJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (snapshot: JobSearchEditorSnapshot) =>
      api().invoke("job-searches:draft:save", applicantId, snapshot),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useDeleteJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("job-searches:draft:delete", applicantId),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useFinalizeJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      CreatedJobSearchIdSchema.parse(
        await api().invoke("job-searches:draft:finalize", applicantId),
      ),
    onSuccess: async ({ id }) => {
      await invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId))
      await invalidateQuery(queryClient, jobSearchQueryKeys.list(applicantId))
      await invalidateQuery(queryClient, jobSearchQueryKeys.listRoot())
      await invalidateQuery(queryClient, jobSearchQueryKeys.detail(id))
      await invalidateQuery(queryClient, jobSearchQueryKeys.coverLetter(id))
    },
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
      ContentSchema.parse(
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
      ContentSchema.parse(
        await api().invoke("job-searches:cover-letter:generate", id),
      ),
  })
}

export function useGenerateDraftCoverLetter(applicantId: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke(
          "job-searches:draft:cover-letter:generate",
          applicantId,
        ),
      ),
  })
}

export function useVacancyCoverLetter(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyCoverLetter(id, hash),
    queryFn: async () =>
      ContentSchema.parse(
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
      ContentSchema.parse(
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
      VacancyWithStatusSchema.parse(
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
      JobSearchListResponseSchema.parse(
        await api().invoke("job-searches:list", applicantId),
      ),
  })
}

function useJobSearchVacancies(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyList(id),
    queryFn: async () =>
      VacancyListResponseSchema.parse(
        await api().invoke("job-searches:vacancies:list", id),
      ),
    enabled: !!id,
  })
}
