import {
  createOpenRouterClient,
  createOpenRouterModelRegistry,
} from "./openrouter/index.js";
import {
  createRequestyClient,
  createRequestyModelRegistry,
} from "./requesty/index.js";
import type { LlmClient, LlmModelRegistry } from "./types.js";

export type { LlmClient, JsonSchema } from "./types.js";

export function createLlmClient(
  provider: string,
  apiKey: string,
  model: string,
): LlmClient {
  switch (provider) {
    case "requesty":
      return createRequestyClient(apiKey, model);
    default:
      return createOpenRouterClient(apiKey, model);
  }
}

export function createModelRegistry(provider: string): LlmModelRegistry {
  switch (provider) {
    case "requesty":
      return createRequestyModelRegistry();
    default:
      return createOpenRouterModelRegistry();
  }
}
