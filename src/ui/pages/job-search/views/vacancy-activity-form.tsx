import { Card, SectionHeader } from "@/ui/components"
import type { ActivityType } from "@/models/vacancy"
import type { StatusAction } from "@/models/vacancy/index"

export function VacancyActivityForm({
  allowedActions,
  eventForm,
  onSelectAction,
  onConfirm,
}: {
  allowedActions: StatusAction[]
  eventForm?: { type: ActivityType; extra: Record<string, string> }
  onSelectAction: (form?: {
    type: ActivityType
    extra: Record<string, string>
  }) => void
  onConfirm: () => void
}) {
  return (
    <Card className="p-4">
      <SectionHeader className="mb-3">Aktionen</SectionHeader>
      <div className="flex flex-wrap gap-2">
        {allowedActions.map((action) => {
          let extra: Record<string, string> = {}
          if (action.type === "invited") {
            extra = { interviewDate: "" }
          } else if (action.type === "interviewed") {
            extra = { outcome: "completed" }
          }
          return (
            <button
              key={action.type}
              onClick={() => onSelectAction({ type: action.type, extra })}
              className={`px-3 py-1.5 text-sm text-white rounded-lg ${action.color}`}
            >
              {action.label}
            </button>
          )
        })}
      </div>

      {eventForm && (
        <div className="mt-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
          <p className="text-sm font-medium dark:text-gray-200">
            Eintrag: {eventForm.type}
          </p>
          {eventForm.type === "invited" && (
            <input
              type="date"
              placeholder="Vorstellungstermin"
              onChange={(event) =>
                onSelectAction({
                  ...eventForm,
                  extra: { interviewDate: event.target.value },
                })
              }
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg"
            >
              Bestätigen
            </button>
            <button
              onClick={() => onSelectAction()}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-200"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
