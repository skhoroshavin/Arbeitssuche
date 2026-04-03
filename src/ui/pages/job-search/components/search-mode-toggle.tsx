import { SEARCH_MODES, SEARCH_MODE_LABELS } from "@/models/job-search/index"
import type { SearchMode } from "@/models/job-search/types"
import { ToggleButton } from "@/ui/pages/job-search/components"

export function SearchModeToggle({
  selectedMode,
  onChange,
}: {
  selectedMode: SearchMode
  onChange: (mode: SearchMode) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEARCH_MODES.map((mode) => (
        <ToggleButton
          key={mode}
          isActive={selectedMode === mode}
          onClick={() => onChange(mode)}
        >
          {SEARCH_MODE_LABELS[mode]}
        </ToggleButton>
      ))}
    </div>
  )
}
