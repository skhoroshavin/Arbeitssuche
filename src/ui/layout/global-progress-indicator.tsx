import { useGlobalJobProgress } from "@/ui/hooks"

export function GlobalProgressIndicator() {
  const { byJobSearchId } = useGlobalJobProgress()
  const scans = Object.entries(byJobSearchId)
    .map(([jobSearchId, entry]) => ({
      jobSearchId,
      state: entry.scan,
    }))
    .filter(hasProgressState)
  const enrichments = Object.entries(byJobSearchId)
    .map(([jobSearchId, entry]) => ({
      jobSearchId,
      state: entry.enrich,
    }))
    .filter(hasProgressState)

  if (scans.length === 0 && enrichments.length === 0) return

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex flex-col gap-1 text-sm">
      {scans.map(({ jobSearchId, state }) => (
        <ScanProgressRow
          key={`scan-${jobSearchId}`}
          jobSearchId={state.jobSearchId}
        />
      ))}
      {enrichments.map(({ jobSearchId, state }) => (
        <EnrichProgressRow
          key={`enrich-${jobSearchId}`}
          jobSearchId={state.jobSearchId}
          owner={state.owner}
          enrichProgress={state.enrichProgress}
        />
      ))}
    </div>
  )
}

function hasProgressState<T>(value: {
  jobSearchId: string
  state: T | undefined
}): value is { jobSearchId: string; state: T } {
  return value.state !== undefined
}

function ScanProgressRow({ jobSearchId }: { jobSearchId?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center gap-3">
        <span className="animate-pulse text-blue-600 dark:text-blue-400">
          ●
        </span>
        <span className="text-blue-700 dark:text-blue-300 font-medium">
          Wird gescannt...
        </span>
      </div>
      {jobSearchId && (
        <button
          onClick={() => abortScan(jobSearchId)}
          className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-colors text-blue-700 dark:text-blue-300"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}

function EnrichProgressRow({
  jobSearchId,
  owner,
  enrichProgress,
}: {
  jobSearchId?: string
  owner: "crawl" | "batch"
  enrichProgress?: { completed: number; total: number }
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center gap-3">
        <span className="animate-pulse text-blue-600 dark:text-blue-400">
          ●
        </span>
        <span className="text-blue-700 dark:text-blue-300 font-medium">
          Wird analysiert...
        </span>
        <EnrichProgressBar enrichProgress={enrichProgress} />
      </div>
      {jobSearchId && (
        <button
          onClick={() => abortEnrich(jobSearchId, owner)}
          className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-colors text-blue-700 dark:text-blue-300"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}

function EnrichProgressBar({
  enrichProgress,
}: {
  enrichProgress?: { completed: number; total: number }
}) {
  if (!enrichProgress) return
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
        <div
          className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all"
          style={{
            width:
              enrichProgress.total > 0
                ? `${(enrichProgress.completed / enrichProgress.total) * 100}%`
                : "0%",
          }}
        />
      </div>
      <span className="text-blue-600 dark:text-blue-400 text-xs">
        {enrichProgress.completed}/{enrichProgress.total}
      </span>
    </div>
  )
}

function abortScan(jobSearchId: string) {
  void electronAPI?.invoke("job-searches:crawl:abort", jobSearchId)
}

function abortEnrich(jobSearchId: string, owner: "crawl" | "batch") {
  const channel =
    owner === "crawl"
      ? "job-searches:crawl:enrich:abort"
      : "vacancies:enrich:abort"
  void electronAPI?.invoke(channel, jobSearchId)
}
