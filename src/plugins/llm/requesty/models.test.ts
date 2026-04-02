import { describe, it, expect, afterEach, vi } from "vitest";
import { createRequestyModelRegistry } from "./index";

describe("createRequestyModelRegistry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(body: unknown) {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      }),
    ) as unknown as typeof fetch;
  }

  it("derives name from id when name field is missing", async () => {
    mockFetch({
      data: [
        {
          id: "bedrock/claude-3-7-sonnet@eu-west-1",
          input_price: 0.000_003,
          output_price: 0.000_015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    expect(models[0].name).toBe("Claude 3.7 Sonnet");
    expect(models[0].name).not.toBe("undefined");
  });

  it("uses name field when present", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          input_price: 0.000_003,
          output_price: 0.000_015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    expect(models[0].name).toBe("Claude Sonnet 4");
  });

  it("maps input_price/output_price to pricing fields", async () => {
    mockFetch({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          input_price: 0.000_003,
          output_price: 0.000_015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    expect(models[0].pricing.prompt).toBe("0.000003");
    expect(models[0].pricing.completion).toBe("0.000015");
  });

  it("filters out non-EU models and keeps regionless ones", async () => {
    mockFetch({
      data: [
        {
          id: "azure/gpt-4.1-mini@westus3",
          input_price: 0.000_000_4,
          output_price: 0.000_001_6,
        },
        {
          id: "azure/gpt-4.1-mini@eastus2",
          input_price: 0.000_000_4,
          output_price: 0.000_001_6,
        },
        {
          id: "azure/gpt-4.1-mini@francecentral",
          input_price: 0.000_000_4,
          output_price: 0.000_001_6,
        },
        {
          id: "anthropic/claude-sonnet-4",
          input_price: 0.000_003,
          output_price: 0.000_015,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    expect(models.length).toBe(2);
    expect(models[0].id).toBe("azure/gpt-4.1-mini");
    expect(models[1].id).toBe("anthropic/claude-sonnet-4");
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

    expect(models.length).toBe(5);
  });

  it("deduplicates regional variants keeping the first EU match", async () => {
    mockFetch({
      data: [
        {
          id: "azure/gpt-4.1@francecentral",
          input_price: 0.000_002,
          output_price: 0.000_008,
        },
        {
          id: "azure/gpt-4.1@swedencentral",
          input_price: 0.000_002,
          output_price: 0.000_008,
        },
        {
          id: "azure/gpt-4.1@uksouth",
          input_price: 0.000_002,
          output_price: 0.000_008,
        },
      ],
    });

    const registry = createRequestyModelRegistry();
    const models = await registry.fetchModels();

    expect(models.length).toBe(1);
    expect(models[0].id).toBe("azure/gpt-4.1");
  });
});
