import type { JsonSchema, LlmClient } from "@/plugins/llm/types.js";

class OpenRouterClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(prompt: string, maxTokens: number): Promise<string> {
    return this.fetchCompletion(prompt, maxTokens);
  }

  async completeJSON<T = unknown>(
    prompt: string,
    maxTokens: number,
    schema: JsonSchema,
  ): Promise<T | null> {
    const content = await this.fetchCompletion(prompt, maxTokens, {
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", strict: true, schema },
      },
    });
    return JSON.parse(content);
  }

  private async fetchCompletion(
    prompt: string,
    maxTokens: number,
    extraBody?: Record<string, unknown>,
  ): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        ...extraBody,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${text}`);
    }

    const json: {
      choices?: Array<{ message?: { content?: string } }>;
    } = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned empty response");
    }
    return content;
  }
}

export function createOpenRouterClient(
  apiKey: string,
  model: string,
): LlmClient {
  return new OpenRouterClient(apiKey, model);
}
