export function ensureLlmAvailable(llm?: LlmClientLike): asserts llm is LlmClientLike {
  if (!llm) {
    throw new Error("No LLM API key configured")
  }
}

interface LlmClientLike {
  ping(): Promise<boolean>
}