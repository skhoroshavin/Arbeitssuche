import { useState, useMemo } from "react"
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react"
import type { LlmModel } from "@/models/config"

export function ModelCombobox({
  models,
  value,
  onChange,
  label,
  isLoading,
}: {
  models: LlmModel[]
  value: string
  onChange: (id: string) => void
  label: string
  isLoading: boolean
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const list = q
      ? models.filter(
          (m) =>
            m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
        )
      : models
    return list.slice(0, 50)
  }, [models, query])

  const grouped = useMemo(() => groupByProvider(filtered), [filtered])

  const selected = models.find((m) => m.id === value)

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <Combobox
        value={value}
        onChange={(v: string | null) => {
          if (v !== null) onChange(v)
        }}
        onClose={() => setQuery("")}
        immediate
      >
        <div className="relative">
          <div className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 flex items-center focus-within:ring-2 focus-within:ring-blue-500">
            <ComboboxInput
              className="w-full border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
              displayValue={() =>
                isLoading
                  ? "Modelle werden geladen..."
                  : (selected?.name ?? value)
              }
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isLoading ? "Modelle werden geladen..." : "Modell suchen..."
              }
            />
            {selected && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {formatPrice(selected.pricing.prompt)}/
                {formatPrice(selected.pricing.completion)} /1M
              </span>
            )}
          </div>

          <ComboboxOptions className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-80 overflow-y-auto empty:hidden">
            {[...grouped.entries()].map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 sticky top-0">
                  {provider}
                </div>
                {providerModels.map((m) => (
                  <ComboboxOption
                    key={m.id}
                    value={m.id}
                    className="w-full px-3 py-1.5 text-sm text-left flex items-center justify-between cursor-pointer data-[focus]:bg-blue-50 dark:data-[focus]:bg-blue-900/30 data-[selected]:bg-blue-50 dark:data-[selected]:bg-blue-900/20 data-[selected]:text-blue-700 dark:data-[selected]:text-blue-300 text-gray-800 dark:text-gray-200"
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {formatPrice(m.pricing.prompt)}/
                      {formatPrice(m.pricing.completion)} /1M
                    </span>
                  </ComboboxOption>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">
                Keine Modelle gefunden
              </div>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  )
}

function formatPrice(price: string): string {
  const n = Number.parseFloat(price)
  if (Number.isNaN(n) || n === 0) return "kostenlos"
  return `$${(n * 1_000_000).toFixed(2)}`
}

function groupByProvider(models: LlmModel[]): Map<string, LlmModel[]> {
  const groups = new Map<string, LlmModel[]>()
  for (const m of models) {
    const slash = m.id.indexOf("/")
    const provider = slash > 0 ? m.id.slice(0, slash) : "other"
    let list = groups.get(provider)
    if (!list) {
      list = []
      groups.set(provider, list)
    }
    list.push(m)
  }
  return groups
}
