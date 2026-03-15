import { useState, useRef, useEffect, useMemo } from "react";
import type { LlmModel } from "@/models/config/types";

function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (isNaN(n) || n === 0) return "kostenlos";
  return `$${(n * 1_000_000).toFixed(2)}`;
}

function groupByProvider(models: LlmModel[]): Map<string, LlmModel[]> {
  const groups = new Map<string, LlmModel[]>();
  for (const m of models) {
    const slash = m.id.indexOf("/");
    const provider = slash > 0 ? m.id.slice(0, slash) : "other";
    let list = groups.get(provider);
    if (!list) {
      list = [];
      groups.set(provider, list);
    }
    list.push(m);
  }
  return groups;
}

const MAX_VISIBLE = 50;

export function ModelCombobox({
  models,
  value,
  onChange,
  label,
  isLoading,
}: {
  models: LlmModel[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? models.filter(
          (m) =>
            m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
        )
      : models;
    return list.slice(0, MAX_VISIBLE);
  }, [models, search]);

  const grouped = useMemo(() => groupByProvider(filtered), [filtered]);

  const selected = models.find((m) => m.id === value);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setSearch("");
          }}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="truncate">
            {isLoading
              ? "Modelle werden geladen..."
              : (selected?.name ?? value)}
          </span>
          {selected && (
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              {formatPrice(selected.pricing.prompt)}/
              {formatPrice(selected.pricing.completion)} /1M
            </span>
          )}
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-80 flex flex-col">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Modell suchen..."
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-y-auto">
              {[...grouped.entries()].map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 sticky top-0">
                    {provider}
                  </div>
                  {providerModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                        m.id === value
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {formatPrice(m.pricing.prompt)}/
                        {formatPrice(m.pricing.completion)} /1M
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">
                  Keine Modelle gefunden
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
