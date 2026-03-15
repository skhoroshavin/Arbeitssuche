import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createRequestyModelRegistry } from "./models.js";

describe("createRequestyModelRegistry", () => {
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

  it("derives name from id when name field is missing", async () => {
    mockFetch({
      data: [
        {
          id: "bedrock/claude-3-7-sonnet@us-east-2",
          input_price: 0.000003,
          output_price: 0.000015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models[0]!.name, "Claude 3.7 Sonnet");
    assert.notEqual(models[0]!.name, "undefined");
  });

  it("returns models with non-undefined names", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          input_price: 0.000003,
          output_price: 0.000015,
        },
        {
          id: "google/gemini-2.5-flash",
          input_price: 0,
          output_price: 0,
        },
        {
          id: "bedrock/claude-3-7-sonnet@us-east-2",
          input_price: 0.000003,
          output_price: 0.000015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    for (const model of models) {
      assert.notEqual(model.name, "undefined");
      assert.ok(model.name.length > 0);
    }
  });

  it("uses name field when present", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          input_price: 0.000003,
          output_price: 0.000015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models[0]!.name, "Claude Sonnet 4");
  });

  it("maps input_price/output_price to pricing fields", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          input_price: 0.000003,
          output_price: 0.000015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models[0]!.pricing.prompt, "0.000003");
    assert.equal(models[0]!.pricing.completion, "0.000015");
  });
});
