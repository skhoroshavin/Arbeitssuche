import {
  createModelRegistry,
  createOpenAICompatibleClient,
} from "@/plugins/llm/openai-compatible/index.js";
import type {
  LlmClient,
  LlmModelRegistry,
  LlmProviderInfo,
} from "@/plugins/llm/types.js";

export function createOpenRouterClient(
  apiKey: string,
  model: string,
): LlmClient {
  return createOpenAICompatibleClient(
    "https://openrouter.ai/api/v1",
    apiKey,
    model,
    "OpenRouter",
  );
}

function getString(obj: Record<string, unknown>, key: string): string {
  return String(obj[key] ?? "0");
}

function extractPricing(raw: unknown): { prompt: string; completion: string } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const pricing: Record<string, unknown> = Object.assign({}, raw);
    return {
      prompt: getString(pricing, "prompt"),
      completion: getString(pricing, "completion"),
    };
  }
  return { prompt: "0", completion: "0" };
}

export const openrouterProviderInfo: LlmProviderInfo = {
  id: "openrouter",
  name: "OpenRouter",
  description: "Global",
  instructions: [
    "1. Erstelle ein Konto auf [openrouter.ai](https://openrouter.ai) oder melde dich an",
    "2. Gehe zu [Credits](https://openrouter.ai/credits)",
    '3. Klicke auf "Buy Credits" und füge Guthaben hinzu',
    '4. Gehe zu [Keys](https://openrouter.ai/keys) → klicke auf "Create Key"',
    '5. Gib dem Schlüssel einen Namen (z. B. "Arbeitssuche") und klicke auf "Create"',
    "6. Kopiere den Schlüssel - er beginnt mit `sk-or-...`",
    "7. Füge ihn oben ein",
  ].join("\n"),
};

export function createOpenRouterModelRegistry(): LlmModelRegistry {
  return createModelRegistry("https://openrouter.ai/api/v1/models", (m) => ({
    id: String(m.id),
    name: String(m.name),
    pricing: extractPricing(m.pricing),
  }));
}
