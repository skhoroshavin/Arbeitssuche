import type { AppServices } from "."
import {
  startCrawl,
  abortCrawl,
  abortCrawlEnrichment,
} from "./crawl-manager.js"
import type { IpcHandle, SafeSend } from "./ipc-handlers.js"

export function registerCrawlHandlers(
  handle: IpcHandle,
  services: AppServices,
  safeSend: SafeSend,
): void {
  handle("job-searches:crawl:start", (id: string) => {
    startCrawl({
      jobSearchId: id,
      vacancyScanner: services.vacancyScanner,
      onProgress: (event) => {
        safeSend("job:progress", { jobSearchId: id, ...event })
      },
      onComplete: () => {
        safeSend("job:progress", {
          jobSearchId: id,
          message: "Crawl finished",
          phase: "done",
          source: "crawl",
        })
      },
      onError: (error) => {
        safeSend("job:progress", {
          jobSearchId: id,
          message: `Crawl error: ${error.message}`,
          phase: "done",
          source: "crawl",
        })
      },
    })
  })

  handle("job-searches:crawl:abort", (id: string) => {
    abortCrawl(id)
    return { aborted: true }
  })

  handle("job-searches:crawl:enrich:abort", (id: string) => {
    return { aborted: abortCrawlEnrichment(id) }
  })
}
