import {
  useAISettingsView,
  useClearAllData,
  useLlmProviders,
  useProviderSecretActions,
  resolveSecret,
} from "@/ui/data"
import { useState } from "react"
import { useNavigate } from "react-router"
import type { ConfigKey, LlmModel, LlmProviderId } from "@/models/config"
import { Card, PageHeader, SectionHeader, Loading } from "@/ui/components"
import {
  ConfirmationDialog,
  ModelCombobox,
  ProviderSecretCard,
} from "@/ui/pages/settings/components"

export default function SettingsAI({
  showDangerZone = true,
}: {
  showDangerZone?: boolean
}) {
  const navigate = useNavigate()
  const ai = useAISettingsView([
    {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      pricing: { prompt: "0", completion: "0" },
    },
    {
      id: "google/gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      pricing: { prompt: "0", completion: "0" },
    },
    {
      id: "anthropic/claude-haiku-4",
      name: "Claude Haiku 4",
      pricing: { prompt: "0.000001", completion: "0.000005" },
    },
    {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      pricing: { prompt: "0.000003", completion: "0.000015" },
    },
    {
      id: "anthropic/claude-opus-4",
      name: "Claude Opus 4",
      pricing: { prompt: "0.000015", completion: "0.000075" },
    },
  ])
  const clearAllData = useClearAllData()
  const [confirmClear, setConfirmClear] = useState(false)

  if (ai.isLoading) return <Loading />

  return (
    <>
      <PageHeader title="Künstliche Intelligenz" />
      <ProviderSelector
        providers={ai.providers}
        provider={ai.provider}
        onSelect={(value) => ai.saveConfig.mutate({ key: "provider", value })}
      />
      <ProviderSecretSection providerId={ai.provider} secrets={ai.secrets} />
      <ModelSettingsCard
        models={ai.models}
        config={ai.config}
        isLoading={ai.modelsLoading}
        onModelChange={(key, value) => ai.saveConfig.mutate({ key, value })}
      />
      {showDangerZone && (
        <>
          <DangerZoneCard onClear={() => setConfirmClear(true)} />

          <ConfirmationDialog
            open={confirmClear}
            title="Alle Daten löschen?"
            description="Alle Bewerber, Jobsuchen, Stellen, Konfigurationen und API-Schlüssel werden dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden."
            confirmLabel="Alles löschen"
            isConfirming={clearAllData.isPending}
            destructive
            onCancel={() => setConfirmClear(false)}
            onConfirm={async () => {
              await clearAllData.mutateAsync()
              void navigate("/data-cleared", { replace: true })
            }}
          />
        </>
      )}
    </>
  )
}

function ProviderSecretSection({
  providerId,
  secrets,
}: {
  providerId: string
  secrets: Record<string, { masked: string; isSet: boolean }> | undefined
}) {
  const { data: providers } = useLlmProviders()
  const actions = useProviderSecretActions("llm", providerId)
  const provider = providers?.find((p) => p.id === providerId)
  const secret = resolveSecret(secrets, providerId)

  if (!provider) return

  return (
    <ProviderSecretCard
      providerName={provider.name}
      instructions={provider.instructions}
      masked={secret.masked}
      isSet={secret.isSet}
      onSave={actions.onSave}
      onClear={actions.onClear}
      onTest={actions.onTest}
      className="p-6 mt-4"
    />
  )
}

function ProviderSelector({
  providers,
  provider,
  onSelect,
}: {
  providers: { id: string; name: string; description: string }[]
  provider: LlmProviderId
  onSelect: (id: string) => void
}) {
  return (
    <Card className="p-6">
      <SectionHeader>KI-Anbieter</SectionHeader>
      <div className="mt-4 flex gap-3">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`flex-1 px-4 py-3 rounded-lg border-2 text-left transition-colors ${
              provider === p.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="font-medium text-sm">{p.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {p.description}
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

function ModelSettingsCard({
  models,
  config,
  isLoading,
  onModelChange,
}: {
  models: LlmModel[]
  config: {
    assessmentModel: string
    coverLetterModel: string
    consultationModel: string
  }
  isLoading: boolean
  onModelChange: (key: ConfigKey, value: string) => void
}) {
  return (
    <Card className="p-6 mt-4">
      <SectionHeader>Modelle</SectionHeader>
      <div className="space-y-4 mt-4">
        <ModelCombobox
          label="Bewertungsmodell"
          models={models}
          value={config.assessmentModel}
          onChange={(value) => onModelChange("assessmentModel", value)}
          isLoading={isLoading}
        />
        <ModelCombobox
          label="Anschreibenmodell"
          models={models}
          value={config.coverLetterModel}
          onChange={(value) => onModelChange("coverLetterModel", value)}
          isLoading={isLoading}
        />
        <ModelCombobox
          label="Beratungsmodell"
          models={models}
          value={config.consultationModel}
          onChange={(value) => onModelChange("consultationModel", value)}
          isLoading={isLoading}
        />
      </div>
    </Card>
  )
}

function DangerZoneCard({ onClear }: { onClear: () => void }) {
  return (
    <Card className="mt-4 border border-red-200 p-6 dark:border-red-900/40">
      <SectionHeader className="text-red-700 dark:text-red-300">
        Daten zurücksetzen
      </SectionHeader>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Löscht alle gespeicherten Daten inklusive API-Schlüsseln und startet die
        App ohne Konfiguration neu.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
      >
        Alle Daten löschen
      </button>
    </Card>
  )
}
