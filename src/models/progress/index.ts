export interface ProgressEvent {
  message: string
  phase?: "search" | "scan" | "enrich" | "complete" | "done"
  source?: "crawl" | "enrich"
  owner?: "crawl" | "batch"
  vacanciesUpdated?: boolean
  enrichProgress?: { completed: number; total: number }
}
