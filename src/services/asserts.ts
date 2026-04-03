import type { LlmClient } from "@/plugins/llm/types.js"

export function ensureLlmAvailable(llm?: LlmClient): asserts llm is LlmClient {
  if (!llm) {
    throw new Error("No LLM API key configured")
  }
}
