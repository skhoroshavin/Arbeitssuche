import {
  useCommuteSecrets,
  useProviderSecretActions,
  resolveSecret,
} from "@/ui/data"

import { PageHeader, Loading } from "@/ui/components"

import { ProviderSecretCard } from "@/ui/pages/settings/components"

export default function SettingsMaps() {
  const { data: secrets, isLoading } = useCommuteSecrets()
  const secret = resolveSecret(secrets, PROVIDER_ID)
  const actions = useProviderSecretActions("commute", PROVIDER_ID)

  if (isLoading) return <Loading />

  return (
    <>
      <PageHeader title="Karten" />
      <ProviderSecretCard
        providerName="Google Maps"
        instructions={PROVIDER_INSTRUCTIONS}
        masked={secret.masked}
        isSet={secret.isSet}
        onSave={actions.onSave}
        onClear={actions.onClear}
        onTest={actions.onTest}
      />
    </>
  )
}

const PROVIDER_ID = "google-maps"

const PROVIDER_INSTRUCTIONS = [
  "1. Öffne die [Google Cloud Console](https://console.cloud.google.com)",
  "2. Erstelle ein [neues Projekt](https://console.cloud.google.com/projectcreate) oder wähle ein bestehendes aus",
  "3. Aktiviere die [Abrechnung](https://console.cloud.google.com/billing) für das Projekt (erforderlich für API-Zugriff)",
  '4. Öffne die [API-Bibliothek](https://console.cloud.google.com/apis/library) und suche nach "Distance Matrix API"',
  '5. Klicke auf [Distance Matrix API](https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com) → "Aktivieren"',
  '6. Gehe zu [Anmeldedaten](https://console.cloud.google.com/apis/credentials) → "Anmeldedaten erstellen" → "API-Schlüssel"',
  '7. Klicke auf "Schlüssel einschränken" und wähle unter "API-Einschränkungen" nur die Distance Matrix API',
  "8. Kopiere den Schlüssel - er beginnt mit `AIza...`",
  "9. Füge ihn oben ein",
].join("\n")
