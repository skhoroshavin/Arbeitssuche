import { useSyncExternalStore } from "react"

import { z } from "zod"

export function useJobProgress(jobSearchId?: string) {
  const state = useGlobalJobProgress()
  const entry = getJobProgressEntry(state, jobSearchId)

  return {
    ...entry,
    hasActiveScan: entry.scan !== undefined,
    hasActiveEnrich: entry.enrich !== undefined,
  }
}

export function useGlobalJobProgress() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function resetProgressTestingState() {
  cleanupListener?.()
  cleanupListener = undefined
  globalState = { byJobSearchId: {} }
  listeners.clear()
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
    const parsed = ProgressPayloadSchema.safeParse(data)
    if (!parsed.success) return
    const payload = parsed.data
    if (!payload.jobSearchId) return

    const current =
      globalState.byJobSearchId[payload.jobSearchId] ?? EMPTY_JOB_PROGRESS
    const next = reduceProgress(current, payload)

    globalState = {
      byJobSearchId: {
        ...globalState.byJobSearchId,
        [payload.jobSearchId]: next,
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
  if (isScanPhase(phase)) return setScanState(next, phase)
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
  phase: "search" | "scan"
}

interface EnrichProgressEntry {
  owner: "crawl" | "batch"
  phase: "enrich"
  enrichProgress?: { completed: number; total: number }
}

const ProgressPayloadSchema = z.object({
  message: z.string(),
  phase: z
    .enum(["search", "scan", "enrich", "complete", "done"])
    .optional(),
  source: z.enum(["crawl", "enrich"]).optional(),
  owner: z.enum(["crawl", "batch"]).optional(),
  vacanciesUpdated: z.boolean().optional(),
  enrichProgress: z
    .object({ completed: z.number(), total: z.number() })
    .optional(),
  jobSearchId: z.string().optional(),
})
type ProgressPayload = z.infer<typeof ProgressPayloadSchema>

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
  phase: "search" | "scan",
): JobProgressEntry {
  return {
    ...previous,
    scan: {
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
      owner: payload.owner ?? "batch",
      phase: "enrich",
      enrichProgress: payload.enrichProgress,
    },
  }
}

function getJobProgressEntry(
  state: GlobalJobProgressState,
  jobSearchId?: string,
): JobProgressEntry {
  if (!jobSearchId) {
    return EMPTY_JOB_PROGRESS
  }

  return state.byJobSearchId[jobSearchId] ?? EMPTY_JOB_PROGRESS
}

export function getEnrichAbortChannel(owner: "crawl" | "batch") {
  return owner === "crawl"
    ? "job-searches:crawl:enrich:abort"
    : "vacancies:enrich:abort"
}
