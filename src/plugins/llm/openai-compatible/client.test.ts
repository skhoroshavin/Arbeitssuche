import { describe, it, expect, afterEach, vi } from "vitest"
import type { TypedSchema } from "@/plugins/llm"
import { createOpenAICompatibleClient } from "."

describe("OpenAICompatibleClient", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetch(body: unknown, status = 200) {
    globalThis.fetch = vi.fn<typeof fetch>(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      } as Response),
    )
  }

  describe("complete", () => {
    it("returns content from a successful response", async () => {
      mockFetch({
        choices: [{ message: { content: "Hello world" } }],
      })

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      )
      const result = await client.complete("prompt", 100)
      expect(result).toBe("Hello world")
    })

    it("throws on non-OK status", async () => {
      mockFetch({ error: "bad request" }, 400)

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      )
      await expect(() => client.complete("prompt", 100)).rejects.toThrow(
        /TestProvider API error \(400\)/,
      )
    })

    it("throws on empty response", async () => {
      mockFetch({ choices: [] })

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      )
      await expect(() => client.complete("prompt", 100)).rejects.toThrow(
        /TestProvider returned empty response/,
      )
    })
  })

  describe("completeJSON", () => {
    const testSchema: TypedSchema<{ score: number }> = {
      schema: {
        components: { schemas: {} },
        schema: {
          type: "object",
          properties: { score: { type: "number" } },
          required: ["score"],
        },
      },
      parse(input: string): { score: number } {
        const parsed: unknown = JSON.parse(input)
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("score" in parsed) ||
          typeof parsed.score !== "number"
        ) {
          throw new Error("Validation failed")
        }
        return parsed as { score: number }
      },
    }

    it("throws on truncated JSON", async () => {
      mockFetch({
        choices: [{ message: { content: '{"score": 42, "trun' } }],
      })

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      )
      await expect(() =>
        client.completeJSON("prompt", 100, testSchema),
      ).rejects.toThrow()
    })

    it("returns validated result from response content", async () => {
      mockFetch({
        choices: [{ message: { content: JSON.stringify({ score: 42 }) } }],
      })

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      )
      const result = await client.completeJSON("prompt", 100, testSchema)
      expect(result).toEqual({ score: 42 })
    })

    it("throws when validation fails", async () => {
      mockFetch({
        choices: [{ message: { content: JSON.stringify({ wrong: "field" }) } }],
      })

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "test-key",
        "test/model",
        "TestProvider",
      )
      await expect(() =>
        client.completeJSON("prompt", 100, testSchema),
      ).rejects.toThrow("Validation failed")
    })
  })

  describe("request format", () => {
    it("sends correct URL, headers, and body", async () => {
      mockFetch({
        choices: [{ message: { content: "ok" } }],
      })

      const client = createOpenAICompatibleClient(
        "https://example.com/v1",
        "my-api-key",
        "my/model",
        "TestProvider",
      )
      await client.complete("test prompt", 200)

      const fetchMock = vi.mocked(globalThis.fetch)
      expect(fetchMock.mock.calls.length).toBe(1)

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe("https://example.com/v1/chat/completions")

      const headers = options?.headers
      expect(headers).toBeDefined()
      expect(new Headers(headers).get("Authorization")).toBe(
        "Bearer my-api-key",
      )

      if (typeof options?.body !== "string") {
        throw new TypeError("Expected request body to be a string")
      }

      const parsedBody: unknown = JSON.parse(options.body)
      expect(isCompletionRequestBody(parsedBody)).toBe(true)
      if (!isCompletionRequestBody(parsedBody)) {
        throw new Error("Unexpected completion request shape")
      }

      const body = parsedBody as {
        model: string
        messages: Array<{ content: string }>
        max_tokens: number
      }
      expect(body.model).toBe("my/model")
      expect(body.messages[0].content).toBe("test prompt")
      expect(body.max_tokens).toBe(200)
    })
  })
})

function isCompletionRequestBody(value: unknown): value is {
  model: string
  messages: Array<{ content: string }>
  max_tokens: number
} {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.model !== "string" || typeof value.max_tokens !== "number") {
    return false
  }
  if (!Array.isArray(value.messages) || value.messages.length === 0) {
    return false
  }

  return value.messages.every(
    (item) => isRecord(item) && typeof item.content === "string",
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
