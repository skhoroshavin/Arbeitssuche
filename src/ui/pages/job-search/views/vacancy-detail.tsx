import { useState } from "react"
import { useParams, Link, useLocation } from "react-router"
import {
  useJobSearchVacancy,
  useAddActivity,
  useVacancyCoverLetter,
  useUpdateVacancyCoverLetter,
  useGenerateVacancyCoverLetter,
  useReEnrichVacancy,
} from "@/ui/data"
import type { VacancyWithStatus } from "@/ui/data"
import { useApiKeyStatus } from "@/ui/data"
import { Card, SectionHeader, Loading, ArrowLeftIcon } from "@/ui/components"
import { CoverLetterEditor } from "@/ui/pages/job-search/components"
import { Markdown } from "@/ui/components"
import { StatusBadge } from "@/ui/pages/job-search/components"
import { useLayoutConfig } from "@/ui/layout"
import { useJobProgress } from "@/ui/pages/job-search/hooks"
import type { Activity, ActivityType } from "@/models/vacancy"
import {
  MATCH_SCORE_LABELS,
  STATUS_LABELS,
  TRANSITIONS,
} from "@/models/vacancy/index"
import { VacancyCommuteSection } from "./vacancy-commute-section"
import { VacancyContactSection } from "./vacancy-contact-section"
import { VacancyActivityForm } from "./vacancy-activity-form"
import { ActivityHistory } from "./activity-history"
import { deriveEnrichmentState, type EnrichmentState } from "./enrichment-state"

export default function JobSearchVacancyDetail() {
  const { id = "", hash = "" } = useParams<{ id: string; hash: string }>()
  const backSearch = useBackSearch()
  const detail = useVacancyDetailData(id, hash)
  const { hasLlmKey } = useApiKeyStatus()
  const { hasActiveEnrich } = useJobProgress(id)
  const activity = useActivityRecorder(id, hash)

  const title = detail.title

  useLayoutConfig(
    () => ({
      sidebarTitle: "Stelle",
      sidebarNavItems: [],
      headerTitle: title,
      headerBackLink: (
        <Link
          to={`/job-searches/${id}/vacancies${backSearch}`}
          aria-label="Zurück zu Stellen"
        >
          <ArrowLeftIcon />
        </Link>
      ),
    }),
    [title, id, backSearch],
  )

  if (detail.isLoading) return <Loading />
  if (!detail.data) return <div>Stelle nicht gefunden</div>

  const { data } = detail
  const status = data.status
  const allowedActions = TRANSITIONS[status]
  const enrichmentState = deriveEnrichmentState(
    data.enriched,
    data.enrichmentDirty,
    hasActiveEnrich,
  )

  return (
    <div className="space-y-6">
      <VacancyEnrichmentHeader
        hash={hash}
        status={status}
        matchScore={MATCH_SCORE_LABELS[data.matchScore]}
        enrichmentState={enrichmentState}
        jobSearchId={id}
        vacancyHash={hash}
      />

      <VacancyInfoCard data={data} enrichmentState={enrichmentState} />

      {/* Anschreiben */}
      <Card className="p-4 space-y-3">
        <SectionHeader>Anschreiben</SectionHeader>
        <CoverLetterEditor
          coverLetterQuery={detail.coverLetterQuery}
          updateMutation={detail.updateCoverLetter}
          generateMutation={detail.generateCoverLetter}
          llmAvailable={hasLlmKey}
        />
      </Card>

      {/* Actions */}
      <VacancyActivityForm
        allowedActions={allowedActions}
        eventForm={activity.eventForm}
        onSelectAction={activity.setEventForm}
        onConfirm={activity.handleRecordActivity}
      />

      <ActivityHistory activities={data.activityHistory} />
    </div>
  )
}

function VacancyEnrichmentHeader({
  hash,
  status,
  matchScore,
  enrichmentState,
  jobSearchId,
  vacancyHash,
}: {
  hash: string
  status: VacancyWithStatus["status"]
  matchScore: string
  enrichmentState: EnrichmentState
  jobSearchId: string
  vacancyHash: string
}) {
  const reEnrich = useReEnrichVacancy(jobSearchId)
  const [isEnriching, setIsEnriching] = useState(false)

  const handleReEnrich = () => {
    setIsEnriching(true)
    reEnrich.mutate(vacancyHash, { onSettled: () => setIsEnriching(false) })
  }

  const showMatchScore =
    enrichmentState === "enriched" || enrichmentState === "stale"
  const showAction = enrichmentState !== "pending"
  const actionLabel =
    enrichmentState === "plain" ? "Analysieren" : "Neu analysieren"

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="font-mono text-sm text-gray-400 dark:text-gray-500">
        {hash}
      </span>
      <StatusBadge status={status}>{STATUS_LABELS[status]}</StatusBadge>
      <EnrichmentStateLabel
        enrichmentState={enrichmentState}
        matchScore={matchScore}
        showMatchScore={showMatchScore}
      />
      {enrichmentState === "stale" && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          veraltet
        </span>
      )}
      {showAction && (
        <ReEnrichControl
          isEnriching={isEnriching}
          error={reEnrich.error}
          label={actionLabel}
          onReEnrich={handleReEnrich}
        />
      )}
    </div>
  )
}

