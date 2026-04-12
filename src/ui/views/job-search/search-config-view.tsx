import { SEARCH_MODES, SEARCH_MODE_LABELS } from "@/models/job-search"
import { Card, Input, SectionHeader, Textarea } from "@/ui/components"
import type { JobSearchEditorConfigValue, SiteInfo } from "./types"

export function JobSearchSearchConfigView({
  value,
  allSites,
  onUpdate,
  sections = ["parameters", "mode", "sources", "preferences"],
}: JobSearchSearchConfigViewProperties) {
  return (
    <>
      {sections.map((section) => (
        <div key={section}>
          {SECTION_RENDERERS[section](value, allSites, onUpdate)}
        </div>
      ))}
    </>
  )
}

interface JobSearchSearchConfigViewProperties {
  value: JobSearchEditorConfigValue
  allSites: SiteInfo[]
  onUpdate: (value: JobSearchEditorConfigValue) => void
  sections?: JobSearchConfigSection[]
}

export type JobSearchConfigSection =
  | "parameters"
  | "mode"
  | "sources"
  | "preferences"

const SECTION_RENDERERS: Record<
  JobSearchConfigSection,
  (
    value: JobSearchEditorConfigValue,
    allSites: SiteInfo[],
    onUpdate: (value: JobSearchEditorConfigValue) => void,
  ) => JSX.Element
> = {
  parameters: renderParametersSection,
  mode: renderModeSection,
  sources: renderSourcesSection,
  preferences: renderPreferencesSection,
}

function renderParametersSection(
  value: JobSearchEditorConfigValue,
  _allSites: SiteInfo[],
  onUpdate: (value: JobSearchEditorConfigValue) => void,
): JSX.Element {
  return (
    <Card className="p-4 space-y-3">
      <SectionHeader>Suchparameter</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Suchbegriff"
          value={value.searchTerm}
          onChange={(event) => {
            onUpdate({ ...value, searchTerm: event.target.value })
          }}
        />
        <Input
          label="Radius (km)"
          type="number"
          value={value.radiusKm}
          onChange={(event) => {
            onUpdate({
              ...value,
              radiusKm: Number(event.target.value || 0),
            })
          }}
        />
        <Input
          label="Max. Ergebnisse"
          type="number"
          placeholder="Unbegrenzt"
          value={value.maxResults?.toString() ?? ""}
          onChange={(event) => {
            onUpdate({
              ...value,
              maxResults: parseOptionalNumber(event.target.value),
            })
          }}
        />
      </div>
    </Card>
  )
}

function renderModeSection(
  value: JobSearchEditorConfigValue,
  _allSites: SiteInfo[],
  onUpdate: (value: JobSearchEditorConfigValue) => void,
): JSX.Element {
  return (
    <Card className="p-4 space-y-3">
      <SectionHeader>Suchmodus</SectionHeader>
      <div className="flex flex-wrap gap-2">
        {SEARCH_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              onUpdate({ ...value, searchMode: mode })
            }}
            className={resolveToggleClassName(value.searchMode === mode)}
          >
            {SEARCH_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </Card>
  )
}

function renderSourcesSection(
  value: JobSearchEditorConfigValue,
  allSites: SiteInfo[],
  onUpdate: (value: JobSearchEditorConfigValue) => void,
): JSX.Element {
  return (
    <Card className="p-4 space-y-3">
      <SectionHeader>
        Jobboersen{" "}
        <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">
          (leer = alle)
        </span>
      </SectionHeader>
      <div className="flex flex-wrap gap-2">
        {allSites.map((site) => (
          <button
            key={site.name}
            type="button"
            onClick={() => {
              onUpdate({
                ...value,
                sources: toggleSource(value.sources, site.name),
              })
            }}
            className={resolveToggleClassName(
              value.sources.includes(site.name),
            )}
          >
            {site.name}
          </button>
        ))}
      </div>
    </Card>
  )
}

function renderPreferencesSection(
  value: JobSearchEditorConfigValue,
  _allSites: SiteInfo[],
  onUpdate: (value: JobSearchEditorConfigValue) => void,
): JSX.Element {
  return (
    <Card className="p-4 space-y-3">
      <SectionHeader>Praferenzen</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Max. Entfernung (km)"
          type="number"
          placeholder="Kein Limit"
          value={value.maxDistanceKm?.toString() ?? ""}
          onChange={(event) => {
            onUpdate({
              ...value,
              maxDistanceKm: parseOptionalNumber(event.target.value),
            })
          }}
        />
        <Input
          label="Max. Fahrtzeit (Min.)"
          type="number"
          placeholder="Kein Limit"
          value={value.maxCommuteMinutes?.toString() ?? ""}
          onChange={(event) => {
            onUpdate({
              ...value,
              maxCommuteMinutes: parseOptionalNumber(event.target.value),
            })
          }}
        />
      </div>
      <Textarea
        label="Freitextkriterien (eine pro Zeile)"
        rows={4}
        value={value.freeText.join("\n")}
        onChange={(event) => {
          onUpdate({
            ...value,
            freeText: splitLines(event.target.value),
          })
        }}
      />
    </Card>
  )
}

export function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseOptionalNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined
}

export function stringifyOptionalNumber(value: number | undefined): string {
  return value === undefined ? "" : value.toString()
}

function toggleSource(current: string[], site: string): string[] {
  return current.includes(site)
    ? current.filter((name) => name !== site)
    : [...current, site]
}

function resolveToggleClassName(isActive: boolean): string {
  return isActive
    ? "rounded-md px-3 py-1 text-sm font-medium bg-zinc-700 text-white"
    : "rounded-md px-3 py-1 text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
}
