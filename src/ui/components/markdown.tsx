import { memo } from "react"
import ReactMarkdown from "react-markdown"

export const Markdown = memo(function Markdown({
  children,
  className = "",
}: {
  children: string
  className?: string
}) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
})
