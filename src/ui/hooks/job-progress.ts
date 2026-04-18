import { useEffect, useSyncExternalStore } from "react"

import typia from "typia"

export function useJobProgress(jobSearchId?: string) {
  const state = useGlobalJobProgress()

  if (!jobSearchId) {
    return {
      scan: undefined,
      enrich: undefined,
      vacancyUpdateCount: 0,
      hasActiveScan: false,
      hasActiveEnrich: false,
    }
  }

  const entry = state.byJobSearchId[jobSearchId] ?? EMPTY_JOB_PROGRESS
  return {
    ...entry,
    hasActiveScan: !!entry.scan,
    hasActiveEnrich: !!entry.enrich,
  }
}

export function useGlobalJobProgress() {
  useJobProgressSubscription()
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function resetProgressTestingState() {
  cleanupListener?.()
  cleanupListener = undefined
  globalState = { byJobSearchId: {} }
  listeners.clear()
}

function useJobProgressSubscription() {
  useEffect(() => {
    ensureListening()
  }, [])
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  ensureListening()
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): GlobalJobProgressState {
  return globalState
}

interface GlobalJobProgressState {
  byJobSearchId: Record<string, JobProgressEntry>
}

function ensureListening() {
  if (cleanupListener || !electronAPI) return

  cleanupListener = electronAPI.on("job:progress", (data: unknown) => {
    if (!typia.is<ProgressPayload>(data)) return
    if (!data.jobSearchId) return

    const current =
      globalState.byJobSearchId[data.jobSearchId] ?? EMPTY_JOB_PROGRESS
    const next = reduceProgress(current, data)

    globalState = {
      byJobSearchId: {
        ...globalState.byJobSearchId,
        [data.jobSearchId]: next,
      },
    }

    emitChange()
  })
}

const EMPTY_JOB_PROGRESS: JobProgressEntry = {
  vacancyUpdateCount: 0,
}

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function reduceProgress(previous: JobProgressEntry, payload: ProgressPayload) {
  let next = previous

  if (payload.vacanciesUpdated) {
    next = {
      ...next,
      vacancyUpdateCount: next.vacancyUpdateCount + 1,
    }
  }

  const phase = payload.phase
  if (!phase) return next

  if (isDonePhase(phase)) return clearFinishedState(next, payload)
  if (isScanPhase(phase)) return setScanState(next, payload, phase)
  if (!shouldShowEnrichState(payload)) return next

  return setEnrichState(next, payload)
}

function clearFinishedState(
  previous: JobProgressEntry,
  payload: ProgressPayload,
): JobProgressEntry {
  if (payload.source === "crawl") {
    return {
      ...previous,
      scan: undefined,
    }
  }

  if (payload.source === "enrich") {
    return {
      ...previous,
      enrich: undefined,
    }
  }

  return {
    ...previous,
    scan: undefined,
    enrich: undefined,
  }
}

interface JobProgressEntry {
  scan?: ProgressEntry
  enrich?: EnrichProgressEntry
  vacancyUpdateCount: number
}

interface ProgressEntry {
  jobSearchId?: string
  phase: "search" | "scan"
}

interface EnrichProgressEntry {
  jobSearchId?: string
  owner: "crawl" | "batch"
  phase: "enrich"
  enrichProgress?: { completed: number; total: number }
}

interface ProgressPayload {
  message: string
  phase?: "search" | "scan" | "enrich" | "complete" | "done"
  source?: "crawl" | "enrich"
  owner?: "crawl" | "batch"
  vacanciesUpdated?: boolean
  enrichProgress?: { completed: number; total: number }
  jobSearchId?: string
}

let globalState: GlobalJobProgressState = {
  byJobSearchId: {},
}

let cleanupListener: (() => void) | undefined

const listeners = new Set<() => void>()

function isDonePhase(phase: string): phase is "done" | "complete" {
  return phase === "done" || phase === "complete"
}

function isScanPhase(phase: string): phase is "search" | "scan" {
  return phase === "search" || phase === "scan"
}

function shouldShowEnrichState(payload: ProgressPayload): boolean {
  return !!(payload.message || payload.enrichProgress)
}

function setScanState(
  previous: JobProgressEntry,
  payload: ProgressPayload,
  phase: "search" | "scan",
): JobProgressEntry {
  return {
    ...previous,
    scan: {
      jobSearchId: payload.jobSearchId,
      phase,
    },
  }
}

function setEnrichState(
  previous: JobProgressEntry,
  payload: ProgressPayload,
): JobProgressEntry {
  return {
    ...previous,
    enrich: {
      jobSearchId: payload.jobSearchId,
      owner: payload.owner ?? "batch",
      phase: "enrich",
      enrichProgress: payload.enrichProgress,
    },
  }
}
