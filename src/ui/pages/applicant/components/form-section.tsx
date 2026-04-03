export function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-blue-600 hover:underline"
    >
      + {children}
    </button>
  )
}

export function FieldArrayCard({
  onRemove,
  footer,
  children,
}: {
  onRemove: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2">
      {children}
      <div
        className={`flex items-center ${footer ? "justify-between" : "justify-end"}`}
      >
        {footer}
        <RemoveButton onClick={onRemove} />
      </div>
    </div>
  )
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-red-600 hover:underline"
    >
      Entfernen
    </button>
  )
}
