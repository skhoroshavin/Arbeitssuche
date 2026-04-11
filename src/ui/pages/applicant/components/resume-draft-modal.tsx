import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"

export function ResumeDraftModal({
  open,
  description,
  discardLabel,
  onResume,
  onDiscardAndStartOver,
  onCancel,
}: ResumeDraftModalProperties) {
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Entwurf gefunden
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onResume}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Entwurf fortsetzen
            </button>
            <button
              type="button"
              onClick={onDiscardAndStartOver}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              {discardLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Abbrechen
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface ResumeDraftModalProperties {
  open: boolean
  description: string
  discardLabel: string
  onResume: () => void
  onDiscardAndStartOver: () => void
  onCancel: () => void
}
