import { Card, SectionHeader, Markdown } from "@/ui/components";
import { Disclosure } from "@/ui/pages/settings/components";
import { SecretField } from "@/ui/pages/settings/components";

export function ProviderSecretCard({
  providerName,
  instructions,
  masked,
  isSet,
  onSave,
  onClear,
  onTest,
  className = "p-6",
}: {
  providerName: string;
  instructions: string;
  masked: string;
  isSet: boolean;
  onSave: (value: string) => Promise<void>;
  onClear: () => Promise<void>;
  onTest: () => Promise<{ ok: boolean; error?: string }>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <SectionHeader>{providerName} API-Schlüssel</SectionHeader>
      <div className="mt-4">
        <SecretField
          label={`${providerName} API-Schlüssel`}
          masked={masked}
          isSet={isSet}
          onSave={onSave}
          onClear={onClear}
          onTest={onTest}
        />
        <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
          <Markdown>{instructions}</Markdown>
        </Disclosure>
      </div>
    </Card>
  );
}
