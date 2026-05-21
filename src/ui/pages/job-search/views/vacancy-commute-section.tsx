import type { VacancyAddress } from "@/models/vacancy"

export function VacancyCommuteSection({
  addresses,
}: {
  addresses: VacancyAddress[]
}) {
  const withCommute = addresses.filter((a) => a.commute)
  if (withCommute.length === 0) return

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
        {withCommute.map((addr) => {
          const info = addr.commute
          if (!info) return
          return (
            <div key={addr.format()} className="contents">
              <div>{addr.format()}</div>
              <div>{info.durations.morning} min</div>
              <div>{info.durations.day} min</div>
              <div>{info.distance}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
