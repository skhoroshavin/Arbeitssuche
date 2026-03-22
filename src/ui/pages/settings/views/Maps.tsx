import {
  useCommuteSecrets,
  useSaveCommuteSecret,
  useClearCommuteSecret,
  useTestCommuteSecret,
  useCommuteProviders,
} from "@/ui/data/settings";
import {
  Card,
  PageHeader,
  SectionHeader,
  Loading,
  Markdown,
} from "@/ui/components";
import { Disclosure } from "@/ui/pages/settings/components/Disclosure";
import { SecretField } from "@/ui/pages/settings/components/SecretField";

export default function SettingsMaps() {
  const { data: secrets, isLoading } = useCommuteSecrets();
  const { data: providers } = useCommuteProviders();
  const saveMutation = useSaveCommuteSecret();
  const clearMutation = useClearCommuteSecret();
  const testMutation = useTestCommuteSecret();

  if (isLoading) return <Loading />;

  const provider = providers?.[0];

  return (
    <>
      <PageHeader title="Karten" />
      {provider && (
        <Card className="p-6">
          <SectionHeader>{provider.name} API-Schlüssel</SectionHeader>
          <div className="mt-4">
            <SecretField
              label={`${provider.name} API-Schlüssel`}
              masked={secrets?.[provider.id]?.masked ?? ""}
              isSet={secrets?.[provider.id]?.isSet ?? false}
              onSave={async (value) => {
                await saveMutation.mutateAsync({
                  providerId: provider.id,
                  value,
                });
              }}
              onClear={async () => {
                await clearMutation.mutateAsync(provider.id);
              }}
              onTest={() => testMutation.mutateAsync(provider.id)}
            />
            <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
              <Markdown>{provider.instructions}</Markdown>
            </Disclosure>
          </div>
        </Card>
      )}
    </>
  );
}
