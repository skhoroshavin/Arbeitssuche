import { useSecrets } from "@/ui/data/settings";
import { Card, PageHeader, SectionHeader, Loading } from "@/ui/components";
import { Disclosure } from "@/ui/pages/settings/components/Disclosure";
import { SecretField } from "@/ui/pages/settings/components/SecretField";

export default function SettingsMaps() {
  const { data: secrets, isLoading } = useSecrets();

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
          <Disclosure title="Wie bekomme ich einen API-Schlüssel?">
            <p>
              1. Gehe zur{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Google Cloud Console
              </a>
            </p>
            <p>2. Erstelle ein Projekt (falls noch nicht vorhanden)</p>
            <p>3. Aktiviere die „Directions API"</p>
            <p>4. Erstelle unter „Anmeldedaten" einen API-Schlüssel</p>
            <p>5. Füge ihn oben ein</p>
          </Disclosure>
        </div>
      </Card>
    </>
  );
}
