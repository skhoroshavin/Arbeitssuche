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
    "3. Klicke auf \u201EBuy Credits\u201C und f\u00fcge Guthaben hinzu (ab $5)",
    "4. Gehe zu [Keys](https://openrouter.ai/keys) \u2192 klicke auf \u201ECreate Key\u201C",
    "5. Gib dem Schl\u00fcssel einen Namen (z.\u202fB. \u201EArbeitssuche\u201C) und klicke auf \u201ECreate\u201C",
    "6. Kopiere den Schl\u00fcssel \u2014 er beginnt mit `sk-or-\u2026`",
    "7. F\u00fcge ihn oben ein",
  ].join("\n"),
};

export function createOpenRouterModelRegistry(): LlmModelRegistry {
  return createModelRegistry("https://openrouter.ai/api/v1/models", (m) => ({
    id: String(m.id),
    name: String(m.name),
    pricing: extractPricing(m.pricing),
  }));
}
