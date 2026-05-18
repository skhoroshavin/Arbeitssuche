import { z } from "zod"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "./internal/api"

import { invalidateQuery, jobSearchQueryKeys } from "./job-search-query-keys"

export function useStartJobSearchCrawl(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("job-searches:crawl:start", id),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id)),
  })
}

export function useAbortJobSearchCrawl(id: string) {
  return useMutation({
    mutationFn: () => api().invoke("job-searches:crawl:abort", id),
  })
}

export function useSiteListView() {
  const query = useSites()
  return {
    ...query,
    data: query.data ?? EMPTY_SITE_LIST,
  }
}

const EMPTY_SITE_LIST: { sites: SiteInfo[] } = { sites: [] }

type SiteInfo = { name: string; supportedModes: string[] }

function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () =>
      SitesListResponseSchema.parse(await api().invoke("sites:list")),
  })
}

const SiteInfoSchema = z.object({
  name: z.string(),
  supportedModes: z.array(z.string()),
})

const SitesListResponseSchema = z.object({
  sites: z.array(SiteInfoSchema),
})
