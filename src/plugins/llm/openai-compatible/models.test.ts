import { describe, it, expect, afterEach, vi } from "vitest";
import { createModelRegistry } from "./index";

describe("createModelRegistry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(body: unknown, status = 200) {
    globalThis.fetch = vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch;
  }

  it("normalizes OpenRouter-style pricing", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          pricing: { prompt: "0.000003", completion: "0.000015" },
        },
      ],
    });

    const registry = createModelRegistry(
      "https://openrouter.ai/api/v1/models",
      (m) => ({
        id: String(m.id),
        name: String(m.name),
        pricing: {
          prompt: String(
            (m.pricing as Record<string, unknown> | undefined)?.prompt ?? "0",
          ),
          completion: String(
            (m.pricing as Record<string, unknown> | undefined)?.completion ??
              "0",
          ),
        },
      }),
    );

    const models = await registry.fetchModels();
    expect(models.length).toBe(1);
    expect(models[0]!.id).toBe("anthropic/claude-sonnet-4");
    expect(models[0]!.pricing.prompt).toBe("0.000003");
    expect(models[0]!.pricing.completion).toBe("0.000015");
  });

  it("normalizes Requesty-style pricing (input_price/output_price)", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          input_price: "0.000003",
          output_price: "0.000015",
        },
      ],
    });

    const registry = createModelRegistry(
      "https://router.eu.requesty.ai/v1/models",
      (m) => ({
        id: String(m.id),
        name: String(m.id),
        pricing: {
          prompt: String(m.input_price ?? "0"),
          completion: String(m.output_price ?? "0"),
        },
      }),
    );

    const models = await registry.fetchModels();
    expect(models.length).toBe(1);
    expect(models[0]!.id).toBe("anthropic/claude-sonnet-4");
    expect(models[0]!.pricing.prompt).toBe("0.000003");
    expect(models[0]!.pricing.completion).toBe("0.000015");
  });

  it("returns empty array on network error", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("Network error");
    }) as unknown as typeof fetch;

    const registry = createModelRegistry("https://example.com/models", (m) => ({
      id: String(m.id),
      name: String(m.name),
      pricing: { prompt: "0", completion: "0" },
    }));

    const models = await registry.fetchModels();
    expect(models).toEqual([]);
  });

  it("returns empty array on non-OK response", async () => {
    mockFetch({}, 500);

    const registry = createModelRegistry("https://example.com/models", (m) => ({
      id: String(m.id),
      name: String(m.name),
      pricing: { prompt: "0", completion: "0" },
    }));

    const models = await registry.fetchModels();
    expect(models).toEqual([]);
  });
});
