import { createOpenRouterClient } from "./openrouter/index.js";
import { createOpenRouterModelRegistry } from "./openrouter/models.js";
import { createRequestyClient } from "./requesty/index.js";
import { createRequestyModelRegistry } from "./requesty/models.js";
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
