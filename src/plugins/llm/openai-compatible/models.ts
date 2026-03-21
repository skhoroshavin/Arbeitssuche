import type { LlmModelInfo, LlmModelRegistry } from "@/plugins/llm/types.js";

type ModelNormalizer = (raw: Record<string, unknown>) => LlmModelInfo;

class OpenAICompatibleModelRegistry implements LlmModelRegistry {
  constructor(
    private readonly url: string,
    private readonly normalize: ModelNormalizer,
  ) {}

  async fetchModels(): Promise<LlmModelInfo[]> {
    try {
      const response = await fetch(this.url, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return [];
      const data: { data: Record<string, unknown>[] } = await response.json();
      return data.data.map(this.normalize);
    } catch {
      return [];
    }
  }
}

export function createModelRegistry(
  url: string,
  normalize: ModelNormalizer,
): LlmModelRegistry {
  return new OpenAICompatibleModelRegistry(url, normalize);
}
