import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"
import type { ReactNode } from "react"

export function DialogLayout({
  open,
  onClose,
  title,
  description,
  children,
}: DialogLayoutProperties) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </DialogTitle>
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          )}
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface DialogLayoutProperties {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}
