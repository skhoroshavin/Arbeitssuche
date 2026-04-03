export interface TypedSchema<T> {
  schema: object
  parse: (input: string) => T
}

export interface LlmPricing {
  prompt: string
  completion: string
}

export interface LlmClient {
  complete(prompt: string, maxTokens: number): Promise<string>
  completeJSON<T>(
    prompt: string,
    maxTokens: number,
    schema: TypedSchema<T>,
  ): Promise<T>
  ping(): Promise<boolean>
}

export interface LlmModelInfo {
  id: string
  name: string
  pricing: LlmPricing
}

export interface LlmModelRegistry {
  fetchModels(): Promise<LlmModelInfo[]>
}

export interface LlmProviderInfo {
  id: string
  name: string
  description: string
  instructions: string
}
