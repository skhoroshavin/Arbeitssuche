import type {
  LlmClient,
  LlmModelInfo,
  LlmModelRegistry,
} from "@/plugins/llm/types.js";

class StubLlmClient implements LlmClient {
  private textIndex = 0;
  private jsonIndex = 0;

  constructor(
    private readonly textResponses?: (string | Error)[],
    private readonly jsonResponses?: (unknown | Error)[],
  ) {}

  async complete(): Promise<string> {
    if (this.textResponses && this.textIndex < this.textResponses.length) {
      const value = this.textResponses[this.textIndex++];
      if (value instanceof Error) throw value;
      return value;
    }
    return "stub response";
  }

  async completeJSON<T = unknown>(): Promise<T | null> {
    if (this.jsonResponses && this.jsonIndex < this.jsonResponses.length) {
      const value = this.jsonResponses[this.jsonIndex++];
      if (value instanceof Error) throw value;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- generic stub return
      return value as T;
    }
    return null;
  }
}

class StubLlmModelRegistry implements LlmModelRegistry {
  constructor(private readonly models?: LlmModelInfo[]) {}

  async fetchModels(): Promise<LlmModelInfo[]> {
    return (
      this.models ?? [
        {
          id: "stub/model",
          name: "Stub Model",
          pricing: { prompt: "0", completion: "0" },
        },
      ]
    );
  }
}

export function createStubLlmClient(options?: {
  text?: (string | Error)[];
  json?: (unknown | Error)[];
}): LlmClient {
  return new StubLlmClient(options?.text, options?.json);
}

export function createStubLlmModelRegistry(
  models?: LlmModelInfo[],
): LlmModelRegistry {
  return new StubLlmModelRegistry(models);
}
