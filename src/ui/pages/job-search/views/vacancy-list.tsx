import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useLocation, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useApiKeyStatus, useJobSearchVacancyListView } from "@/ui/data"
import { invalidateQuery, jobSearchQueryKeys } from "@/ui/data"
import { useStartJobSearchCrawl, useAbortJobSearchCrawl } from "@/ui/data"
import {
  useEnrichAllUnenriched,
  useAbortEnrichment,
  type VacancyWithStatus,
} from "@/ui/data"
import { useJobProgress } from "@/ui/pages/job-search/hooks"
import { PageHeader, EmptyState, Loading } from "@/ui/components"
import { FilterBar } from "./filter-bar"
import { VacancyCard } from "./vacancy-card"
import { KeyWarnings } from "./key-warnings"
import { useVacancyFilters, useFilteredVacancies } from "./use-vacancy-filters"

export default function JobSearchVacancyList() {
  const { id = "" } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const listData = useVacancyListData(id)
  const crawl = useCrawlControl(id)
  const enrich = useEnrichControl(id, listData.vacancies)
  const { filter, sortBy, setFilter, setSortBy } = useVacancyFilters()

  const { statusCounts, filtered } = useFilteredVacancies(
    listData.vacancies,
    filter,
    sortBy,
  )

  const { hasLlmKey, hasMapsKey } = useApiKeyStatus()
  const hasStartedInitialUpdateReference = useRef(false)

  useEffect(() => {
    const shouldStartInitialUpdate = hasStartInitialUpdateFlag(location.state)
    if (!shouldStartInitialUpdate) return
    if (hasStartedInitialUpdateReference.current) return
    hasStartedInitialUpdateReference.current = true
    crawl.handleStartCrawl()
    void navigate(location.pathname + location.search, {
      replace: true,
      state: undefined,
    })
  }, [
    crawl.handleStartCrawl,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ])

  if (listData.isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <>
            Stellen{" "}
            <span className="text-gray-400 dark:text-gray-500 font-normal text-lg">
              ({listData.totalCount})
            </span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <EnrichAllButton
              hasUnenriched={enrich.hasUnenriched}
              isEnriching={enrich.isEnriching}
              isCrawling={crawl.isCrawling}
              onEnrichAll={enrich.handleEnrichAll}
              onAbort={enrich.handleAbort}
            />
            <button
              onClick={crawl.handleStartCrawl}
              disabled={crawl.isCrawling}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Aktualisieren
            </button>
            <KeyWarnings
              hasLlmKey={hasLlmKey}
              hasMapsKey={hasMapsKey}
              returnTo={location.pathname + location.search}
            />
          </div>
        }
      />

      <FilterBar
        statusCounts={statusCounts}
        filter={filter}
        sortBy={sortBy}
        setFilter={setFilter}
        setSortBy={setSortBy}
      />

      <div className="space-y-3">
        {filtered.map((v) => (
          <VacancyCard
            key={v.hash}
            vacancy={v}
            jobSearchId={id}
            searchString={location.search}
          />
        ))}
        {filtered.length === 0 && (
          <EmptyState message="Keine Stellen entsprechen dem Filter." />
        )}
      </div>
    </div>
  )
}

function EnrichAllButton({
  hasUnenriched,
  isEnriching,
  isCrawling,
  onEnrichAll,
  onAbort,
}: {
  hasUnenriched: boolean
  isEnriching: boolean
  isCrawling: boolean
  onEnrichAll: () => void
  onAbort: () => void
}) {
  if (!hasUnenriched && !isEnriching) return
  if (isEnriching) {
    return (
      <button
        onClick={onAbort}
        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
      >
        Analyse abbrechen
      </button>
    )
  }
  return (
    <button
      onClick={onEnrichAll}
      disabled={isCrawling}
      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
    >
      Alle analysieren
    </button>
  )
}

function useCrawlControl(id: string) {
  const queryClient = useQueryClient()
  const startCrawl = useStartJobSearchCrawl(id)
  const abortCrawl = useAbortJobSearchCrawl(id)
  const [isCrawling, setIsCrawling] = useState(false)
  const { vacancyUpdateCount } = useJobProgress(isCrawling ? id : undefined)

  useEffect(() => {
    if (vacancyUpdateCount > 0) {
      void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
    }
  }, [vacancyUpdateCount, queryClient, id])

  const handleStartCrawl = useCallback(() => {
    startCrawl.mutate(undefined, {
      onSuccess: () => {
        setIsCrawling(true)
      },
      onSettled: () => {
        setIsCrawling(false)
        void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
      },
    })
  }, [id, startCrawl, queryClient])

  return {
    handleStartCrawl,
    handleAbort: useCallback(() => abortCrawl.mutate(), [abortCrawl]),
    isCrawling,
  }
}

function useVacancyListData(id: string) {
  const { data, isLoading } = useJobSearchVacancyListView(id)
  return {
    vacancies: data.vacancies,
    totalCount: data.totalCount,
    isLoading,
  }
}

function useEnrichControl(id: string, vacancies: VacancyWithStatus[]) {
  const queryClient = useQueryClient()
  const enrichAll = useEnrichAllUnenriched(id)
  const abortEnrichment = useAbortEnrichment(id)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichProgressJobId, setEnrichProgressJobId] = useState<string>()
  const { vacancyUpdateCount } = useJobProgress(enrichProgressJobId)

  const hasUnenriched = vacancies.some((v) => !v.enriched || v.enrichmentDirty)

  useEffect(() => {
    if (vacancyUpdateCount > 0) {
      void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
    }
  }, [vacancyUpdateCount, queryClient, id])

  const handleEnrichAll = () => {
    setIsEnriching(true)
    setEnrichProgressJobId(id)
    enrichAll.mutate(undefined, {
      onSettled: () => {
        setIsEnriching(false)
        setEnrichProgressJobId(undefined)
        void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
      },
    })
  }

  const handleAbort = () => {
    abortEnrichment.mutate()
  }

  return { hasUnenriched, isEnriching, handleEnrichAll, handleAbort }
}

function hasStartInitialUpdateFlag(state: unknown): boolean {
  if (!state || typeof state !== "object") return false
  if (!("startInitialUpdate" in state)) return false
  return state.startInitialUpdate === true
}
