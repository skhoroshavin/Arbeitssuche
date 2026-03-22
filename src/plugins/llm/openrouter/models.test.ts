import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createOpenRouterModelRegistry } from "./index.js";

describe("createOpenRouterModelRegistry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(body: unknown) {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch;
  }

  it("returns models with non-undefined names", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          pricing: { prompt: "0.000003", completion: "0.000015" },
        },
        {
          id: "google/gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          pricing: { prompt: "0", completion: "0" },
        },
      ],
    });

    const registry = createOpenRouterModelRegistry();
    const models = await registry.fetchModels();

    for (const model of models) {
      assert.notEqual(model.name, "undefined");
      assert.ok(model.name.length > 0);
    }
  });

  it("extracts nested pricing fields", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          pricing: { prompt: "0.000003", completion: "0.000015" },
        },
      ],
    });

    const registry = createOpenRouterModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models[0]!.pricing.prompt, "0.000003");
    assert.equal(models[0]!.pricing.completion, "0.000015");
  });

  it("defaults pricing to 0 when missing", async () => {
    mockFetch({
      data: [{ id: "test/model", name: "Test Model" }],
    });

    const registry = createOpenRouterModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models[0]!.pricing.prompt, "0");
    assert.equal(models[0]!.pricing.completion, "0");
  });
});
