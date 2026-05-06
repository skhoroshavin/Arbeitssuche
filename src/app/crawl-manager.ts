import type {
  VacancyScanner,
  OnProgress,
} from "@/services/vacancy-scanner/index.js"
import type { ProgressEvent } from "@/models/progress/index.js"
import { createJobSite } from "@/plugins/job-site"
import { createElectronBrowser } from "@/plugins/browser"
import { toError } from "@/utils"

export function startCrawl(options: StartCrawlOptions): void {
  const { jobSearchId, vacancyScanner, onProgress, onComplete, onError } =
    options

  if (activeCrawls.has(jobSearchId)) {
    onError(new Error(`Crawl already running for ${jobSearchId}`))
    return
  }

  const abortController = new AbortController()
  const enrichAbortController = new AbortController()
  const activeCrawl: ActiveCrawl = {
    crawlController: abortController,
    enrichController: enrichAbortController,
    phase: "crawling",
  }
  activeCrawls.set(jobSearchId, activeCrawl)
  const browser = createElectronBrowser()

  const wrappedOnProgress: OnProgress = (event) => {
    updateActiveCrawl(activeCrawl, event)
    onProgress(event)
  }

  vacancyScanner
    .scan(
      jobSearchId,
      abortController,
      enrichAbortController,
      wrappedOnProgress,
      (name) => createJobSite(name, browser),
    )
    .then(() => onComplete())
    .catch((error) => onError(toError(error)))
    .finally(async () => {
      activeCrawls.delete(jobSearchId)
      await browser.close()
    })
}

export function abortCrawl(jobSearchId: string): boolean {
  const crawl = activeCrawls.get(jobSearchId)
  if (!crawl) return false

  crawl.enrichController.abort()
  crawl.crawlController.abort()
  return true
}

export function abortCrawlEnrichment(jobSearchId: string): boolean {
  const crawl = activeCrawls.get(jobSearchId)
  if (!crawl || crawl.enrichController.signal.aborted) return false

  crawl.enrichController.abort()
  return true
}

const activeCrawls = new Map<string, ActiveCrawl>()

interface ActiveCrawl {
  crawlController: AbortController
  enrichController: AbortController
  phase: CrawlPhase
  enrichProgress?: { completed: number; total: number }
}

type CrawlPhase = "crawling" | "enriching" | "done"

interface StartCrawlOptions {
  jobSearchId: string
  vacancyScanner: Pick<VacancyScanner, "scan">
  onProgress: OnProgress
  onComplete: () => void
  onError: (error: Error) => void
}

function updateActiveCrawl(
  activeCrawl: ActiveCrawl,
  event: ProgressEvent,
): void {
  if (event.phase === "enrich") {
    activeCrawl.phase = "enriching"
    if (event.enrichProgress) {
      activeCrawl.enrichProgress = event.enrichProgress
    }
    return
  }

  if (event.phase !== "done" && event.phase !== "complete") {
    return
  }

  if (event.phase === "done" && event.source === "enrich") {
    activeCrawl.phase = "crawling"
    activeCrawl.enrichProgress = undefined
    return
  }

  activeCrawl.phase = "done"
}
