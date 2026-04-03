import { forwardRef, useEffect, useRef } from "react"

export const AutoExpandTextarea = forwardRef<
  HTMLTextAreaElement,
  { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoExpandTextarea({ label, onInput, ...properties }, reference) {
  const internalReference = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (internalReference.current) adjustHeight(internalReference.current)
  })

  return (
    <label className="block text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <textarea
        ref={(node) => {
          internalReference.current = node
          if (typeof reference === "function") reference(node)
          else if (reference) reference.current = node
        }}
        onInput={(event) => {
          adjustHeight(event.currentTarget)
          onInput?.(event)
        }}
        {...properties}
        className="mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none overflow-hidden"
      />
    </label>
  )
})

function adjustHeight(element: HTMLTextAreaElement) {
  element.style.height = "auto"
  element.style.height = element.scrollHeight + "px"
}
