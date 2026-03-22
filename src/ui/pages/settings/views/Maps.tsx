import { useSecrets, useSecretKeyInfos } from "@/ui/data/settings";
import { Card, PageHeader, SectionHeader, Loading } from "@/ui/components";
import { Disclosure } from "@/ui/pages/settings/components/Disclosure";
import { SecretField } from "@/ui/pages/settings/components/SecretField";

export default function SettingsMaps() {
  const { data: secrets, isLoading } = useSecrets();
  const { data: keyInfos } = useSecretKeyInfos();
  const keyInfo = keyInfos?.find((ki) => ki.key === "googleMapsApiKey");

  if (isLoading) return <Loading />;

  return (
    <>
      <PageHeader title="Karten" />
      <Card className="p-6">
        <SectionHeader>Google Maps API-Schlüssel</SectionHeader>
        <div className="mt-4">
          <SecretField
            label="Google Maps API-Schlüssel"
            secretKey="googleMapsApiKey"
            masked={secrets?.googleMapsApiKey?.masked ?? ""}
            isSet={secrets?.googleMapsApiKey?.isSet ?? false}
          />
          {keyInfo && (
            <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
              <p>
                1. Gehe zur{" "}
                <a
                  href={keyInfo.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  {keyInfo.helpLabel}
                </a>
              </p>
              {keyInfo.helpSteps.map((step, i) => (
                <p key={i}>
                  {i + 2}. {step}
                </p>
              ))}
            </Disclosure>
          )}
        </div>
      </Card>
    </>
  );
}
