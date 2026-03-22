import { describe, it, expect, afterEach, vi } from "vitest";
import { createOpenAICompatibleClient } from "./index";

describe("OpenAICompatibleClient", () => {
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

  describe("complete", () => {
    it("returns content from a successful response", async () => {
      mockFetch({
        choices: [{ message: { content: "Hello world" } }],
      });

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      );
      const result = await client.complete("prompt", 100);
      expect(result).toBe("Hello world");
    });

    it("throws on non-OK status", async () => {
      mockFetch({ error: "bad request" }, 400);

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      );
      await expect(() => client.complete("prompt", 100)).rejects.toThrow(
        /TestProvider API error \(400\)/,
      );
    });

    it("throws on empty response", async () => {
      mockFetch({ choices: [] });

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      );
      await expect(() => client.complete("prompt", 100)).rejects.toThrow(
        /TestProvider returned empty response/,
      );
    });
  });

  describe("completeJSON", () => {
    it("returns null on truncated JSON", async () => {
      mockFetch({
        choices: [{ message: { content: '{"score": 42, "trun' } }],
      });

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      );
      const result = await client.completeJSON("prompt", 100, {
        type: "object",
        properties: { score: { type: "number" } },
      });
      expect(result).toBe(null);
    });

    it("parses JSON from response content", async () => {
      mockFetch({
        choices: [{ message: { content: JSON.stringify({ score: 42 }) } }],
      });

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      );
      const result = await client.completeJSON<{ score: number }>(
        "prompt",
        100,
        { type: "object", properties: { score: { type: "number" } } },
      );
      expect(result).toEqual({ score: 42 });
    });
  });

  describe("request format", () => {
    it("sends correct URL, headers, and body", async () => {
      mockFetch({
        choices: [{ message: { content: "ok" } }],
      });

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "my-api-key",
        "my/model",
        "TestProvider",
      );
      await client.complete("test prompt", 200);

      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
      expect(fetchMock.mock.calls.length).toBe(1);

      const [url, options] = fetchMock.mock.calls[0]! as [string, RequestInit];
      expect(url).toBe("https://example.com/v1/chat/completions");
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer my-api-key",
      );

      const body = JSON.parse(options.body as string);
      expect(body.model).toBe("my/model");
      expect(body.messages[0].content).toBe("test prompt");
      expect(body.max_tokens).toBe(200);
    });
  });
});
