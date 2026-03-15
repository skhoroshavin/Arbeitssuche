import { createOpenAICompatibleClient } from "@/plugins/llm/openai-compatible/client.js";
import type { LlmClient } from "@/plugins/llm/types.js";

export function createRequestyClient(apiKey: string, model: string): LlmClient {
  return createOpenAICompatibleClient(
    "https://router.eu.requesty.ai/v1",
    apiKey,
    model,
    "Requesty",
  );
}
