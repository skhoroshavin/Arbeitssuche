import { expect, type Locator, type Page } from "@playwright/test"

export class SettingsPage {
  readonly page: Page
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { name: "Einstellungen" })
  }

  async goto() {
    await this.page.goto("/settings")
  }

  navLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true })
  }

  replaceButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} ersetzen` })
  }

  clearButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} löschen` })
  }

  addButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} hinzufügen` })
  }

  tokenInput(label: string): Locator {
    return this.page.getByRole("textbox", { name: label })
  }

  saveFieldButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} speichern` })
  }

  cancelButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} abbrechen` })
  }

  providerButton(name: string): Locator {
    return this.page.getByRole("button", { name, exact: false }).filter({
      has: this.page.locator("div.font-medium"),
    })
  }

  modelSelect(label: string): Locator {
    return this.page.getByRole("combobox").filter({
      has: this.page.locator("..").filter({
        has: this.page.getByText(label, { exact: true }),
      }),
    })
  }

  async selectProvider(name: string) {
    await this.providerButton(name).click()
  }

  testButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} testen` })
  }

  testResult(): Locator {
    return this.page
      .locator("[class*='text-green'], [class*='text-red']")
      .filter({
        hasText: /(Gültig|HTTP|API-Status|Kein Schlüssel)/,
      })
  }

  secretValue(): Locator {
    return this.page
      .locator("span")
      .filter({ hasText: /Nicht gesetzt|••••••••/ })
      .first()
  }

  async assertUnsetSecret(label: string) {
    await expect(this.addButton(label)).toBeVisible()
    await expect(this.secretValue()).toHaveText("Nicht gesetzt")
    await expect(this.replaceButton(label)).toHaveCount(0)
    await expect(this.clearButton(label)).toHaveCount(0)
  }

  async addAndSave(label: string, value: string) {
    await this.addButton(label).click()
    await this.tokenInput(label).fill(value)
    await this.saveFieldButton(label).click()
  }

  async assertSavedSecret(label: string) {
    await expect(this.replaceButton(label)).toBeVisible()
    await expect(this.clearButton(label)).toBeVisible()
    await expect(this.addButton(label)).toHaveCount(0)
    await expect(this.secretValue()).toContainText("••••••••")
  }

  async replaceAndSave(label: string, value: string) {
    await this.replaceButton(label).click()
    await this.tokenInput(label).fill(value)
    await this.saveFieldButton(label).click()
  }

  async expectProviderSelected(name: string): Promise<void> {
    const button = this.providerButton(name)
    await expect(button).toHaveAttribute("aria-pressed", "true")
  }

  async selectModel(label: string, modelName: string): Promise<void> {
    const select = this.modelSelect(label)
    await select.selectOption(modelName)
  }

  async assertModelSelected(label: string, modelName: string): Promise<void> {
    const select = this.modelSelect(label)
    const value = await select.inputValue()
    expect(value).toBe(modelName)
  }

  async testAndAssertResult(): Promise<void> {
    const result = this.testResult()
    await expect(result).toBeVisible({ timeout: 15_000 })
  }
}
