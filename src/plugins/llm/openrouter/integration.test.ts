import { describe, test, expect } from "vitest"
import { OpenRouterProvider } from "."
import { requireEnv } from "@/test-helpers"

const apiKey = requireEnv("OPENROUTER_API_KEY")

describe("OpenRouter (live)", () => {
  test("ping returns true with a valid API key", async () => {
    const result = await OpenRouterProvider.ping(apiKey)
    expect(result).toBe(true)
  })

  test("createModelRegistry returns available models", async () => {
    const registry = OpenRouterProvider.createModelRegistry()
    const models = await registry.fetchModels()

    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(typeof model.id).toBe("string")
      expect(model.id.length).toBeGreaterThan(0)
      expect(typeof model.name).toBe("string")
      expect(model.name.length).toBeGreaterThan(0)
    }
  })

  test("createClient completes a simple prompt", async () => {
    const client = OpenRouterProvider.createClient(
      apiKey,
      "google/gemini-2.5-flash-lite",
    )
    const result = await client.complete(
      'Reply with exactly "pong" and nothing else.',
      10,
    )

    expect(result.toLowerCase()).toContain("pong")
  })
})
