import type { LlmClient } from "@/plugins/llm"

export type LlmClientFactory = (model: string) => LlmClient
