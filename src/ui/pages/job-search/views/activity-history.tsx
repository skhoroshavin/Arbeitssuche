import { Card, SectionHeader } from "@/ui/components"
import { STATUS_LABELS } from "@/models/vacancy/index"
import type { ActivityType } from "@/models/vacancy/types"

export function ActivityHistory({
  activities,
}: {
  activities: { date: string; type: ActivityType; notes?: string }[]
}) {
  if (activities.length === 0) return
  return (
    <Card className="p-4">
      <SectionHeader className="mb-3">Aktivitätshistorie</SectionHeader>
      <div className="space-y-2">
        {activities.map((a, index) => (
          <div
            key={index}
            className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
          >
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {a.date}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {STATUS_LABELS[a.type]}
            </span>
            {a.notes && <span>{a.notes}</span>}
          </div>
        ))}
      </div>
    </Card>
  )
}
