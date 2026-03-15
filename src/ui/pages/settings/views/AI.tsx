import {
  useSecrets,
  useConfig,
  useSaveConfig,
  useLlmModels,
} from "@/ui/data/settings";
import type { ConfigKey, LlmModel, LlmProvider } from "@/models/config/types";
import {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "@/models/config/types";
import { Card, PageHeader, SectionHeader, Loading } from "@/ui/components";
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

const PROVIDERS: { value: LlmProvider; label: string; description: string }[] =
  [
    { value: "openrouter", label: "OpenRouter", description: "Global" },
    {
      value: "requesty",
      label: "Requesty",
      description: "EU-Datenverarbeitung",
    },
  ];

export default function SettingsAI() {
  const { data: secrets, isLoading: secretsLoading } = useSecrets();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: remoteModels, isLoading: modelsLoading } = useLlmModels();
  const saveConfig = useSaveConfig();

  if (secretsLoading || configLoading) return <Loading />;

  const provider: LlmProvider = config?.provider ?? DEFAULT_PROVIDER;

  const models =
    remoteModels && remoteModels.length > 0 ? remoteModels : MODEL_OPTIONS;

  const handleModelChange = (key: ConfigKey, value: string) => {
    saveConfig.mutate({ key, value });
  };

  const handleProviderChange = (value: LlmProvider) => {
    saveConfig.mutate({ key: "provider", value });
  };

  return (
    <>
      <PageHeader title="Künstliche Intelligenz" />
      <Card className="p-6">
        <SectionHeader>KI-Anbieter</SectionHeader>
        <div className="mt-4 flex gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handleProviderChange(p.value)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                provider === p.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </Card>
      <Card className="p-6 mt-4">
        {provider === "openrouter" ? (
          <>
            <SectionHeader>OpenRouter API-Schlüssel</SectionHeader>
            <div className="mt-4">
              <SecretField
                label="OpenRouter API-Schlüssel"
                secretKey="openrouterApiKey"
                masked={secrets?.openrouterApiKey?.masked ?? ""}
                isSet={secrets?.openrouterApiKey?.isSet ?? false}
              />
              <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
                <p>
                  1. Gehe zu{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
                <p>2. Erstelle ein Konto oder melde dich an</p>
                <p>3. Klicke auf „Create Key" und kopiere den Schlüssel</p>
                <p>4. Füge ihn oben ein</p>
              </Disclosure>
            </div>
          </>
        ) : (
          <>
            <SectionHeader>Requesty API-Schlüssel</SectionHeader>
            <div className="mt-4">
              <SecretField
                label="Requesty API-Schlüssel"
                secretKey="requestyApiKey"
                masked={secrets?.requestyApiKey?.masked ?? ""}
                isSet={secrets?.requestyApiKey?.isSet ?? false}
              />
              <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
                <p>
                  1. Gehe zu{" "}
                  <a
                    href="https://requesty.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    requesty.ai
                  </a>
                </p>
                <p>2. Erstelle ein Konto oder melde dich an</p>
                <p>3. Erstelle einen API-Schlüssel und kopiere ihn</p>
                <p>4. Füge ihn oben ein</p>
              </Disclosure>
            </div>
          </>
        )}
      </Card>
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
