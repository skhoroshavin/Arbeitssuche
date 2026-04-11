export function WizardResumeDraftPrompt({
  description,
  discardLabel,
  onResume,
  onDiscardAndStartFresh,
}: WizardResumeDraftPromptProperties) {
  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Entwurf gefunden
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onResume}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Entwurf fortsetzen
        </button>
        <button
          type="button"
          onClick={() => void onDiscardAndStartFresh()}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          {discardLabel}
        </button>
      </div>
    </div>
  )
}

interface WizardResumeDraftPromptProperties {
  description: string
  discardLabel: string
  onResume: () => void
  onDiscardAndStartFresh: () => Promise<void>
}
