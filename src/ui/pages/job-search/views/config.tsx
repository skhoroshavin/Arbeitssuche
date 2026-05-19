import { useParams } from "react-router"
import type { UseFormSetValue } from "react-hook-form"
import { useJobSearch, useUpdateJobSearch, useSiteListView } from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import type { SearchMode } from "@/models/job-search"
import { SearchSource } from "@/models/job-search"
import { PageHeader, Loading } from "@/ui/components"
import { useAutoSaveHeader } from "@/ui/layout"
import {
  JobSearchSearchConfigView,
  splitLines,
  stringifyOptionalNumber,
} from "@/ui/views"
import type { JobSearch } from "@/models/job-search"
import type { JobSearchEditorConfigValue } from "@/ui/views"

export default function JobSearchConfig() {
  const { id = "" } = useParams<{ id: string }>()
  const { data, isLoading } = useJobSearch(id)
  const update = useUpdateJobSearch(id)
  const sitesQuery = useSiteListView()

  const { setValue, watch, saveStatus } = useAutoSaveForm<
    ConfigFormValues,
    { jobSearch: JobSearch; applicantId: string }
  >({
    queryResult: { data, isLoading },
    formOptions: { defaultValues: DEFAULT_FORM_VALUES },
    toFormValues: toConfigFormValues,
    onSave: async (form: ConfigFormValues) => {
      if (!data) throw new Error("Job search data not loaded")
      await update.mutateAsync(fromConfigFormValues(data.jobSearch, form))
    },
  })

  useAutoSaveHeader(saveStatus)

  const selectedSites = watch("sources")
  const selectedMode = watch("searchMode")

  if (isLoading) return <Loading />
  if (!data) return <div>Jobsuche nicht gefunden</div>

  const allSites = sitesQuery.data.sites

  return (
    <div className="space-y-4">
      <PageHeader title="Suchkonfiguration" />
      <JobSearchSearchConfigView
        allSites={allSites}
        value={toEditorConfigValue(watch(), selectedMode, selectedSites)}
        onUpdate={(value) => applyEditorConfigValue(setValue, value)}
      />
    </div>
  )
}

const DEFAULT_FORM_VALUES: ConfigFormValues = {
  searchTerm: "",
  radiusKm: 30,
  searchMode: "employment",
  sources: [],
  maxResults: "",
  maxCommuteMinutes: "",
  freeText: "",
}

interface ConfigFormValues {
  searchTerm: string
  radiusKm: number
  searchMode: SearchMode
  sources: string[]
  maxResults: string
  maxCommuteMinutes: string
  freeText: string
}

function toConfigFormValues(data: {
  jobSearch: JobSearch
  applicantId: string
}): ConfigFormValues {
  const search: JobSearch = data.jobSearch
  return {
    searchTerm: search.searchTerm,
    radiusKm: search.radiusKm,
    searchMode: search.mode,
    sources: search.sources.map((s: { value: string }) => s.value),
    maxResults:
      search.maxResultsPerSource === 0
        ? ""
        : String(search.maxResultsPerSource),
    maxCommuteMinutes:
      search.maxCommuteMinutes === 0 ? "" : String(search.maxCommuteMinutes),
    freeText: search.notes,
  }
}

function fromConfigFormValues(
  jobSearch: JobSearch,
  form: ConfigFormValues,
): JobSearch {
  return {
    ...jobSearch,
    searchTerm: form.searchTerm,
    radiusKm: Number(form.radiusKm),
    mode: form.searchMode,
    sources: form.sources.map((s) => SearchSource(s)),
    maxResultsPerSource: parseOptionalNumber(form.maxResults) ?? 0,
    maxCommuteMinutes: parseOptionalNumber(form.maxCommuteMinutes) ?? 0,
    notes: form.freeText,
  }
}

function toEditorConfigValue(
  form: ConfigFormValues,
  selectedMode: SearchMode,
  selectedSites: string[],
): JobSearchEditorConfigValue {
  return {
    searchTerm: form.searchTerm,
    radiusKm: Number(form.radiusKm),
    searchMode: selectedMode,
    sources: selectedSites,
    maxResults: parseOptionalNumber(form.maxResults),
    maxCommuteMinutes: parseOptionalNumber(form.maxCommuteMinutes),
    freeText: splitLines(form.freeText),
  }
}

function applyEditorConfigValue(
  setValue: UseFormSetValue<ConfigFormValues>,
  value: JobSearchEditorConfigValue,
): void {
  setValue("searchTerm", value.searchTerm, { shouldDirty: true })
  setValue("radiusKm", value.radiusKm, { shouldDirty: true })
  setValue("searchMode", value.searchMode, { shouldDirty: true })
  setValue("sources", value.sources, { shouldDirty: true })
  setValue("maxResults", stringifyOptionalNumber(value.maxResults), {
    shouldDirty: true,
  })
  setValue(
    "maxCommuteMinutes",
    stringifyOptionalNumber(value.maxCommuteMinutes),
    {
      shouldDirty: true,
    },
  )
  setValue("freeText", value.freeText.join("\n"), { shouldDirty: true })
}

function parseOptionalNumber(value: string): number | undefined {
  return value ? Number(value) : undefined
}
