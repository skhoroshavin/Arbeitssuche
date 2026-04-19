import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Abbrechen",
  isConfirming = false,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProperties) {
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isConfirming}
              onClick={() => {
                void onConfirm()
              }}
              className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface ConfirmationDialogProperties {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  isConfirming?: boolean
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}
