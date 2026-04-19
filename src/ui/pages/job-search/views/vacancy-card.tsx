import { useState } from "react"
import { Link } from "react-router"
import { Markdown } from "@/ui/components"
import { StatusBadge } from "@/ui/pages/job-search/components"
import { MATCH_SCORE_LABELS, STATUS_LABELS } from "@/models/vacancy/index"
import type { VacancyWithStatus } from "@/ui/data"
import { useReEnrichVacancy } from "@/ui/data"
import { getCommuteSummary, getLatestActivityDate } from "./vacancy-utilities"
import { deriveEnrichmentState, type EnrichmentState } from "./enrichment-state"

export function VacancyCard({
  vacancy: v,
  jobSearchId,
  searchString,
  isEnriching: isJobSearchEnriching,
}: {
  vacancy: VacancyWithStatus
  jobSearchId: string
  searchString: string
  isEnriching: boolean
}) {
  const enrichmentState = deriveEnrichmentState(
    v.enriched,
    v.enrichmentDirty,
    isJobSearchEnriching,
  )
  const reEnrich = useReEnrichVacancy(jobSearchId)
  const [isEnriching, setIsEnriching] = useState(false)

  const handleReEnrich = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsEnriching(true)
    reEnrich.mutate(v.hash, {
      onSettled: () => setIsEnriching(false),
    })
  }

  return (
    <Link
      to={`/job-searches/${jobSearchId}/vacancies/${v.hash}`}
      state={{ vacancyListSearch: searchString }}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {v.hash}
            </span>
            <StatusBadge status={v.status}>
              {STATUS_LABELS[v.status]}
            </StatusBadge>
            <EnrichmentIndicator
              state={enrichmentState}
              matchScore={MATCH_SCORE_LABELS[v.matchScore]}
            />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {v.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {v.company}
          </p>
          <VacancyCardSources sources={v.sources} />
          {v.addresses.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {v.addresses.join(" | ")}
            </p>
          )}
        </div>
        <VacancyCardMeta vacancy={v} />
      </div>
      {(enrichmentState === "enriched" || enrichmentState === "stale") && (
        <EnrichedSummaryRow
          summary={v.summary}
          isEnriching={isEnriching}
          isError={reEnrich.isError}
          onReEnrich={handleReEnrich}
        />
      )}
      {enrichmentState === "plain" && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Nicht analysiert
          </p>
          <EnrichActionButton
            isEnriching={isEnriching}
            isError={reEnrich.isError}
            label="Analysieren"
            onReEnrich={handleReEnrich}
          />
        </div>
      )}
    </Link>
  )
}

function EnrichedSummaryRow({
  summary,
  isEnriching,
  isError,
  onReEnrich,
}: {
  summary: string
  isEnriching: boolean
  isError: boolean
  onReEnrich: (event: React.MouseEvent) => void
}) {
  return (
    <div className="mt-2 flex items-start gap-2">
      {summary && (
        <Markdown className="flex-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {summary}
        </Markdown>
      )}
      <EnrichActionButton
        isEnriching={isEnriching}
        isError={isError}
        label="Neu analysieren"
        onReEnrich={onReEnrich}
      />
    </div>
  )
}

function EnrichActionButton({
  isEnriching,
  isError,
  label,
  onReEnrich,
}: {
  isEnriching: boolean
  isError: boolean
  label: string
  onReEnrich: (event: React.MouseEvent) => void
}) {
  const title = isError ? "Analyse fehlgeschlagen, erneut versuchen" : label
  let content = label
  if (isEnriching) {
    content = "⟳"
  } else if (label === "Neu analysieren") {
    content = "↺"
  }

  return (
    <button
      onClick={onReEnrich}
      disabled={isEnriching}
      className={`shrink-0 ml-auto text-xs px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50 ${isError ? "border-red-300 dark:border-red-700 text-red-500" : "border-gray-200 dark:border-gray-600 text-gray-400 hover:text-blue-600 hover:border-blue-300"}`}
      title={title}
    >
      {content}
    </button>
  )
}

function EnrichmentIndicator({
  state,
  matchScore,
}: {
  state: EnrichmentState
  matchScore: string
}) {
  if (state === "enriched") {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {matchScore}
      </span>
    )
  }
  if (state === "pending") {
    return (
      <span className="text-xs text-blue-500 dark:text-blue-400 animate-pulse">
        Wird analysiert...
      </span>
    )
  }
  if (state === "stale") {
    return (
      <>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {matchScore}
        </span>
        <span className="text-xs px-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          veraltet
        </span>
      </>
    )
  }
  return
}

function VacancyCardSources({
  sources,
}: {
  sources: { site: string; url: string }[]
}) {
  if (sources.length === 0) return
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {sources.map((s) => (
        <span
          key={s.site}
          role="link"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            window.open(s.url, "_blank")
          }}
          className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
        >
          {s.site}
        </span>
      ))}
    </div>
  )
}

function VacancyCardMeta({ vacancy }: { vacancy: VacancyWithStatus }) {
  const commute = getCommuteSummary(vacancy)
  const latestDate = getLatestActivityDate(vacancy)
  return (
    <div className="text-right text-xs text-gray-400 dark:text-gray-500 ml-4 flex-shrink-0">
      {commute && (
        <div className="text-gray-600 dark:text-gray-400">{commute}</div>
      )}
      {latestDate && <div>{new Date(latestDate).toLocaleDateString()}</div>}
    </div>
  )
}
