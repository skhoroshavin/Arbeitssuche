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
          id: "bedrock/claude-3-7-sonnet@eu-west-1",
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

  it("filters out non-EU models and keeps regionless ones", async () => {
    mockFetch({
      data: [
        {
          id: "azure/gpt-4.1-mini@westus3",
          input_price: 0.0000004,
          output_price: 0.0000016,
        },
        {
          id: "azure/gpt-4.1-mini@eastus2",
          input_price: 0.0000004,
          output_price: 0.0000016,
        },
        {
          id: "azure/gpt-4.1-mini@francecentral",
          input_price: 0.0000004,
          output_price: 0.0000016,
        },
        {
          id: "anthropic/claude-sonnet-4",
          input_price: 0.000003,
          output_price: 0.000015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models.length, 2);
    assert.equal(models[0]!.id, "azure/gpt-4.1-mini");
    assert.equal(models[1]!.id, "anthropic/claude-sonnet-4");
  });

  it("keeps models from all recognized EU regions", async () => {
    mockFetch({
      data: [
        { id: "azure/model-a@francecentral", input_price: 0, output_price: 0 },
        {
          id: "azure/model-b@swedencentral",
          input_price: 0,
          output_price: 0,
        },
        { id: "azure/model-c@uksouth", input_price: 0, output_price: 0 },
        { id: "azure/model-d@eu-west-1", input_price: 0, output_price: 0 },
        { id: "azure/model-e@eu-central-1", input_price: 0, output_price: 0 },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models.length, 5);
  });

  it("deduplicates regional variants keeping the first EU match", async () => {
    mockFetch({
      data: [
        {
          id: "azure/gpt-4.1@francecentral",
          input_price: 0.000002,
          output_price: 0.000008,
        },
        {
          id: "azure/gpt-4.1@swedencentral",
          input_price: 0.000002,
          output_price: 0.000008,
        },
        {
          id: "azure/gpt-4.1@uksouth",
          input_price: 0.000002,
          output_price: 0.000008,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    assert.equal(models.length, 1);
    assert.equal(models[0]!.id, "azure/gpt-4.1");
  });
});
