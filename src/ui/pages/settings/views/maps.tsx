import {
  useCommuteSecrets,
  useCommuteProviderListView,
  useProviderSecretActions,
  resolveSecret,
} from "@/ui/data"
import { PageHeader, Loading } from "@/ui/components"
import { ProviderSecretCard } from "@/ui/pages/settings/components"

export default function SettingsMaps() {
  const mapData = useMapSettingsData()
  const actions = useProviderSecretActions("commute", mapData.providerId)

  if (mapData.isLoading) return <Loading />

  return (
    <>
      <PageHeader title="Karten" />
      {mapData.provider && (
        <ProviderSecretCard
          providerName={mapData.provider.name}
          instructions={mapData.provider.instructions}
          masked={mapData.masked}
          isSet={mapData.isSet}
          onSave={actions.onSave}
          onClear={actions.onClear}
          onTest={actions.onTest}
        />
      )}
    </>
  )
}

function useMapSettingsData() {
  const { data: secrets, isLoading } = useCommuteSecrets()
  const { data: providers } = useCommuteProviderListView()
  const provider = providers.find((candidate) => candidate.id === "google-maps")
  const providerId = provider ? provider.id : "google-maps"
  const secret = resolveSecret(secrets, providerId)
  return { isLoading, provider, providerId, ...secret }
}
