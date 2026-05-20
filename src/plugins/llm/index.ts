import { OpenRouterProvider } from "./openrouter"

import { RequestyProvider } from "./requesty"

export interface TypedSchema<T> {
  schema: object
  parse: (input: string) => T
}

export function getLlmProviders(): readonly LlmProviderInfo[] {
  return PROVIDERS.map(({ id, name, description, instructions }) => ({
    id,
    name,
    description,
    instructions,
  }))
}

export type LlmProviderInfo = Pick<
  LlmProvider,
  "id" | "name" | "description" | "instructions"
>

export function getLlmProvider(providerId: string): LlmProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerId}`)
  }
  return provider
}

export interface LlmProvider {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly instructions: string
  createClient(apiKey: string, model: string): LlmClient
  createModelRegistry(): LlmModelRegistry
  ping(apiKey: string): Promise<boolean>
}

export interface LlmClient {
  complete(
    prompt: string,
    maxTokens: number,
    signal?: AbortSignal,
  ): Promise<string>
  completeJSON<T>(
    prompt: string,
    maxTokens: number,
    schema: TypedSchema<T>,
    signal?: AbortSignal,
  ): Promise<T>
  ping(): Promise<boolean>
}

export interface LlmModelRegistry {
  fetchModels(): Promise<LlmModelInfo[]>
}

export interface LlmModelInfo {
  id: string
  name: string
  pricing: LlmPricing
}

export interface LlmPricing {
  prompt: string
  completion: string
}

const PROVIDERS: readonly LlmProvider[] = [OpenRouterProvider, RequestyProvider]
