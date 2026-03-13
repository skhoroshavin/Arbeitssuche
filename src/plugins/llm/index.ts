import { createOpenRouterClient } from "./openrouter/index.js";
import type { LlmClient } from "./types.js";

export type { LlmClient, JsonSchema } from "./types.js";

export function createLlmClient(apiKey: string, model: string): LlmClient {
  return createOpenRouterClient(apiKey, model);
}
