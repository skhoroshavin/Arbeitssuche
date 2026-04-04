import { useParams } from "react-router"
import { useJobSearch, useUpdateJobSearch, useSiteListView } from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import type { SearchMode } from "@/models/job-search/types"
import {
  Card,
  SectionHeader,
  PageHeader,
  Input,
  Textarea,
  Loading,
} from "@/ui/components"
import { useAutoSaveHeader } from "@/ui/layout"
import { SiteToggle } from "@/ui/pages/job-search/components"
import { SearchModeToggle } from "@/ui/pages/job-search/components"

export default function JobSearchConfig() {
  const { id = "" } = useParams<{ id: string }>()
  const { data, isLoading } = useJobSearch(id)
  const update = useUpdateJobSearch(id)
  const sitesQuery = useSiteListView()

  const { register, setValue, watch, saveStatus } = useAutoSaveForm({
    queryResult: { data, isLoading },
    formOptions: { defaultValues: DEFAULT_FORM_VALUES },
    toFormValues: (d): ConfigFormValues => ({
      searchTerm: d.params.searchTerm,
      radiusKm: d.params.radiusKm,
      searchMode: d.params.searchMode,
      sources: d.params.sources,
      maxResults: d.params.maxResults?.toString() ?? "",
      maxDistanceKm: d.preferences.maxDistanceKm?.toString() ?? "",
      maxCommuteMinutes: d.preferences.maxCommuteMinutes?.toString() ?? "",
      freeText: d.preferences.freeText.join("\n"),
    }),
    onSave: async (form: ConfigFormValues) => {
      if (!data) throw new Error("Job search data not loaded")
      await update.mutateAsync({
        ...data,
        params: {
          searchTerm: form.searchTerm,
          radiusKm: Number(form.radiusKm),
          searchMode: form.searchMode,
          sources: form.sources,
          maxResults: form.maxResults ? Number(form.maxResults) : undefined,
        },
        preferences: {
          maxDistanceKm: form.maxDistanceKm
            ? Number(form.maxDistanceKm)
            : undefined,
          maxCommuteMinutes: form.maxCommuteMinutes
            ? Number(form.maxCommuteMinutes)
            : undefined,
          freeText: form.freeText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        },
      })
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

      <Card className="p-4 space-y-3">
        <SectionHeader>Suchparameter</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Suchbegriff" {...register("searchTerm")} />
          <Input label="Radius (km)" type="number" {...register("radiusKm")} />
          <Input
            label="Max. Ergebnisse"
            type="number"
            placeholder="Unbegrenzt"
            {...register("maxResults")}
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <SectionHeader>Suchmodus</SectionHeader>
        <SearchModeToggle
          selectedMode={selectedMode}
          onChange={(mode) =>
            setValue("searchMode", mode, { shouldDirty: true })
          }
        />
      </Card>

      <Card className="p-4 space-y-3">
        <SectionHeader>
          Jobbörsen{" "}
          <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">
            (leer = alle)
          </span>
        </SectionHeader>
        <SiteToggle
          allSites={allSites}
          selectedSites={selectedSites}
          onChange={(sites) =>
            setValue("sources", sites, { shouldDirty: true })
          }
        />
      </Card>

      <Card className="p-4 space-y-3">
        <SectionHeader>Präferenzen</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Max. Entfernung (km)"
            type="number"
            placeholder="Kein Limit"
            {...register("maxDistanceKm")}
          />
          <Input
            label="Max. Fahrtzeit (Min.)"
            type="number"
            placeholder="Kein Limit"
            {...register("maxCommuteMinutes")}
          />
        </div>
        <Textarea
          label="Freitextkriterien (eine pro Zeile)"
          rows={4}
          {...register("freeText")}
        />
      </Card>
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
