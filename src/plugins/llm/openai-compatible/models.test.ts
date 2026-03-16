import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createModelRegistry } from "./models.js";

describe("createModelRegistry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(body: unknown, status = 200) {
    globalThis.fetch = mock.fn(async () => ({
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
    assert.equal(models.length, 1);
    assert.equal(models[0]!.id, "anthropic/claude-sonnet-4");
    assert.equal(models[0]!.pricing.prompt, "0.000003");
    assert.equal(models[0]!.pricing.completion, "0.000015");
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
    assert.equal(models.length, 1);
    assert.equal(models[0]!.id, "anthropic/claude-sonnet-4");
    assert.equal(models[0]!.pricing.prompt, "0.000003");
    assert.equal(models[0]!.pricing.completion, "0.000015");
  });

  it("returns empty array on network error", async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error("Network error");
    }) as unknown as typeof fetch;

    const registry = createModelRegistry("https://example.com/models", (m) => ({
      id: String(m.id),
      name: String(m.name),
      pricing: { prompt: "0", completion: "0" },
    }));

    const models = await registry.fetchModels();
    assert.deepEqual(models, []);
  });

  it("returns empty array on non-OK response", async () => {
    mockFetch({}, 500);

    const registry = createModelRegistry("https://example.com/models", (m) => ({
      id: String(m.id),
      name: String(m.name),
      pricing: { prompt: "0", completion: "0" },
    }));

    const models = await registry.fetchModels();
    assert.deepEqual(models, []);
  });
});
