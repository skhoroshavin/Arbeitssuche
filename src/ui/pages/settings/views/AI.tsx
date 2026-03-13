import {
  useSecrets,
  useConfig,
  useSaveConfig,
  useOpenRouterModels,
} from "@/ui/data/settings";
import type { ConfigKey, OpenRouterModel } from "@/models/config/types";
import {
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "@/models/config/types";
import { Card, PageHeader, SectionHeader, Loading } from "@/ui/components";
import { Disclosure } from "@/ui/pages/settings/components/Disclosure";
import { SecretField } from "@/ui/pages/settings/components/SecretField";
import { ModelCombobox } from "@/ui/pages/settings/components/ModelCombobox";

const MODEL_OPTIONS: OpenRouterModel[] = [
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

export default function SettingsAI() {
  const { data: secrets, isLoading: secretsLoading } = useSecrets();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: remoteModels, isLoading: modelsLoading } =
    useOpenRouterModels();
  const saveConfig = useSaveConfig();

  if (secretsLoading || configLoading) return <Loading />;

  const models =
    remoteModels && remoteModels.length > 0 ? remoteModels : MODEL_OPTIONS;

  const handleModelChange = (key: ConfigKey, value: string) => {
    saveConfig.mutate({ key, value });
  };

  return (
    <>
      <PageHeader title="Künstliche Intelligenz" />
      <Card className="p-6">
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
