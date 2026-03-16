import type { LlmModelInfo, LlmModelRegistry } from "@/plugins/llm/types.js";
import { createModelRegistry } from "@/plugins/llm/openai-compatible/models.js";

function splitRegion(id: string): { baseId: string; region: string | null } {
  const at = id.lastIndexOf("@");
  return at >= 0
    ? { baseId: id.slice(0, at), region: id.slice(at + 1) }
    : { baseId: id, region: null };
}

function deriveModelName(id: string): string {
  const slash = id.indexOf("/");
  const base = slash >= 0 ? id.slice(slash + 1) : id;
  const { baseId: withoutRegion } = splitRegion(base);
  const parts = withoutRegion.split("-");
  const result: string[] = [];
  for (const part of parts) {
    const isNumeric = /^\d/.test(part);
    const lastIsNumeric =
      result.length > 0 && /^\d/.test(result[result.length - 1]!);
    if (isNumeric && lastIsNumeric) {
      result[result.length - 1] += `.${part}`;
    } else {
      result.push(part.charAt(0).toUpperCase() + part.slice(1));
    }
  }
  return result.join(" ");
}

const EU_REGIONS = new Set([
  "francecentral",
  "swedencentral",
  "germanywestcentral",
  "westeurope",
  "northeurope",
  "uksouth",
  "ukwest",
  "italynorth",
  "polandcentral",
  "spaincentral",
]);

function isEuRegion(region: string): boolean {
  return EU_REGIONS.has(region) || region.startsWith("eu-");
}

function filterEuAndDeduplicate(models: LlmModelInfo[]): LlmModelInfo[] {
  const seen = new Map<string, LlmModelInfo>();
  for (const model of models) {
    const { baseId, region } = splitRegion(model.id);
    if (region !== null && !isEuRegion(region)) continue;
    if (!seen.has(baseId)) {
      seen.set(baseId, { ...model, id: baseId });
    }
  }
  return [...seen.values()];
}

class EuFilteredModelRegistry implements LlmModelRegistry {
  constructor(private readonly inner: LlmModelRegistry) {}

  async fetchModels(): Promise<LlmModelInfo[]> {
    const all = await this.inner.fetchModels();
    return filterEuAndDeduplicate(all);
  }
}

export function createRequestyModelRegistry(): LlmModelRegistry {
  const inner = createModelRegistry(
    "https://router.eu.requesty.ai/v1/models",
    (m) => ({
      id: String(m.id),
      name: typeof m.name === "string" ? m.name : deriveModelName(String(m.id)),
      pricing: {
        prompt: String(m.input_price ?? "0"),
        completion: String(m.output_price ?? "0"),
      },
    }),
  );

  return new EuFilteredModelRegistry(inner);
}
