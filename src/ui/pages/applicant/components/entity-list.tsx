import { useState } from "react"
import { PageHeader, EmptyState, Card, Loading } from "@/ui/components"

export function EntityList({
  title,
  buttonLabel,
  placeholder,
  emptyMessage,
  items,
  isLoading,
  onCreateSubmit,
  createError,
  onDelete,
  onNavigate,
  headerExtra,
}: EntityListProperties) {
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <Loading />

  const createButton = (
    <button
      onClick={() => setShowCreate(!showCreate)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      {buttonLabel}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {title && <PageHeader title={title} />}
        <div className="flex items-center gap-2">
          {headerExtra}
          {createButton}
        </div>
      </div>

      {showCreate && (
        <Card className="p-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              if (!newName) return
              try {
                await onCreateSubmit(newName)
                setNewName("")
                setShowCreate(false)
              } catch {
                // error displayed via createError prop
              }
            }}
          >
            <div className="flex gap-3">
              <input
                autoFocus
                type="text"
                placeholder={placeholder}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setNewName("")
                    setShowCreate(false)
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Erstellen
              </button>
            </div>
            {createError && (
              <p className="mt-2 text-red-600 text-sm">{createError.message}</p>
            )}
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="flex items-center justify-between p-4 hover:shadow-md"
            onClick={() => onNavigate(item.id)}
          >
            <span className="text-lg font-medium text-blue-600 pointer-events-none">
              {item.label}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onDelete(item)
              }}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              Löschen
            </button>
          </Card>
        ))}
        {items.length === 0 && <EmptyState message={emptyMessage} />}
      </div>
    </div>
  )
}

interface EntityListProperties {
  title?: string
  buttonLabel: string
  placeholder: string
  emptyMessage: string
  items: { id: string; label: string }[]
  isLoading: boolean
  onCreateSubmit: (name: string) => Promise<void>
  createError?: Error
  onDelete: (item: { id: string; label: string }) => void
  onNavigate: (id: string) => void
  headerExtra?: React.ReactNode
}
