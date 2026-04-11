import type { ReactNode } from "react"
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"

export function WizardModalShell({
  open,
  onClose,
  title,
  stepLabel,
  maxWidthClassName,
  onBack,
  onNext,
  onFinish,
  finishDisabled = false,
  children,
}: WizardModalShellProperties) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 ${maxWidthClassName}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </DialogTitle>
            <button
              type="button"
              onClick={() => {
                void onClose()
              }}
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Schliessen
            </button>
          </div>

          <p className="mb-4 text-sm text-gray-500 dark:text-gray-300">
            {stepLabel}
          </p>

          {children}

          <div className="mt-6 flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Zurueck
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Weiter
              </button>
            )}
            {onFinish && (
              <button
                type="button"
                disabled={finishDisabled}
                onClick={() => {
                  void onFinish()
                }}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Fertigstellen
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void onClose()
              }}
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

interface WizardModalShellProperties {
  open: boolean
  onClose: () => Promise<void> | void
  title: string
  stepLabel: string
  maxWidthClassName: string
  onBack?: () => void
  onNext?: () => void
  onFinish?: () => Promise<void> | void
  finishDisabled?: boolean
  children: ReactNode
}
