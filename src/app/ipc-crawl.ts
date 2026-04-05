import type { AppServices } from "."
import { startCrawl, abortCrawl } from "./crawl-manager.js"
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
        })
      },
      onError: (error) => {
        safeSend("job:progress", {
          jobSearchId: id,
          message: `Crawl error: ${error.message}`,
          phase: "done",
        })
      },
    })
  })

  handle("job-searches:crawl:abort", (id: string) => {
    abortCrawl(id)
    return { aborted: true }
  })
}