function ReEnrichControl({
  isEnriching,
  error,
  label,
  onReEnrich,
}: {
  isEnriching: boolean
  error: unknown
  label: string
  onReEnrich: () => void
}) {
  const errorMessage =
    error instanceof Error ? error.message : "Analyse fehlgeschlagen"
  return (
    <>
      <button
        onClick={onReEnrich}
        disabled={isEnriching}
        className={`text-sm px-2 py-1 rounded border transition-colors disabled:opacity-50 ${error ? "border-red-300 dark:border-red-700 text-red-500" : "border-gray-200 dark:border-gray-600 text-gray-500 hover:text-blue-600 hover:border-blue-300"}`}
      >
        {isEnriching ? "Analysiert..." : label}
      </button>
      {error && <span className="text-xs text-red-500">{errorMessage}</span>}
    </>
  )
}

function EnrichmentStateLabel({
  enrichmentState,
  matchScore,
  showMatchScore,
}: {
  enrichmentState: EnrichmentState
  matchScore: string
  showMatchScore: boolean
}) {
  if (showMatchScore) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {matchScore}
      </span>
    )
  }
  if (enrichmentState === "pending") {
    return (
      <span className="text-sm text-blue-500 animate-pulse">
        Wird analysiert...
      </span>
    )
  }
  return <span className="text-sm text-gray-400 italic">Nicht analysiert</span>
}

function useBackSearch(): string {
  const location = useLocation()
  const state: unknown = location.state
  if (
    typeof state === "object" &&
    state !== null &&
    "vacancyListSearch" in state &&
    typeof state.vacancyListSearch === "string"
  ) {
    return state.vacancyListSearch
  }
  return ""
}

function VacancyInfoCard({
  data,
  enrichmentState,
}: {
  data: Pick<
    VacancyWithStatus,
    | "title"
    | "company"
    | "addresses"
    | "sources"
    | "commute"
    | "contact"
    | "summary"
    | "description"
  >
  enrichmentState: EnrichmentState
}) {
  return (
    <Card className="p-5">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {data.title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-1">{data.company}</p>

      {data.addresses.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {data.addresses.join(" | ")}
        </p>
      )}

      {data.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.sources.map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {source.site}
            </a>
          ))}
        </div>
      )}

      <VacancyCommuteSection commute={data.commute} />
      <VacancyContactSection contact={data.contact} />

      <VacancySummarySection
        summary={data.summary}
        enrichmentState={enrichmentState}
      />

      {data.description && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            Vollständige Beschreibung
          </summary>
          <Markdown className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {data.description}
          </Markdown>
        </details>
      )}
    </Card>
  )
}

function VacancySummarySection({
  summary,
  enrichmentState,
}: {
  summary: string
  enrichmentState: EnrichmentState
}) {
  if (enrichmentState === "plain") {
    return (
      <p className="mt-4 text-sm text-gray-400 dark:text-gray-500 italic">
        Nicht analysiert
      </p>
    )
  }
  if (enrichmentState === "pending") {
    return (
      <p className="mt-4 text-sm text-blue-500 animate-pulse">
        Wird analysiert...
      </p>
    )
  }
  if (!summary) return
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Zusammenfassung
      </h3>
      <Markdown className="text-sm text-gray-600 dark:text-gray-400">
        {summary}
      </Markdown>
    </div>
  )
}

function useActivityRecorder(jobSearchId: string, hash: string) {
  const addActivity = useAddActivity(jobSearchId)
  const [eventForm, setEventForm] = useState<{
    type: ActivityType
    extra: Record<string, string>
  }>()

  const handleRecordActivity = () => {
    if (!eventForm) return
    const activity = buildUserActivity(eventForm.type, today(), eventForm.extra)
    addActivity.mutate(
      { hash, activity },
      { onSuccess: () => setEventForm(undefined) },
    )
  }

  return { eventForm, setEventForm, handleRecordActivity }
}

function useVacancyDetailData(jobSearchId: string, hash: string) {
  const { data, isLoading } = useJobSearchVacancy(jobSearchId, hash)
  const coverLetterQuery = useVacancyCoverLetter(jobSearchId, hash)
  const updateCoverLetter = useUpdateVacancyCoverLetter(jobSearchId, hash)
  const generateCoverLetter = useGenerateVacancyCoverLetter(jobSearchId, hash)
  const title = data?.title ?? "Stelle"
  return {
    data,
    isLoading,
    title,
    coverLetterQuery,
    updateCoverLetter,
    generateCoverLetter,
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function buildUserActivity(
  type: ActivityType,
  date: string,
  extra: Record<string, string>,
): Activity {
  if (type === "found" || type === "not-found") {
    throw new Error(`Cannot record "${type}" activity from UI`)
  }
  const base = { type, date, notes: "" }
  if (type === "invited") {
    return { ...base, interviewDate: extra.interviewDate }
  }
  if (type === "interviewed") {
    const outcome = extra.outcome === "cancelled" ? "cancelled" : "completed"
    return { ...base, outcome }
  }
  if (type === "offered") {
    return { ...base, startDate: extra.startDate, salary: extra.salary }
  }
  return base
}
