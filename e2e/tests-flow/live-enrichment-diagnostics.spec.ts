import { test, expect } from "../fixtures.js"

test.describe("Live enrichment diagnostics", () => {
  test("shows the configured live provider state for E2E", async ({ api }) => {
    const secrets = await api.getSecrets()
    const config = await api.getConfig()
    const llmProviderStatus = await api.testLlmProvider(config.provider)
    const mapsProviderStatus = await api.testCommuteProvider("google-maps")
    const models = await api.getLlmModels()

    expect(secrets.openrouterApiKey?.length).toBeGreaterThan(0)
    expect(secrets.googleMapsApiKey?.length).toBeGreaterThan(0)

    expect(config.provider).toBe("openrouter")
    expect(config.assessmentModel).toBeTruthy()
    expect(config.coverLetterModel).toBeTruthy()
    expect(config.consultationModel).toBeTruthy()

    expect(llmProviderStatus.ok).toBe(true)
    expect(mapsProviderStatus.ok).toBe(true)

    expect(models.length).toBeGreaterThan(0)
    expect(models.some((model) => model.id === config.assessmentModel)).toBe(
      true,
    )
    expect(models.some((model) => model.id === config.coverLetterModel)).toBe(
      true,
    )
  })
})
