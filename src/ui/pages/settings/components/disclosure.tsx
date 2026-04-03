import type { ReactNode } from "react"
import {
  Disclosure as HeadlessDisclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react"
import { ChevronRightIcon } from "@/ui/components"

export function Disclosure({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <HeadlessDisclosure as="div" className="mt-3">
      <DisclosureButton className="group flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronRightIcon className="w-4 h-4 transition-transform group-data-[open]:rotate-90" />
        {title}
      </DisclosureButton>
      <DisclosurePanel className="mt-2 pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
        {children}
      </DisclosurePanel>
    </HeadlessDisclosure>
  )
}
