import type { ProgressEvent } from "@/models/index.js"

export function ProgressLog({
  events,
  scrollable,
}: {
  events: ProgressEvent[]
  scrollable?: boolean
}) {
  return (
    <div
      className={`font-mono text-xs text-gray-600 dark:text-gray-400 space-y-1 ${scrollable ? "max-h-48 overflow-y-auto" : ""}`}
    >
      {events.map((progressEvent, index) => (
        <div key={index}>{progressEvent.message}</div>
      ))}
    </div>
  )
}
