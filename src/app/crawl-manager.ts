import type {
  VacancyScanner,
  OnProgress,
} from "@/services/vacancy-scanner/index.js"
import { createJobSite } from "@/plugins/job-site/index.js"
import { createElectronBrowser } from "@/plugins/browser/index.js"

export function startCrawl(options: StartCrawlOptions): void {
  const { jobSearchId, vacancyScanner, onProgress, onComplete, onError } =
    options

  if (activeCrawls.has(jobSearchId)) {
    onError(new Error(`Crawl already running for ${jobSearchId}`))
    return
  }

  const abortController = new AbortController()
  const activeCrawl: ActiveCrawl = {
    controller: abortController,
    phase: "crawling",
  }
  activeCrawls.set(jobSearchId, activeCrawl)
  const browser = createElectronBrowser()

  const wrappedOnProgress: OnProgress = (event) => {
    if (event.phase === "enrich") {
      activeCrawl.phase = "enriching"
      if (event.enrichProgress) {
        activeCrawl.enrichProgress = event.enrichProgress
      }
    } else if (event.phase === "complete" || event.phase === "done") {
      activeCrawl.phase = "done"
    }
    onProgress(event)
  }

  vacancyScanner
    .scan(jobSearchId, abortController, wrappedOnProgress, (name) =>
      createJobSite(name, browser),
    )
    .then(() => onComplete())
    .catch((error) =>
      onError(error instanceof Error ? error : new Error(String(error))),
    )
    .finally(async () => {
      activeCrawls.delete(jobSearchId)
      await browser.close()
    })
}

export function abortCrawl(jobSearchId: string): boolean {
  const crawl = activeCrawls.get(jobSearchId)
  if (!crawl) return false

  crawl.controller.abort()
  return true
}

const activeCrawls = new Map<string, ActiveCrawl>()

interface ActiveCrawl {
  controller: AbortController
  phase: CrawlPhase
  enrichProgress?: { completed: number; total: number }
}

type CrawlPhase = "crawling" | "enriching" | "done"

interface StartCrawlOptions {
  jobSearchId: string
  vacancyScanner: VacancyScanner
  onProgress: OnProgress
  onComplete: () => void
  onError: (error: Error) => void
}
