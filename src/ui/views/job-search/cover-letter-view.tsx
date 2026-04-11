import { Link, useLocation } from "react-router"
import { Textarea } from "@/ui/components"
import type { JobSearchCoverLetterValue } from "./types"

export function JobSearchCoverLetterView({
  value,
  onUpdate,
  onGenerate,
  isGenerating,
  isGenerateError,
  llmAvailable,
  rows = 12,
}: JobSearchCoverLetterViewProperties) {
  const location = useLocation()
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || llmAvailable === false}
          className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50"
        >
          {isGenerating ? "Generiere..." : "Generieren"}
        </button>
      </div>

      {llmAvailable === false && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          KI-Schlüssel erforderlich.{" "}
          <Link
            to="/settings"
            state={{ returnTo: location.pathname }}
            className="underline hover:no-underline"
          >
            Zu den Einstellungen
          </Link>
        </p>
      )}

      {isGenerateError && (
        <p className="text-sm text-red-600">
          Generierung fehlgeschlagen. Bitte erneut versuchen.
        </p>
      )}

      <Textarea
        label="Anschreiben"
        rows={rows}
        value={value.content}
        onChange={(event) => {
          onUpdate({ content: event.target.value })
        }}
      />
    </>
  )
}

interface JobSearchCoverLetterViewProperties {
  value: JobSearchCoverLetterValue
  onUpdate: (value: JobSearchCoverLetterValue) => void
  onGenerate: () => void
  isGenerating: boolean
  isGenerateError: boolean
  llmAvailable?: boolean
  rows?: number
}
