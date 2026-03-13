import type { LlmClient } from "@/plugins/llm/types.js";

export type LlmClientFactory = (model: string) => LlmClient;
