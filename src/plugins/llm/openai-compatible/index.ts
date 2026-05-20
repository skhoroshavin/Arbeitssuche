import { z } from "zod"

import type {
  LlmClient,
  LlmModelInfo,
  LlmModelRegistry,
  LlmPricing,
  TypedSchema,
} from "@/plugins/llm"

import { toStrictSchema } from "./strict-schema.js"

export { toStrictSchema } from "./strict-schema.js"

export function normalizeNestedPricing(raw: unknown): LlmPricing {
  if (!isRecord(raw)) return { prompt: "0", completion: "0" }
  return {
    prompt: normalizePrice(raw.prompt),
    completion: normalizePrice(raw.completion),
  }
}

export function normalizeFlatPricing(raw: Record<string, unknown>): LlmPricing {
  return {
    prompt: normalizePrice(raw.input_price),
    completion: normalizePrice(raw.output_price),
  }
}

export function createOpenAICompatibleClient(
  baseUrl: string,
  apiKey: string,
  model: string,
  providerName: string,
): LlmClient {
  return new OpenAICompatibleClient(baseUrl, apiKey, model, providerName)
}

export function createModelRegistry(
  url: string,
  normalize: ModelNormalizer,
): LlmModelRegistry {
  return new OpenAICompatibleModelRegistry(url, normalize)
}

type ModelNormalizer = (raw: Record<string, unknown>) => LlmModelInfo

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizePrice(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "0"
}

class OpenAICompatibleClient implements LlmClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly providerName: string,
  ) {}

  async completeJSON<T>(
    prompt: string,
    maxTokens: number,
    schema: TypedSchema<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const content = await this.fetchCompletion(
      prompt,
      maxTokens,
      {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "response",
            strict: true,
            schema: toStrictSchema(schema.schema),
          },
        },
      },
      signal,
    )
    return schema.parse(content)
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      })
      await response.text()
      return response.ok
    } catch {
      return false
    }
  }

  async complete(
    prompt: string,
    maxTokens: number,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.fetchCompletion(prompt, maxTokens, undefined, signal)
  }

  private async fetchCompletion(
    prompt: string,
    maxTokens: number,
    extraBody?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<string> {
    const combinedSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(120_000)])
      : AbortSignal.timeout(120_000)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        ...extraBody,
      }),
      signal: combinedSignal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(
        `${this.providerName} API error (${response.status}): ${text}`,
      )
    }

    const json = CompletionResponseSchema.parse(
      JSON.parse(await response.text()),
    )
    const content = json.choices?.[0]?.message?.content
    if (!content) {
      throw new Error(`${this.providerName} returned empty response`)
    }
    return content
  }
}

const CompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().optional() }).optional(),
      }),
    )
    .optional(),
})

class OpenAICompatibleModelRegistry implements LlmModelRegistry {
  constructor(
    private readonly url: string,
    private readonly normalize: ModelNormalizer,
  ) {}

  async fetchModels(): Promise<LlmModelInfo[]> {
    try {
      const response = await fetch(this.url, {
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return []
      const data = ModelListResponseSchema.parse(
        JSON.parse(await response.text()),
      )
      return data.data.map((raw) => this.normalize(raw))
    } catch {
      return []
    }
  }
}

const ModelListResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
})
