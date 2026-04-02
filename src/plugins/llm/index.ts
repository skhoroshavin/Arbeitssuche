import {
  createOpenRouterClient,
  createOpenRouterModelRegistry,
  openrouterProviderInfo,
} from "./openrouter/index.js";
import {
  createRequestyClient,
  createRequestyModelRegistry,
  requestyProviderInfo,
} from "./requesty/index.js";
import type { LlmClient, LlmModelRegistry, LlmProviderInfo } from "./types.js";

export function getLlmProviders(): LlmProviderInfo[] {
  return [openrouterProviderInfo, requestyProviderInfo];
}

export function createLlmClientForPing(
  provider: string,
  apiKey: string,
): LlmClient {
  // Model is not needed for ping, use a dummy value
  return createLlmClient(provider, apiKey, "");
}

export function createLlmClient(
  provider: string,
  apiKey: string,
  model: string,
): LlmClient {
  switch (provider) {
    case "requesty": {
      return createRequestyClient(apiKey, model);
    }
    default: {
      return createOpenRouterClient(apiKey, model);
    }
  }
}

export function createModelRegistry(provider: string): LlmModelRegistry {
  switch (provider) {
    case "requesty": {
      return createRequestyModelRegistry();
    }
    default: {
      return createOpenRouterModelRegistry();
    }
  }
}
