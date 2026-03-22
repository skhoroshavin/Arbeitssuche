import {
  useLlmSecrets,
  useSaveLlmSecret,
  useClearLlmSecret,
  useTestLlmSecret,
  useConfig,
  useSaveConfig,
  useLlmModels,
  useLlmProviders,
} from "@/ui/data/settings";
import type { ConfigKey, LlmModel, LlmProvider } from "@/models/config/types";
import {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "@/models/config/types";
import {
  Card,
  PageHeader,
  SectionHeader,
  Loading,
  Markdown,
} from "@/ui/components";
import { Disclosure } from "@/ui/pages/settings/components/Disclosure";
import { SecretField } from "@/ui/pages/settings/components/SecretField";
import { ModelCombobox } from "@/ui/pages/settings/components/ModelCombobox";

const MODEL_OPTIONS: LlmModel[] = [
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
];

function ProviderSecretSection({
  providerId,
  secrets,
}: {
  providerId: string;
  secrets: Record<string, { masked: string; isSet: boolean }> | undefined;
}) {
  const { data: providers } = useLlmProviders();
  const saveMutation = useSaveLlmSecret();
  const clearMutation = useClearLlmSecret();
  const testMutation = useTestLlmSecret();

  const provider = providers?.find((p) => p.id === providerId);
  const secret = secrets?.[providerId];

  if (!provider) return null;

  return (
    <Card className="p-6 mt-4">
      <SectionHeader>{provider.name} API-Schlüssel</SectionHeader>
      <div className="mt-4">
        <SecretField
          label={`${provider.name} API-Schlüssel`}
          masked={secret?.masked ?? ""}
          isSet={secret?.isSet ?? false}
          onSave={async (value) => {
            await saveMutation.mutateAsync({ providerId, value });
          }}
          onClear={async () => {
            await clearMutation.mutateAsync(providerId);
          }}
          onTest={() => testMutation.mutateAsync(providerId)}
        />
        <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
          <Markdown>{provider.instructions}</Markdown>
        </Disclosure>
      </div>
    </Card>
  );
}

export default function SettingsAI() {
  const { data: secrets, isLoading: secretsLoading } = useLlmSecrets();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: remoteModels, isLoading: modelsLoading } = useLlmModels();
  const { data: providers } = useLlmProviders();
  const saveConfig = useSaveConfig();

  if (secretsLoading || configLoading) return <Loading />;

  const provider: LlmProvider = config?.provider ?? DEFAULT_PROVIDER;

  const models =
    remoteModels && remoteModels.length > 0 ? remoteModels : MODEL_OPTIONS;

  const handleModelChange = (key: ConfigKey, value: string) => {
    saveConfig.mutate({ key, value });
  };

  const handleProviderChange = (value: string) => {
    saveConfig.mutate({ key: "provider", value });
  };

  return (
    <>
      <PageHeader title="Künstliche Intelligenz" />
      <Card className="p-6">
        <SectionHeader>KI-Anbieter</SectionHeader>
        <div className="mt-4 flex gap-3">
          {(providers ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProviderChange(p.id)}
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
      <ProviderSecretSection providerId={provider} secrets={secrets} />
      <Card className="p-6 mt-4">
        <SectionHeader>Modelle</SectionHeader>
        <div className="space-y-4 mt-4">
          <ModelCombobox
            label="Bewertungsmodell"
            models={models}
            value={config?.assessmentModel ?? DEFAULT_ASSESSMENT_MODEL}
            onChange={(value) => handleModelChange("assessmentModel", value)}
            isLoading={modelsLoading}
          />
          <ModelCombobox
            label="Anschreibenmodell"
            models={models}
            value={config?.coverLetterModel ?? DEFAULT_COVER_LETTER_MODEL}
            onChange={(value) => handleModelChange("coverLetterModel", value)}
            isLoading={modelsLoading}
          />
          <ModelCombobox
            label="Beratungsmodell"
            models={models}
            value={config?.consultationModel ?? DEFAULT_CONSULTATION_MODEL}
            onChange={(value) => handleModelChange("consultationModel", value)}
            isLoading={modelsLoading}
          />
        </div>
      </Card>
    </>
  );
}
