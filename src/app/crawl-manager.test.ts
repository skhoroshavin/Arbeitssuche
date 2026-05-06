import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ScanPipeline, OnProgress } from "@/services/scan-pipeline"
import { abortCrawlEnrichment, startCrawl } from "@/app"

vi.mock("@/plugins/job-site", () => ({
  createJobSite: vi.fn(() => ({})),
}))

vi.mock("@/plugins/browser", () => ({
  createElectronBrowser: vi.fn(() => ({
    close: vi.fn(() => Promise.resolve()),
  })),
}))

describe("crawl-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps crawl running after crawl-owned enrichment completes", async () => {
    let resolveScan: (() => void) | undefined
    const scanStarted = createDeferred<void>()

    startCrawl({
      jobSearchId: "job-1",
      vacancyScanner: makeScanner(
        async (
          _jobSearchId,
          _crawlController,
          _enrichController,
          onProgress,
        ) => {
          onProgress({
            message: "Analysiere 1/2",
            phase: "enrich",
            source: "enrich",
            owner: "crawl",
            enrichProgress: { completed: 1, total: 2 },
          })
          onProgress({
            message: "Analyse abgeschlossen",
            phase: "done",
            source: "enrich",
            owner: "crawl",
          })
          scanStarted.resolve()
          await new Promise<void>((resolve) => {
            resolveScan = resolve
          })
          onProgress({
            message: "Crawl finished",
            phase: "done",
            source: "crawl",
          })
        },
      ),
      onProgress: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    })

    await scanStarted.promise

    expect(abortCrawlEnrichment("job-1")).toBe(true)

    resolveScan?.()
  })

  it("enrich-only abort does not abort the crawl controller", async () => {
    const observed = createDeferred<{
      crawlAborted: boolean
      enrichAborted: boolean
    }>()

    startCrawl({
      jobSearchId: "job-1",
      vacancyScanner: makeScanner(
        (_jobSearchId, crawlController, enrichController, _onProgress) => {
          abortCrawlEnrichment("job-1")
          observed.resolve({
            crawlAborted: crawlController.signal.aborted,
            enrichAborted: enrichController.signal.aborted,
          })
          return Promise.resolve()
        },
      ),
      onProgress: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    })

    await expect(observed.promise).resolves.toEqual({
      crawlAborted: false,
      enrichAborted: true,
    })
  })
})

function makeScanner(
  implementation: (
    jobSearchId: string,
    crawlController: AbortController,
    enrichController: AbortController,
    onProgress: OnProgress,
  ) => Promise<void>,
): Pick<VacancyScanner, "scan"> {
  return {
    scan: implementation,
  }
}

function createDeferred<T>() {
  let resolve = createNoopResolver<T>()
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

function createNoopResolver<T>() {
  return (_value: T) => {}
}
