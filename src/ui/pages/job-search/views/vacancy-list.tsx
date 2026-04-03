import { useState, useEffect } from "react"
import { useParams, useLocation } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useApiKeyStatus, useJobSearchVacancyListView } from "@/ui/data"
import { invalidateQuery, jobSearchQueryKeys } from "@/ui/data"
import { useStartJobSearchCrawl, useAbortJobSearchCrawl } from "@/ui/data"
import { useJobProgress } from "@/ui/pages/job-search/hooks"
import { PageHeader, EmptyState, Loading } from "@/ui/components"
import { FilterBar } from "./filter-bar"
import { VacancyCard } from "./vacancy-card"
import { KeyWarnings } from "./key-warnings"
import { CrawlProgressCard } from "./crawl-progress-card"
import { useVacancyFilters, useFilteredVacancies } from "./use-vacancy-filters"

export default function JobSearchVacancyList() {
  const { id = "" } = useParams<{ id: string }>()
  const location = useLocation()
  const listData = useVacancyListData(id)
  const crawl = useCrawlControl(id)
  const { filter, sortBy, setFilter, setSortBy } = useVacancyFilters()

  const { statusCounts, filtered } = useFilteredVacancies(
    listData.vacancies,
    filter,
    sortBy,
  )

  const { hasLlmKey, hasMapsKey } = useApiKeyStatus()

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
          <div>
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

      {crawl.progressJobId && crawl.events.length > 0 && (
        <CrawlProgressCard
          events={crawl.events}
          done={crawl.done}
          onAbort={crawl.handleAbort}
          onClose={crawl.handleClose}
        />
      )}

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

function useCrawlControl(id: string) {
  const queryClient = useQueryClient()
  const startCrawl = useStartJobSearchCrawl(id)
  const abortCrawl = useAbortJobSearchCrawl(id)
  const [progressJobId, setProgressJobId] = useState<string>()
  const { events, done, reset, vacancyUpdateCount } =
    useJobProgress(progressJobId)

  useEffect(() => {
    if (vacancyUpdateCount > 0) {
      void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
    }
  }, [vacancyUpdateCount, queryClient, id])

  const handleStartCrawl = () => {
    reset()
    startCrawl.mutate(undefined, {
      onSuccess: () => {
        setProgressJobId(id)
      },
    })
  }

  const handleClose = () => {
    setProgressJobId(undefined)
    void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
  }

  return {
    progressJobId,
    events,
    done,
    handleStartCrawl,
    handleAbort: () => abortCrawl.mutate(),
    handleClose,
    isCrawling: !!(progressJobId && !done),
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
