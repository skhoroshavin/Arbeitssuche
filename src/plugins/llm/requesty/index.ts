import type {
  LlmClient,
  LlmModelInfo,
  LlmModelRegistry,
  LlmProvider,
} from "@/plugins/llm"
import {
  createOpenAICompatibleClient,
  createModelRegistry,
  normalizeFlatPricing,
} from "@/plugins/llm/openai-compatible/index.js"

export const RequestyProvider: LlmProvider = {
  id: "requesty",
  name: "Requesty",
  description: "EU-Datenverarbeitung",
  instructions: [
    "1. Erstelle ein Konto auf [requesty.ai](https://requesty.ai) oder melde dich an",
    '2. Gehe zu [Settings](https://app.requesty.ai/settings) → klicke auf "Add Credits" und füge Guthaben hinzu',
    '3. Klicke in der Seitenleiste auf "[API Keys](https://app.requesty.ai/api-keys)"',
    '4. Klicke auf "Create API Key" und gib einen Namen ein (z.B. "Arbeitssuche")',
    "5. Kopiere den Schlüssel",
    "6. Füge ihn oben ein",
  ].join("\n"),
  createClient(apiKey: string, model: string): LlmClient {
    return createOpenAICompatibleClient(
      "https://router.eu.requesty.ai/v1",
      apiKey,
      model,
      "Requesty",
    )
  },
  createModelRegistry(): LlmModelRegistry {
    const inner = createModelRegistry(
      "https://router.eu.requesty.ai/v1/models",
      (m) => ({
        id: String(m.id),
        name:
          typeof m.name === "string" ? m.name : deriveModelName(String(m.id)),
        pricing: normalizeFlatPricing(m),
      }),
    )
    return new EuFilteredModelRegistry(inner)
  },
  async ping(apiKey: string): Promise<boolean> {
    return createOpenAICompatibleClient(
      "https://router.eu.requesty.ai/v1",
      apiKey,
      "",
      "Requesty",
    ).ping()
  },
}

class EuFilteredModelRegistry implements LlmModelRegistry {
  constructor(private readonly inner: LlmModelRegistry) {}

  async fetchModels(): Promise<LlmModelInfo[]> {
    const all = await this.inner.fetchModels()
    return filterEuAndDeduplicate(all)
  }
}

function filterEuAndDeduplicate(models: LlmModelInfo[]): LlmModelInfo[] {
  const seen = new Map<string, LlmModelInfo>()
  for (const model of models) {
    const { baseId, region } = splitRegion(model.id)
    if (region !== undefined && !isEuRegion(region)) continue
    if (!seen.has(baseId)) {
      seen.set(baseId, { ...model, id: baseId })
    }
  }
  return [...seen.values()]
}

function deriveModelName(id: string): string {
  const slash = id.indexOf("/")
  const base = slash === -1 ? id : id.slice(slash + 1)
  const { baseId: withoutRegion } = splitRegion(base)
  const parts = withoutRegion.split("-")
  const result: string[] = []
  for (const part of parts) {
    const isNumeric = /^\d/.test(part)
    const previous = result.at(-1)
    if (isNumeric && previous && /^\d/.test(previous)) {
      result[result.length - 1] += `.${part}`
    } else {
      result.push(part.charAt(0).toUpperCase() + part.slice(1))
    }
  }
  return result.join(" ")
}

function isEuRegion(region: string): boolean {
  return EU_REGIONS.has(region) || region.startsWith("eu-")
}

function splitRegion(id: string): { baseId: string; region?: string } {
  const at = id.lastIndexOf("@")
  return at === -1
    ? { baseId: id, region: undefined }
    : { baseId: id.slice(0, at), region: id.slice(at + 1) }
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
])
