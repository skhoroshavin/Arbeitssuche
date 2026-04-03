import { Card, SectionHeader } from "@/ui/components"
import { ProgressLog } from "@/ui/pages/job-search/components"
import type { ProgressEvent as CrawlEvent } from "@/models/index"

export function CrawlProgressCard({
  events,
  done,
  onAbort,
  onClose,
}: {
  events: CrawlEvent[]
  done: boolean
  onAbort: () => void
  onClose: () => void
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader>Crawl-Fortschritt</SectionHeader>
        {!done && (
          <button
            onClick={onAbort}
            className="px-3 py-1 text-sm text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Abbrechen
          </button>
        )}
        {done && (
          <span className="text-sm text-green-600 font-medium">Fertig</span>
        )}
      </div>
      <ProgressLog events={events} scrollable />
      {done && (
        <button
          onClick={onClose}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Schließen
        </button>
      )}
    </Card>
  )
}
