import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createOpenAICompatibleClient } from "./index.js";

describe("OpenAICompatibleClient", () => {
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
      assert.equal(result, "Hello world");
    });

    it("throws on non-OK status", async () => {
      mockFetch({ error: "bad request" }, 400);

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      );
      await assert.rejects(
        () => client.complete("prompt", 100),
        (err: Error) => {
          assert.match(err.message, /TestProvider API error \(400\)/);
          return true;
        },
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
      await assert.rejects(
        () => client.complete("prompt", 100),
        (err: Error) => {
          assert.match(err.message, /TestProvider returned empty response/);
          return true;
        },
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
      assert.equal(result, null);
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
      assert.deepEqual(result, { score: 42 });
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

      const fetchMock = globalThis.fetch as unknown as ReturnType<
        typeof mock.fn
      >;
      assert.equal(fetchMock.mock.calls.length, 1);

      const [url, options] = fetchMock.mock.calls[0]!.arguments as [
        string,
        RequestInit,
      ];
      assert.equal(url, "https://example.com/v1/chat/completions");
      assert.equal(
        (options.headers as Record<string, string>)["Authorization"],
        "Bearer my-api-key",
      );

      const body = JSON.parse(options.body as string);
      assert.equal(body.model, "my/model");
      assert.equal(body.messages[0].content, "test prompt");
      assert.equal(body.max_tokens, 200);
    });
  });
});
