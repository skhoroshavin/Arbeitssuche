import type { SecretKeyInfo } from "@/models/secrets/types.js";

const openrouterKeyInfo: SecretKeyInfo = {
  key: "openrouterApiKey",
  label: "OpenRouter API-Schlüssel",
  helpUrl: "https://openrouter.ai/keys",
  helpLabel: "openrouter.ai/keys",
  helpSteps: [
    "Erstelle ein Konto auf openrouter.ai oder melde dich an",
    `Füge unter \u201ECredits\u201C Guthaben hinzu (ab $5)`,
    `Gehe zu \u201EKeys\u201C und klicke auf \u201ECreate Key\u201C`,
    `Gib dem Schlüssel einen Namen (z.B. \u201EArbeitssuche\u201C) und kopiere ihn`,
    "Der Schlüssel beginnt mit sk-or-\u2026",
    "Füge ihn oben ein",
  ],
};

const requestyKeyInfo: SecretKeyInfo = {
  key: "requestyApiKey",
  label: "Requesty API-Schlüssel",
  helpUrl: "https://requesty.ai",
  helpLabel: "requesty.ai",
  helpSteps: [
    "Erstelle ein Konto auf requesty.ai oder melde dich an",
    "Requesty verarbeitet Daten in der EU",
    `Erstelle unter \u201EAPI Keys\u201C einen neuen Schlüssel`,
    "Kopiere den Schlüssel",
    "Füge ihn oben ein",
  ],
};

const googleMapsKeyInfo: SecretKeyInfo = {
  key: "googleMapsApiKey",
  label: "Google Maps API-Schlüssel",
  helpUrl: "https://console.cloud.google.com/apis/credentials",
  helpLabel: "Google Cloud Console",
  helpSteps: [
    "Erstelle ein Google-Cloud-Projekt (falls noch nicht vorhanden)",
    "Aktiviere die Abrechnung für das Projekt",
    `Aktiviere die \u201EDirections API\u201C unter \u201EAPIs & Services\u201C`,
    `Erstelle unter \u201EAnmeldedaten\u201C einen API-Schlüssel`,
    "Beschränke den Schlüssel auf die Directions API",
    "Der Schlüssel beginnt mit AIza\u2026",
    "Füge ihn oben ein",
  ],
};

export function getLlmSecretKeyInfo(provider: string): SecretKeyInfo {
  switch (provider) {
    case "requesty":
      return requestyKeyInfo;
    default:
      return openrouterKeyInfo;
  }
}

export { googleMapsKeyInfo };
