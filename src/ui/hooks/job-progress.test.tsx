// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as jobProgressHooks from "@/ui/hooks"

describe("job progress hooks", () => {
  beforeEach(() => {
    jobProgressHooks.resetProgressTestingState()
  })

  it("tracks crawl-owned enrichment separately from scan and clears it on enrich done", async () => {
    const emit = installProgressEmitter()

    const { result } = renderHook(() => {
      jobProgressHooks.useGlobalJobProgress()
      return jobProgressHooks.useJobProgress("job-1")
    })

    emit({
      jobSearchId: "job-1",
      message: "Scanning",
      phase: "scan",
    })
    emit({
      jobSearchId: "job-1",
      message: "Analysiere 1/2",
      phase: "enrich",
      owner: "crawl",
      enrichProgress: { completed: 1, total: 2 },
    })

    await waitFor(() => {
      expect(result.current.hasActiveScan).toBe(true)
      expect(result.current.hasActiveEnrich).toBe(true)
      expect(result.current.enrich?.owner).toBe("crawl")
    })

    emit({
      jobSearchId: "job-1",
      message: "Analyse abgeschlossen",
      phase: "done",
      source: "enrich",
      owner: "crawl",
    })

    await waitFor(() => {
      expect(result.current.hasActiveScan).toBe(true)
      expect(result.current.hasActiveEnrich).toBe(false)
    })
  })

  it("ignores vacancies-updated signals for enrich visibility but still counts them", async () => {
    const emit = installProgressEmitter()

    const { result } = renderHook(() => {
      jobProgressHooks.useGlobalJobProgress()
      return jobProgressHooks.useJobProgress("job-1")
    })

    emit({
      jobSearchId: "job-1",
      message: "",
      phase: "enrich",
      vacanciesUpdated: true,
    })

    await waitFor(() => {
      expect(result.current.vacancyUpdateCount).toBe(1)
    })
    expect(result.current.hasActiveEnrich).toBe(false)
  })

  it("keeps progress state isolated per job search", async () => {
    const emit = installProgressEmitter()

    const { result: first } = renderHook(() => {
      jobProgressHooks.useGlobalJobProgress()
      return jobProgressHooks.useJobProgress("job-1")
    })
    const { result: second } = renderHook(() => {
      jobProgressHooks.useGlobalJobProgress()
      return jobProgressHooks.useJobProgress("job-2")
    })

    emit({
      jobSearchId: "job-2",
      message: "Analysiere 1/1",
      phase: "enrich",
      owner: "batch",
      enrichProgress: { completed: 1, total: 1 },
    })

    await waitFor(() => {
      expect(second.current.hasActiveEnrich).toBe(true)
    })
    expect(first.current.hasActiveEnrich).toBe(false)
  })
})

function installProgressEmitter() {
  let callback: ((data: unknown) => void) | undefined
  const on: ElectronAPI["on"] = (_channel, nextCallback) => {
    callback = (data: unknown) => {
      nextCallback(data)
    }
    return () => {
      callback = undefined
    }
  }

  globalThis.electronAPI = {
    invoke: vi.fn(() => Promise.resolve()),
    on: vi.fn(on),
  }

  return (payload: unknown) => {
    callback?.(payload)
  }
}
