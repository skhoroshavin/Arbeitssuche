export interface ProgressEvent {
  message: string
  phase?: "search" | "scan" | "enrich" | "complete" | "done"
  source?: "crawl" | "enrich"
  vacanciesUpdated?: boolean
  enrichProgress?: { completed: number; total: number }
}
