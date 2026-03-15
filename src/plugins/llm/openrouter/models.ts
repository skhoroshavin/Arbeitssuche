import type { LlmModelRegistry } from "@/plugins/llm/types.js";
import { createModelRegistry } from "@/plugins/llm/openai-compatible/models.js";

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

export function createOpenRouterModelRegistry(): LlmModelRegistry {
  return createModelRegistry("https://openrouter.ai/api/v1/models", (m) => ({
    id: String(m.id),
    name: String(m.name),
    pricing: extractPricing(m.pricing),
  }));
}
