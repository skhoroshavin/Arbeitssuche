import { useState, useEffect } from "react"

import typia from "typia"

import type { ProgressEvent } from "@/models/index.js"

export function GlobalProgressIndicator() {
  const { scanState, enrichState } = useGlobalProgress()

  if (!scanState && !enrichState) return

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex flex-col gap-1 text-sm">
      {scanState && <ScanProgressRow jobSearchId={scanState.jobSearchId} />}
      {enrichState && (
        <EnrichProgressRow
          jobSearchId={enrichState.jobSearchId}
          enrichProgress={enrichState.enrichProgress}
        />
      )}
    </div>
  )
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
  enrichProgress,
}: {
  jobSearchId?: string
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
          onClick={() => abortEnrich(jobSearchId)}
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

function abortEnrich(jobSearchId: string) {
  void electronAPI?.invoke("vacancies:enrich:abort", jobSearchId)
}

function useGlobalProgress() {
  const [scanState, setScanState] = useState<ProgressState | undefined>()
  const [enrichState, setEnrichState] = useState<ProgressState | undefined>()

  useEffect(() => {
    if (!electronAPI) return

    const cleanup = electronAPI.on("job:progress", (data: unknown) => {
      if (!typia.is<ProgressPayload>(data)) return
      const phase = data.phase
      if (!phase) return

      if (phase === "done" || phase === "complete") {
        handleDone(data.source, setScanState, setEnrichState)
        return
      }

      const entry: ProgressState = {
        jobSearchId: data.jobSearchId,
        phase,
        enrichProgress: data.enrichProgress,
      }

      if (phase === "search" || phase === "scan") {
        setScanState(entry)
        return
      }

      setEnrichState(entry)
    })

    return cleanup
  }, [])

  return { scanState, enrichState }
}

function handleDone(
  source: "crawl" | "enrich" | undefined,
  setScanState: (v: undefined) => void,
  setEnrichState: (v: undefined) => void,
) {
  if (source === "crawl") {
    setScanState(undefined)
  } else if (source === "enrich") {
    setEnrichState(undefined)
  } else {
    setScanState(undefined)
    setEnrichState(undefined)
  }
}

interface ProgressState {
  jobSearchId?: string
  phase: "search" | "scan" | "enrich"
  enrichProgress?: { completed: number; total: number }
}

interface ProgressPayload extends ProgressEvent {
  jobSearchId?: string
}
