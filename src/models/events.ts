export interface ProgressEvent {
  message: string
  phase?: "search" | "scan" | "enrich" | "complete" | "done"
  vacanciesUpdated?: boolean
  enrichProgress?: { completed: number; total: number }
}
