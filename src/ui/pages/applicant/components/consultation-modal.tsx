import { useEffect } from "react"
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"
import type { ConsultationSuggestion } from "@/models/job-search/types"
import { SEARCH_MODE_LABELS } from "@/models/job-search/index"
import { Loading } from "@/ui/components"
import { useSelectionSet } from "@/ui/pages/applicant/hooks"

export function ConsultationModal({
  open,
  suggestions,
  isLoading,
  error,
  onClose,
  onCreateSelected,
  isCreating,
}: ConsultationModalProperties) {
  const selection = useSelectionSet()
  const { reset } = selection

  useEffect(() => {
    reset()
  }, [suggestions, reset])

  const toggleAll = () => {
    if (selection.selected.size === suggestions.length) reset()
    else selection.setAll(suggestions.length)
  }

  const handleCreate = () => {
    const items = suggestions.filter((_, index) =>
      selection.selected.has(index),
    )
    if (items.length > 0) onCreateSelected(items)
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center">
        <DialogPanel className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Beratung
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <ModalBody
            isLoading={isLoading}
            error={error}
            suggestions={suggestions}
            selected={selection.selected}
            onToggleItem={selection.toggle}
          />

          {!isLoading && suggestions.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selection.selected.size === suggestions.length
                  ? "Keine auswählen"
                  : "Alle auswählen"}
              </button>
              <button
                type="button"
                disabled={selection.selected.size === 0 || isCreating}
                onClick={handleCreate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isCreating
                  ? "Erstelle..."
                  : `${selection.selected.size} Suche${selection.selected.size === 1 ? "" : "n"} erstellen`}
              </button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface ConsultationModalProperties {
  open: boolean
  suggestions: ConsultationSuggestion[]
  isLoading: boolean
  error?: Error | null
  onClose: () => void
  onCreateSelected: (selected: ConsultationSuggestion[]) => void
  isCreating: boolean
}

function ModalBody({
  isLoading,
  error,
  suggestions,
  selected,
  onToggleItem,
}: {
  isLoading: boolean
  error?: Error | null
  suggestions: ConsultationSuggestion[]
  selected: Set<number>
  onToggleItem: (index: number) => void
}) {
  let content: React.ReactNode

  if (isLoading) {
    content = (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading />
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          Analysiere Bewerberprofil...
        </p>
      </div>
    )
  } else if (error) {
    content = (
      <p className="text-red-600 dark:text-red-400 text-center py-8">
        {error.message}
      </p>
    )
  } else if (suggestions.length === 0) {
    content = (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Keine Vorschläge verfügbar.
      </p>
    )
  } else {
    content = (
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <label
            key={index}
            className="flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(index)}
              onChange={() => onToggleItem(index)}
              className="mt-1 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {suggestion.searchTerm}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {SEARCH_MODE_LABELS[suggestion.searchMode]}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {suggestion.reason}
              </p>
            </div>
          </label>
        ))}
      </div>
    )
  }

  return <div className="flex-1 overflow-y-auto p-4">{content}</div>
}
