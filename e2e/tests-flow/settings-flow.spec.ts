import { test, expect } from "../fixtures.js"

const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"
const REQUESTY_LABEL = "Requesty API-Schlüssel"
const MAPS_LABEL = "Google Maps API-Schlüssel"

test.describe("Settings Flow", () => {
  let originalSecrets: Record<string, string>

  test.beforeEach(async ({ api }) => {
    originalSecrets = await api.getSecrets()
  })

  test.afterEach(async ({ api }) => {
    await api.saveSecrets(originalSecrets)
  })

  test("renders masked tokens for set keys", async ({ api, settingsPage }) => {
    await api.saveSecrets({
      openrouterApiKey: "sk-or-long-token-value-here",
      googleMapsApiKey: "maps-long-token-val",
    })
    await settingsPage.goto()

    await expect(settingsPage.heading).toBeVisible()
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    await expect(settingsPage.clearButton(OPENROUTER_LABEL)).toBeVisible()

    // Maps key is on the Karten page
    await settingsPage.navLink("Karten").click()
    await expect(settingsPage.replaceButton(MAPS_LABEL)).toBeVisible()
  })

  test("unset tokens show 'Nicht gesetzt' with add button", async ({
    api,
    settingsPage,
  }) => {
    await api.saveSecrets({})
    await settingsPage.goto()

    await expect(settingsPage.addButton(OPENROUTER_LABEL)).toBeVisible()

    await settingsPage.navLink("Karten").click()
    await expect(settingsPage.addButton(MAPS_LABEL)).toBeVisible()
  })

  test("can replace a token", async ({ api, settingsPage }) => {
    await api.saveSecrets({ openrouterApiKey: "sk-or-old-value-here" })
    await settingsPage.goto()

    await settingsPage.replaceAndSave(
      OPENROUTER_LABEL,
      "sk-or-new-replacement-key",
    )

    // Should return to display mode with updated mask
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    // Verify the new value was actually saved
    const secrets = await api.getSecrets()
    expect(secrets.openrouterApiKey).toBe("sk-or-new-replacement-key")
  })

  test("cancel discards editing", async ({ api, settingsPage }) => {
    await api.saveSecrets({ openrouterApiKey: "sk-or-keep-this-value" })
    await settingsPage.goto()

    await settingsPage.replaceButton(OPENROUTER_LABEL).click()
    await settingsPage.tokenInput(OPENROUTER_LABEL).fill("sk-or-should-discard")
    await settingsPage.cancelButton(OPENROUTER_LABEL).click()

    // Should return to display mode, original still intact
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    const secrets = await api.getSecrets()
    expect(secrets.openrouterApiKey).toBe("sk-or-keep-this-value")
  })

  test("can clear a token", async ({ api, settingsPage }) => {
    await api.saveSecrets({ openrouterApiKey: "sk-or-will-be-cleared" })
    await settingsPage.goto()

    await settingsPage.clearButton(OPENROUTER_LABEL).click()

    // Should show "Nicht gesetzt" with add button
    await expect(settingsPage.addButton(OPENROUTER_LABEL)).toBeVisible()
    const secrets = await api.getSecrets()
    expect(secrets.openrouterApiKey).toBeUndefined()
  })

  test("full token never appears in DOM", async ({
    api,
    settingsPage,
    page,
  }) => {
    const fullToken = "sk-or-secret-e2e-token-abcdef123456"
    await api.saveSecrets({ openrouterApiKey: fullToken })
    await settingsPage.goto()

    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    const html = await page.content()
    expect(html).not.toContain(fullToken)
  })

  test("saved token persists on reload", async ({ api, settingsPage }) => {
    await api.saveSecrets({})
    await settingsPage.goto()

    // Add a new token
    await settingsPage.addButton(OPENROUTER_LABEL).click()
    await settingsPage.tokenInput(OPENROUTER_LABEL).fill("sk-or-persist-check")
    await settingsPage.saveFieldButton(OPENROUTER_LABEL).click()
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()

    // Reload and verify it's still set
    await settingsPage.goto()
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
    const secrets = await api.getSecrets()
    expect(secrets.openrouterApiKey).toBe("sk-or-persist-check")
  })

  test("can navigate to settings from homepage", async ({
    applicantListPage,
    page,
  }) => {
    await applicantListPage.goto()
    await page.getByRole("link", { name: "Einstellungen" }).click()
    await expect(
      page.getByRole("heading", { name: "Einstellungen" }),
    ).toBeVisible()
  })

  test("sidebar navigation between KI and Karten", async ({
    api,
    settingsPage,
  }) => {
    await api.saveSecrets({
      openrouterApiKey: "sk-or-tab-test-value",
      googleMapsApiKey: "maps-tab-test-value",
    })
    await settingsPage.goto()

    // KI page is default
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()

    // Navigate to Karten
    await settingsPage.navLink("Karten").click()
    await expect(settingsPage.replaceButton(MAPS_LABEL)).toBeVisible()

    // Navigate back to KI
    await settingsPage.navLink("Künstliche Intelligenz").click()
    await expect(settingsPage.replaceButton(OPENROUTER_LABEL)).toBeVisible()
  })

  // --- Provider switching tests ---

  test("default provider is OpenRouter", async ({ settingsPage }) => {
    await settingsPage.goto()
    await expect(settingsPage.page.getByText(OPENROUTER_LABEL)).toBeVisible()
  })

  test("switching to Requesty shows Requesty API key field", async ({
    settingsPage,
  }) => {
    await settingsPage.goto()

    await settingsPage.selectProvider("Requesty")

    await expect(settingsPage.page.getByText(REQUESTY_LABEL)).toBeVisible()
    // OpenRouter key field should not be visible
    await expect(
      settingsPage.page.getByText(OPENROUTER_LABEL),
    ).not.toBeVisible()
  })

  test("provider selection persists on reload", async ({
    api,
    settingsPage,
  }) => {
    await api.saveSecrets({})
    await settingsPage.goto()

    // Switch to Requesty
    await settingsPage.selectProvider("Requesty")
    await expect(settingsPage.page.getByText(REQUESTY_LABEL)).toBeVisible()

    // Reload
    await settingsPage.goto()
    await expect(settingsPage.page.getByText(REQUESTY_LABEL)).toBeVisible()
  })

  // --- Test button tests ---

  test("Testen button is visible when key is set, not visible when not set", async ({
    api,
    settingsPage,
  }) => {
    await api.saveSecrets({ openrouterApiKey: "sk-or-test-button-check" })
    await settingsPage.goto()

    await expect(settingsPage.testButton(OPENROUTER_LABEL)).toBeVisible()

    // Clear the key
    await settingsPage.clearButton(OPENROUTER_LABEL).click()
    await expect(settingsPage.testButton(OPENROUTER_LABEL)).not.toBeVisible()
  })

  test("clicking Testen with a fake key shows error result", async ({
    api,
    settingsPage,
  }) => {
    await api.saveSecrets({ openrouterApiKey: "sk-or-invalid-fake-key" })
    await settingsPage.goto()

    await settingsPage.testButton(OPENROUTER_LABEL).click()

    // Wait for the test result to appear (error since key is invalid)
    await expect(settingsPage.testResult()).toBeVisible({ timeout: 15000 })
  })
})
