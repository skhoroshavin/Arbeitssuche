export function SectionHeader({
  className = "",
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <h2
      className={`font-semibold text-gray-700 dark:text-gray-300 ${className}`}
    >
      {children}
    </h2>
  )
}
