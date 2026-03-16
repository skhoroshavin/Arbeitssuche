import type { JsonSchema, LlmClient } from "@/plugins/llm/types.js";

class OpenAICompatibleClient implements LlmClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly providerName: string,
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
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
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
      throw new Error(
        `${this.providerName} API error (${res.status}): ${text}`,
      );
    }

    const json: {
      choices?: Array<{ message?: { content?: string } }>;
    } = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${this.providerName} returned empty response`);
    }
    return content;
  }
}

export function createOpenAICompatibleClient(
  baseUrl: string,
  apiKey: string,
  model: string,
  providerName: string,
): LlmClient {
  return new OpenAICompatibleClient(baseUrl, apiKey, model, providerName);
}
