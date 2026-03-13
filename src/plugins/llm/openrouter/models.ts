import type { LlmModelInfo, LlmModelRegistry } from "@/plugins/llm/types.js";

export function createOpenRouterModelRegistry(): LlmModelRegistry {
  return {
    async fetchModels(): Promise<LlmModelInfo[]> {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return [];
        const data: {
          data: Array<{
            id: string;
            name: string;
            pricing?: { prompt?: string; completion?: string };
          }>;
        } = await response.json();
        return data.data.map((m) => ({
          id: m.id,
          name: m.name,
          pricing: {
            prompt: m.pricing?.prompt ?? "0",
            completion: m.pricing?.completion ?? "0",
          },
        }));
      } catch {
        return [];
      }
    },
  };
}
