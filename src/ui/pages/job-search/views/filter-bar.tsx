import { STATUS_LABELS } from "@/models/vacancy/index";
import type { StatusLabelKey } from "@/models/vacancy/index";

export type { SortKey };

export function isSortKey(s: string): s is SortKey {
  return SORT_OPTIONS.some((o) => o.key === s);
}

export function FilterBar({
  statusCounts,
  filter,
  sortBy,
  setFilter,
  setSortBy,
}: {
  statusCounts: Record<string, number>;
  filter: string;
  sortBy: SortKey;
  setFilter: (v: string) => void;
  setSortBy: (v: SortKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">
          Sortierung:
        </span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === opt.key
                ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-gray-900"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTER_ORDER.map((status) => {
          const count = statusCounts[status] ?? 0;
          if (status !== "all" && count === 0) return;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm border ${
                filter === status
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              {STATUS_LABELS[status]} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Datum" },
  { key: "company", label: "Unternehmen" },
  { key: "commute", label: "Fahrtzeit" },
  { key: "score", label: "Bewertung" },
];

const FILTER_ORDER: StatusLabelKey[] = [
  "all",
  "new",
  "gone",
  "renewed",
  "applied",
  "ignored",
  "invited",
  "interviewed",
  "offered",
  "rejected",
  "not-interested",
];

type SortKey = "date" | "company" | "commute" | "score";
