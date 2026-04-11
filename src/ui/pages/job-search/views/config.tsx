import { useParams } from "react-router"
import { useJobSearch, useUpdateJobSearch, useSiteListView } from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import { mapPersistedJobSearchToSnapshot } from "@/models/job-search"
import type { SearchMode } from "@/models/job-search/types"
import { PageHeader, Loading } from "@/ui/components"
import { useAutoSaveHeader } from "@/ui/layout"
import { JobSearchSearchConfigView } from "@/ui/views"
import type { JobSearch } from "@/models/job-search/types"

export default function JobSearchConfig() {
  const { id = "" } = useParams<{ id: string }>()
  const { data, isLoading } = useJobSearch(id)
  const update = useUpdateJobSearch(id)
  const sitesQuery = useSiteListView()

  const { setValue, watch, saveStatus } = useAutoSaveForm({
    queryResult: { data, isLoading },
    formOptions: { defaultValues: DEFAULT_FORM_VALUES },
    toFormValues: toConfigFormValues,
    onSave: async (form: ConfigFormValues) => {
      if (!data) throw new Error("Job search data not loaded")
      await update.mutateAsync(fromConfigFormValues(data, form))
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
        value={{
          searchTerm: watch("searchTerm"),
          radiusKm: Number(watch("radiusKm")),
          searchMode: selectedMode,
          sources: selectedSites,
          maxResults: parseOptionalNumber(watch("maxResults")),
          maxDistanceKm: parseOptionalNumber(watch("maxDistanceKm")),
          maxCommuteMinutes: parseOptionalNumber(watch("maxCommuteMinutes")),
          freeText: splitLines(watch("freeText")),
        }}
        onUpdate={(value) => {
          setValue("searchTerm", value.searchTerm, { shouldDirty: true })
          setValue("radiusKm", value.radiusKm, { shouldDirty: true })
          setValue("searchMode", value.searchMode, { shouldDirty: true })
          setValue("sources", value.sources, { shouldDirty: true })
          setValue("maxResults", stringifyOptionalNumber(value.maxResults), {
            shouldDirty: true,
          })
          setValue(
            "maxDistanceKm",
            stringifyOptionalNumber(value.maxDistanceKm),
            {
              shouldDirty: true,
            },
          )
          setValue(
            "maxCommuteMinutes",
            stringifyOptionalNumber(value.maxCommuteMinutes),
            {
              shouldDirty: true,
            },
          )
          setValue("freeText", value.freeText.join("\n"), { shouldDirty: true })
        }}
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
  maxDistanceKm: "",
  maxCommuteMinutes: "",
  freeText: "",
}

interface ConfigFormValues {
  searchTerm: string
  radiusKm: number
  searchMode: SearchMode
  sources: string[]
  maxResults: string
  maxDistanceKm: string
  maxCommuteMinutes: string
  freeText: string
}

function toConfigFormValues(jobSearch: JobSearch): ConfigFormValues {
  const snapshot = mapPersistedJobSearchToSnapshot(jobSearch, "")
  return {
    searchTerm: snapshot.params.searchTerm,
    radiusKm: snapshot.params.radiusKm,
    searchMode: snapshot.params.searchMode,
    sources: snapshot.params.sources,
    maxResults: snapshot.params.maxResults?.toString() ?? "",
    maxDistanceKm: snapshot.preferences.maxDistanceKm?.toString() ?? "",
    maxCommuteMinutes: snapshot.preferences.maxCommuteMinutes?.toString() ?? "",
    freeText: snapshot.preferences.freeText.join("\n"),
  }
}

function fromConfigFormValues(
  jobSearch: JobSearch,
  form: ConfigFormValues,
): JobSearch {
  return {
    ...jobSearch,
    params: {
      searchTerm: form.searchTerm,
      radiusKm: Number(form.radiusKm),
      searchMode: form.searchMode,
      sources: form.sources,
      maxResults: parseOptionalNumber(form.maxResults),
    },
    preferences: {
      maxDistanceKm: parseOptionalNumber(form.maxDistanceKm),
      maxCommuteMinutes: parseOptionalNumber(form.maxCommuteMinutes),
      freeText: splitLines(form.freeText),
    },
  }
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseOptionalNumber(value: string): number | undefined {
  return value ? Number(value) : undefined
}

function stringifyOptionalNumber(value: number | undefined): string {
  return value === undefined ? "" : value.toString()
}
