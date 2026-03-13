export interface JsonSchema {
  type?:
    | "object"
    | "array"
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "null";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: readonly string[];
  additionalProperties?: boolean;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  const?: unknown;
  description?: string;
}

export interface LlmClient {
  complete(prompt: string, maxTokens: number): Promise<string>;
  completeJSON<T = unknown>(
    prompt: string,
    maxTokens: number,
    schema: JsonSchema,
  ): Promise<T | null>;
}

export interface LlmModelInfo {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
}

export interface LlmModelRegistry {
  fetchModels(): Promise<LlmModelInfo[]>;
}
