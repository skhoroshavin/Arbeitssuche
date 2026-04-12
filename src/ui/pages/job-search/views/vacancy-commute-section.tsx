import type { CommuteInfo } from "@/models/vacancy"

export function VacancyCommuteSection({
  commute,
}: {
  commute: Record<string, CommuteInfo>
}) {
  if (Object.keys(commute).length === 0) return

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Fahrtweg
      </h3>
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="font-medium">Adresse</div>
        <div className="font-medium">Morgens</div>
        <div className="font-medium">Tagsüber</div>
        <div className="font-medium">Entfernung</div>
        {Object.entries(commute).map(([addr, info]) => (
          <div key={addr} className="contents">
            <div>{addr}</div>
            <div>{info.durations.morning} min</div>
            <div>{info.durations.day} min</div>
            <div>{info.distance}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
