import { forwardRef } from "react"

export const Input = forwardRef<
  HTMLInputElement,
  { label: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ label, ...properties }, reference) {
  return (
    <label className="block text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <input
        ref={reference}
        {...properties}
        className="mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
    </label>
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ label, ...properties }, reference) {
  return (
    <label className="block text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <textarea
        ref={reference}
        {...properties}
        className="mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
    </label>
  )
})
