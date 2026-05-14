import { DialogLayout } from "@/ui/components"

export function WizardCancelChoicesModal({
  open,
  onContinue,
  onKeepDraft,
  onDiscard,
}: WizardCancelChoicesModalProperties) {
  return (
    <DialogLayout
      open={open}
      onClose={onContinue}
      title="Wizard verlassen?"
      description="Sie können weiter bearbeiten, den Entwurf behalten oder den Entwurf verwerfen."
    >
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Weiter bearbeiten
        </button>
        <button
          type="button"
          onClick={onKeepDraft}
          className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Entwurf behalten
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Entwurf verwerfen
        </button>
      </div>
    </DialogLayout>
  )
}

interface WizardCancelChoicesModalProperties {
  open: boolean
  onContinue: () => void
  onKeepDraft: () => void
  onDiscard: () => void
}
