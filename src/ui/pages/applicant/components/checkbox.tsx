import { forwardRef } from "react"

export const Checkbox = forwardRef<
  HTMLInputElement,
  { label?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Checkbox({ label = "Offenlegen", ...properties }, reference) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
      <input ref={reference} type="checkbox" {...properties} />
      <span>{label}</span>
    </label>
  )
})
